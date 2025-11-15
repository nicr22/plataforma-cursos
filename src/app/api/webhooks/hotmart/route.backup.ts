import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Crear cliente de Supabase con service role para operaciones administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Interfaz para el payload del webhook
interface WebhookPayload {
  email: string
  name: string
  course_id?: string // UUID del curso
  course_title?: string // Título del curso (alternativa)
  course_code?: number // Código numérico del curso (ej: 1, 2, 3...)
  transaction_id?: string // ID de transacción de Hotmart
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar API Key de seguridad (opcional pero recomendado)
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.WEBHOOK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Obtener datos del webhook
    const payload: WebhookPayload = await request.json()
    console.log('📥 Webhook recibido:', payload)

    // 3. Validar datos requeridos
    if (!payload.email || !payload.name) {
      return NextResponse.json(
        { error: 'Email y nombre son requeridos' },
        { status: 400 }
      )
    }

    if (!payload.course_id && !payload.course_title && !payload.course_code) {
      return NextResponse.json(
        { error: 'Se requiere course_id, course_title o course_code' },
        { status: 400 }
      )
    }

    // 4. Buscar o crear usuario
    const { userId, isNewUser } = await findOrCreateUser(
      payload.email,
      payload.name
    )

    console.log(`👤 Usuario ${isNewUser ? 'creado' : 'encontrado'}:`, userId)

    // 5. Buscar el curso
    let courseId = payload.course_id

    // Prioridad: course_code > course_id > course_title
    if (!courseId && payload.course_code) {
      // Buscar curso por código numérico
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('course_code', payload.course_code)
        .single()

      if (courseError || !course) {
        return NextResponse.json(
          { error: `Curso no encontrado con código: ${payload.course_code}` },
          { status: 404 }
        )
      }

      courseId = course.id
      console.log(`📚 Curso encontrado por código #${payload.course_code}:`, courseId)
    } else if (!courseId && payload.course_title) {
      // Buscar curso por título
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .ilike('title', payload.course_title)
        .single()

      if (courseError || !course) {
        return NextResponse.json(
          { error: `Curso no encontrado: ${payload.course_title}` },
          { status: 404 }
        )
      }

      courseId = course.id
      console.log('📚 Curso encontrado por título:', courseId)
    }

    console.log('📚 Curso a asignar:', courseId)

    // 6. Verificar si el usuario ya tiene el curso
    const { data: existingEnrollment } = await supabaseAdmin
      .from('user_courses')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()

    if (existingEnrollment) {
      console.log('ℹ️ Usuario ya tiene acceso al curso')
      return NextResponse.json({
        success: true,
        message: 'Usuario ya tiene acceso al curso',
        user_id: userId,
        course_id: courseId,
        already_enrolled: true
      })
    }

    // 7. Asignar curso al usuario
    const { error: enrollError } = await supabaseAdmin
      .from('user_courses')
      .insert({
        user_id: userId,
        course_id: courseId,
        hotmart_transaction_id: payload.transaction_id || null
      })

    if (enrollError) {
      console.error('❌ Error al asignar curso:', enrollError)
      return NextResponse.json(
        { error: 'Error al asignar curso al usuario' },
        { status: 500 }
      )
    }

    console.log('✅ Curso asignado exitosamente')

    // 8. Enviar email de bienvenida (opcional - puedes implementarlo después)
    // await sendWelcomeEmail(payload.email, payload.name, courseId)

    return NextResponse.json({
      success: true,
      message: 'Curso asignado exitosamente',
      user_id: userId,
      course_id: courseId,
      is_new_user: isNewUser
    })

  } catch (error: any) {
    console.error('💥 Error en webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Busca un usuario por email, si no existe lo crea
 */
async function findOrCreateUser(email: string, name: string) {
  // 1. Buscar usuario existente en auth.users
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    throw new Error(`Error buscando usuarios: ${listError.message}`)
  }

  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    // Usuario existe
    return {
      userId: existingUser.id,
      isNewUser: false
    }
  }

  // 2. Crear nuevo usuario
  const temporaryPassword = generateRandomPassword()

  const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: temporaryPassword,
    email_confirm: true, // Confirmar email automáticamente
    user_metadata: {
      full_name: name
    }
  })

  if (signUpError || !newUser.user) {
    throw new Error(`Error creando usuario: ${signUpError?.message}`)
  }

  // 3. Crear perfil del usuario
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: newUser.user.id,
      email: email,
      full_name: name,
      role: 'student'
    })

  if (profileError) {
    console.error('⚠️ Error creando perfil:', profileError)
    // No lanzamos error, el usuario ya fue creado
  }

  // 4. Enviar email para que establezca su contraseña (opcional)
  // await sendPasswordSetupEmail(email, name)

  return {
    userId: newUser.user.id,
    isNewUser: true
  }
}

/**
 * Genera una contraseña temporal aleatoria
 */
function generateRandomPassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

// Método GET para verificar que el endpoint funciona
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Hotmart webhook endpoint is ready',
    timestamp: new Date().toISOString()
  })
}
