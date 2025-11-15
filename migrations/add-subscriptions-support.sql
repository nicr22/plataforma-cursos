-- ============================================
-- MIGRACION: Soporte para Suscripciones
-- ============================================
-- Este script añade soporte para cursos con suscripciones (mensual, anual, etc.)
-- además de los cursos de pago único existentes

-- Paso 1: Añadir campos de suscripción a la tabla courses
-- --------------------------------------------------------
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'one_time' CHECK (payment_type IN ('one_time', 'subscription'));

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS subscription_interval TEXT CHECK (subscription_interval IN ('monthly', 'quarterly', 'semiannual', 'annual'));

-- Comentarios para documentación
COMMENT ON COLUMN courses.payment_type IS 'Tipo de pago: one_time (pago único) o subscription (suscripción recurrente)';
COMMENT ON COLUMN courses.subscription_interval IS 'Intervalo de suscripción: monthly, quarterly, semiannual, annual. Solo aplica si payment_type = subscription';


-- Paso 2: Añadir campos de suscripción a la tabla user_courses
-- -------------------------------------------------------------
ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'one_time' CHECK (subscription_type IN ('one_time', 'monthly', 'quarterly', 'semiannual', 'annual'));

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'expired', 'suspended', 'past_due'));

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS hotmart_subscription_id TEXT;

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE user_courses
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Comentarios para documentación
COMMENT ON COLUMN user_courses.subscription_type IS 'Tipo de suscripción del usuario para este curso';
COMMENT ON COLUMN user_courses.subscription_status IS 'Estado de la suscripción: active, canceled, expired, suspended, past_due';
COMMENT ON COLUMN user_courses.subscription_expires_at IS 'Fecha de expiración de la suscripción (NULL para one_time = acceso permanente)';
COMMENT ON COLUMN user_courses.hotmart_subscription_id IS 'ID de la suscripción en Hotmart';
COMMENT ON COLUMN user_courses.last_payment_date IS 'Fecha del último pago recibido';
COMMENT ON COLUMN user_courses.next_billing_date IS 'Fecha del próximo cobro programado';
COMMENT ON COLUMN user_courses.canceled_at IS 'Fecha en que se canceló la suscripción';


-- Paso 3: Crear índices para mejorar el rendimiento
-- --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_courses_subscription_status
ON user_courses(subscription_status);

CREATE INDEX IF NOT EXISTS idx_user_courses_expires_at
ON user_courses(subscription_expires_at);

CREATE INDEX IF NOT EXISTS idx_user_courses_hotmart_subscription_id
ON user_courses(hotmart_subscription_id);

CREATE INDEX IF NOT EXISTS idx_courses_payment_type
ON courses(payment_type);


-- Paso 4: Crear tabla de historial de pagos/eventos de suscripción
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_course_id UUID NOT NULL REFERENCES user_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_renewed',
    'subscription_canceled',
    'subscription_expired',
    'subscription_suspended',
    'payment_approved',
    'payment_failed',
    'payment_refunded',
    'payment_chargeback'
  )),
  hotmart_event_data JSONB, -- Datos completos del webhook de Hotmart
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  hotmart_transaction_id TEXT,
  hotmart_subscription_id TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla de eventos
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_course_id
ON subscription_events(user_course_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type
ON subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at
ON subscription_events(created_at DESC);

-- Comentarios
COMMENT ON TABLE subscription_events IS 'Historial de eventos y pagos de suscripciones';
COMMENT ON COLUMN subscription_events.event_type IS 'Tipo de evento de suscripción o pago';
COMMENT ON COLUMN subscription_events.hotmart_event_data IS 'JSON completo del webhook recibido de Hotmart';


-- Paso 5: Habilitar RLS en la nueva tabla
-- ----------------------------------------
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios eventos
CREATE POLICY "Users can view their own subscription events"
ON subscription_events
FOR SELECT
USING (auth.uid() = user_id);

-- Política: Solo admins pueden insertar eventos (esto lo hace el webhook)
CREATE POLICY "Service role can insert subscription events"
ON subscription_events
FOR INSERT
WITH CHECK (true); -- El webhook usa service_role_key


-- Paso 6: Crear función para verificar acceso a curso
-- ----------------------------------------------------
CREATE OR REPLACE FUNCTION check_user_course_access(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE(
  has_access BOOLEAN,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      -- Acceso de pago único (permanente)
      WHEN uc.subscription_type = 'one_time' THEN true
      -- Suscripción activa y no expirada
      WHEN uc.subscription_status = 'active' AND
           (uc.subscription_expires_at IS NULL OR uc.subscription_expires_at > NOW())
      THEN true
      -- Cualquier otro caso = sin acceso
      ELSE false
    END as has_access,
    uc.subscription_status as status,
    uc.subscription_expires_at as expires_at,
    CASE
      WHEN uc.subscription_expires_at IS NOT NULL AND uc.subscription_expires_at <= NOW()
      THEN true
      ELSE false
    END as is_expired
  FROM user_courses uc
  WHERE uc.user_id = p_user_id
    AND uc.course_id = p_course_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_user_course_access IS 'Verifica si un usuario tiene acceso válido a un curso';


-- Paso 7: Crear función para actualizar estado de suscripciones expiradas
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Actualizar suscripciones que ya expiraron pero aún están marcadas como activas
  UPDATE user_courses
  SET subscription_status = 'expired'
  WHERE subscription_status = 'active'
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at <= NOW()
    AND subscription_type != 'one_time';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_expired_subscriptions IS 'Actualiza automáticamente las suscripciones que ya expiraron';


-- Paso 8: Verificar que todo se creó correctamente
-- -------------------------------------------------
SELECT
  'Columnas añadidas a courses' as verificacion,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('payment_type', 'subscription_interval');

SELECT
  'Columnas añadidas a user_courses' as verificacion,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'user_courses'
  AND column_name IN ('subscription_type', 'subscription_status', 'subscription_expires_at', 'hotmart_subscription_id');

SELECT
  'Tabla subscription_events creada' as verificacion,
  COUNT(*) as total_eventos
FROM subscription_events;

SELECT
  'Función check_user_course_access creada' as verificacion,
  proname as nombre_funcion
FROM pg_proc
WHERE proname = 'check_user_course_access';


-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
--
-- 1. Ejecutar este script completo en Supabase SQL Editor
-- 2. Actualizar el webhook para manejar eventos de suscripción
-- 3. Al crear un curso, especificar:
--    - payment_type: 'one_time' o 'subscription'
--    - subscription_interval: 'monthly', 'quarterly', 'semiannual', 'annual' (si es subscription)
-- 4. El webhook debe actualizar user_courses con los datos de suscripción
-- 5. Usar check_user_course_access() para verificar acceso antes de mostrar contenido
--
-- ============================================
