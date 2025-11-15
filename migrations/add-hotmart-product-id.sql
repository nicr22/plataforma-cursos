-- ============================================
-- Añadir campo hotmart_product_id a courses
-- ============================================
-- Este campo almacena el Product ID de Hotmart
-- mientras que course_code sigue siendo tu numeración interna

-- Añadir campo
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS hotmart_product_id INTEGER;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_courses_hotmart_product_id
ON courses(hotmart_product_id);

-- Verificar
SELECT
  id,
  title,
  course_code,
  hotmart_product_id
FROM courses
LIMIT 5;

SELECT 'Campo hotmart_product_id añadido exitosamente ✅' as resultado;
