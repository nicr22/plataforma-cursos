-- ============================================
-- QUERIES DE DIAGNÓSTICO PARA SUPABASE
-- ============================================

-- 1. VERIFICAR USUARIOS AUTENTICADOS
-- Muestra todos los usuarios en auth.users
SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. VERIFICAR PERFILES DE USUARIOS
-- Muestra todos los perfiles en la tabla profiles
SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- 3. VERIFICAR CURSOS DISPONIBLES
-- Muestra todos los cursos
SELECT
  id,
  title,
  description,
  is_active,
  created_at
FROM courses
ORDER BY created_at DESC;

-- 4. VERIFICAR ACCESO DE USUARIOS A CURSOS
-- Muestra qué usuarios tienen acceso a qué cursos
SELECT
  uc.id,
  uc.user_id,
  p.email as user_email,
  uc.course_id,
  c.title as course_title,
  uc.created_at
FROM user_courses uc
LEFT JOIN profiles p ON uc.user_id = p.id
LEFT JOIN courses c ON uc.course_id = c.id
ORDER BY uc.created_at DESC
LIMIT 20;

-- 5. VERIFICAR MÓDULOS Y LECCIONES
-- Muestra la estructura de cursos → módulos → lecciones
SELECT
  c.id as course_id,
  c.title as course_title,
  m.id as module_id,
  m.title as module_title,
  m.order_index as module_order,
  l.id as lesson_id,
  l.title as lesson_title,
  l.order_index as lesson_order,
  l.video_url
FROM courses c
LEFT JOIN modules m ON m.course_id = c.id
LEFT JOIN lessons l ON l.module_id = m.id
ORDER BY c.id, m.order_index, l.order_index;

-- 6. VERIFICAR PROGRESO DE USUARIO ESPECÍFICO
-- Reemplaza 'TU_USER_ID' con el ID del usuario
SELECT
  lp.lesson_id,
  l.title as lesson_title,
  c.title as course_title,
  lp.watch_time,
  lp.completed,
  lp.completed_at,
  lp.updated_at
FROM lesson_progress lp
LEFT JOIN lessons l ON lp.lesson_id = l.id
LEFT JOIN modules m ON l.module_id = m.id
LEFT JOIN courses c ON m.course_id = c.id
WHERE lp.user_id = 'TU_USER_ID'
ORDER BY lp.updated_at DESC;

-- 7. BUSCAR USUARIOS SIN PERFIL (PROBLEMA COMÚN)
-- Usuarios en auth.users que NO tienen perfil en profiles
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.id IS NULL THEN 'SIN PERFIL' ELSE 'CON PERFIL' END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 8. VERIFICAR RLS (Row Level Security) POLÍTICAS
-- Muestra las políticas de seguridad activas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. CONTAR REGISTROS EN CADA TABLA
-- Útil para verificar si hay datos
SELECT
  'profiles' as tabla, COUNT(*) as total FROM profiles
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'modules', COUNT(*) FROM modules
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'user_courses', COUNT(*) FROM user_courses
UNION ALL
SELECT 'lesson_progress', COUNT(*) FROM lesson_progress;

-- 10. VERIFICAR INTEGRIDAD DE DATOS
-- Busca problemas comunes en las relaciones
SELECT 'Módulos sin curso' as problema, COUNT(*) as cantidad
FROM modules m
LEFT JOIN courses c ON m.course_id = c.id
WHERE c.id IS NULL
UNION ALL
SELECT 'Lecciones sin módulo', COUNT(*)
FROM lessons l
LEFT JOIN modules m ON l.module_id = m.id
WHERE m.id IS NULL
UNION ALL
SELECT 'user_courses sin usuario', COUNT(*)
FROM user_courses uc
LEFT JOIN profiles p ON uc.user_id = p.id
WHERE p.id IS NULL
UNION ALL
SELECT 'user_courses sin curso', COUNT(*)
FROM user_courses uc
LEFT JOIN courses c ON uc.course_id = c.id
WHERE c.id IS NULL;

-- ============================================
-- QUERIES PARA OBTENER TU USER_ID
-- ============================================

-- Obtener tu user_id por email
-- Reemplaza 'tu_email@example.com' con tu email
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'tu_email@example.com';

-- O ver todos los usuarios para encontrar el tuyo
SELECT
  id as user_id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY last_sign_in_at DESC;

-- ============================================
-- QUERY ESPECÍFICO PARA DEBUG DE CHROME
-- ============================================

-- Verificar si hay algún problema con las sesiones activas
SELECT
  user_id,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_valid
FROM auth.sessions
WHERE expires_at > NOW()
ORDER BY created_at DESC
LIMIT 10;
