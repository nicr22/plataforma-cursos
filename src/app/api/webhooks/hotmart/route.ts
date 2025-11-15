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

// ============================================
// TIPOS DE EVENTOS DE HOTMART
// ============================================
type HotmartEventType =
  | 'PURCHASE_COMPLETE'           // Compra completada (pago único o primera cuota de suscripción)
  | 'PURCHASE_APPROVED'           // Pago aprobado
  | 'PURCHASE_REFUNDED'           // Reembolso
  | 'PURCHASE_CHARGEBACK'         // Contracargo
  | 'SUBSCRIPTION_CREATED'        // Suscripción creada
  | 'SUBSCRIPTION_CANCELLATION'   // Suscripción cancelada
  | 'SUBSCRIPTION_REACTIVATED'    // Suscripción reactivada
  | 'SUBSCRIPTION_CHANGE_PLAN'    // Cambio de plan de suscripción

// Interfaz para el payload del webhook de Hotmart
interface HotmartWebhookPayload {
  event: HotmartEventType
  data: {
    product: {
      id: number
      name: string
    }
    buyer: {
      email: string
      name: string
    }
    purchase: {
      transaction: string // ID de transacción
      status: string      // APPROVED, REFUNDED, etc.
      price: {
        value: number
        currency_code: string
      }
      payment: {
        type: string      // CREDIT_CARD, BOLETO, etc.
      }
    }
    subscription?: {
      subscriber: {
        code: string      // ID de suscripción en Hotmart
      }
      status: string       // ACTIVE, CANCELLED, EXPIRED, etc.
      plan: {
        name: string
        id: number
      }
      date_next_charge?: string  // Fecha del próximo cobro
      recurrency_period?: number // Periodo de recurrencia (en días)
    }
  }
}

// Payload simplificado para compatibilidad con webhook anterior
interface SimpleWebhookPayload {
  email: string
  name: string
  course_id?: string
  course_code?: number
  transaction_id?: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar API Key de seguridad
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.WEBHOOK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Obtener datos del webhook
    const payload = await request.json()
    console.log('📥 Webhook recibido:', JSON.stringify(payload, null, 2))

    // Detectar si es webhook de Hotmart o formato simple
    if ('event' in payload && 'data' in payload) {
      // Webhook de Hotmart
      return await handleHotmartWebhook(payload as HotmartWebhookPayload)
    } else {
      // Formato simple (compatibilidad hacia atrás)
      return await handleSimpleWebhook(payload as SimpleWebhookPayload)
    }

  } catch (error: any) {
    console.error('💥 Error en webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Maneja webhooks de Hotmart con soporte para suscripciones
 */
async function handleHotmartWebhook(payload: HotmartWebhookPayload) {
  const { event, data } = payload

  console.log(`📋 Evento: ${event}`)

  // Obtener Product ID de Hotmart
  const hotmartProductId = data.product.id
  const email = data.buyer.email
  const name = data.buyer.name
  const transactionId = data.purchase.transaction
  const subscriptionId = data.subscription?.subscriber.code

  // Buscar el curso por hotmart_product_id
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id, payment_type, subscription_interval')
    .eq('hotmart_product_id', hotmartProductId)
    .single()

  if (courseError || !course) {
    return NextResponse.json(
      { error: `Curso no encontrado con Product ID de Hotmart: ${hotmartProductId}` },
      { status: 404 }
    )
  }

  // Buscar o crear usuario
  const { userId, isNewUser } = await findOrCreateUser(email, name)

  // Manejar evento según tipo
  switch (event) {
    case 'PURCHASE_COMPLETE':
    case 'PURCHASE_APPROVED':
      return await handlePurchaseApproved(userId, course, transactionId, subscriptionId, data, isNewUser)

    case 'SUBSCRIPTION_CREATED':
      return await handleSubscriptionCreated(userId, course, subscriptionId, data, isNewUser)

    case 'SUBSCRIPTION_CANCELLATION':
      return await handleSubscriptionCancellation(userId, course.id, subscriptionId, data)

    case 'SUBSCRIPTION_REACTIVATED':
      return await handleSubscriptionReactivated(userId, course.id, subscriptionId, data)

    case 'PURCHASE_REFUNDED':
      return await handlePurchaseRefunded(userId, course.id, transactionId, data)

    case 'PURCHASE_CHARGEBACK':
      return await handlePurchaseChargeback(userId, course.id, transactionId, data)

    default:
      console.log(`⚠️ Evento no manejado: ${event}`)
      return NextResponse.json({
        success: true,
        message: `Evento ${event} registrado pero no procesado`
      })
  }
}

/**
 * Maneja compra aprobada (pago único o primera suscripción)
 */
async function handlePurchaseApproved(
  userId: string,
  course: any,
  transactionId: string,
  subscriptionId: string | undefined,
  data: HotmartWebhookPayload['data'],
  isNewUser: boolean
) {
  const courseId = course.id
  const isSubscription = course.payment_type === 'subscription'

  // Verificar si el usuario ya tiene el curso
  const { data: existingEnrollment } = await supabaseAdmin
    .from('user_courses')
    .select('id, subscription_status')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  // Calcular fecha de expiración para suscripciones
  let expiresAt = null
  let nextBillingDate = null
  let subscriptionType = 'one_time'

  if (isSubscription) {
    subscriptionType = course.subscription_interval || 'monthly'
    const now = new Date()

    // Calcular próximo cobro según el intervalo
    switch (subscriptionType) {
      case 'monthly':
        expiresAt = new Date(now.setMonth(now.getMonth() + 1))
        nextBillingDate = new Date(expiresAt)
        break
      case 'quarterly':
        expiresAt = new Date(now.setMonth(now.getMonth() + 3))
        nextBillingDate = new Date(expiresAt)
        break
      case 'semiannual':
        expiresAt = new Date(now.setMonth(now.getMonth() + 6))
        nextBillingDate = new Date(expiresAt)
        break
      case 'annual':
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1))
        nextBillingDate = new Date(expiresAt)
        break
    }

    // Si Hotmart provee la fecha del próximo cobro, usarla
    if (data.subscription?.date_next_charge) {
      nextBillingDate = new Date(data.subscription.date_next_charge)
      expiresAt = new Date(nextBillingDate)
    }
  }

  if (existingEnrollment) {
    // Actualizar suscripción existente
    const { error: updateError } = await supabaseAdmin
      .from('user_courses')
      .update({
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
        next_billing_date: nextBillingDate,
        last_payment_date: new Date(),
        hotmart_subscription_id: subscriptionId || existingEnrollment.id
      })
      .eq('id', existingEnrollment.id)

    if (updateError) {
      throw new Error(`Error actualizando suscripción: ${updateError.message}`)
    }

    // Registrar evento
    await recordSubscriptionEvent(
      existingEnrollment.id,
      userId,
      courseId,
      isSubscription ? 'subscription_renewed' : 'payment_approved',
      data,
      transactionId,
      subscriptionId
    )

    return NextResponse.json({
      success: true,
      message: 'Suscripción renovada exitosamente',
      user_id: userId,
      course_id: courseId
    })
  }

  // Crear nueva inscripción
  const { data: newEnrollment, error: enrollError } = await supabaseAdmin
    .from('user_courses')
    .insert({
      user_id: userId,
      course_id: courseId,
      subscription_type: subscriptionType,
      subscription_status: 'active',
      subscription_expires_at: expiresAt,
      next_billing_date: nextBillingDate,
      last_payment_date: new Date(),
      hotmart_transaction_id: transactionId,
      hotmart_subscription_id: subscriptionId || null
    })
    .select('id')
    .single()

  if (enrollError) {
    throw new Error(`Error creando inscripción: ${enrollError.message}`)
  }

  // Registrar evento
  await recordSubscriptionEvent(
    newEnrollment.id,
    userId,
    courseId,
    isSubscription ? 'subscription_created' : 'payment_approved',
    data,
    transactionId,
    subscriptionId
  )

  return NextResponse.json({
    success: true,
    message: isSubscription ? 'Suscripción creada exitosamente' : 'Curso asignado exitosamente',
    user_id: userId,
    course_id: courseId,
    is_new_user: isNewUser,
    subscription_type: subscriptionType,
    expires_at: expiresAt
  })
}

/**
 * Maneja creación de suscripción
 */
async function handleSubscriptionCreated(
  userId: string,
  course: any,
  subscriptionId: string | undefined,
  data: HotmartWebhookPayload['data'],
  isNewUser: boolean
) {
  // Similar a handlePurchaseApproved pero específico para suscripciones
  return await handlePurchaseApproved(userId, course, data.purchase.transaction, subscriptionId, data, isNewUser)
}

/**
 * Maneja cancelación de suscripción
 */
async function handleSubscriptionCancellation(
  userId: string,
  courseId: string,
  subscriptionId: string | undefined,
  data: HotmartWebhookPayload['data']
) {
  const { data: enrollment, error: findError } = await supabaseAdmin
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  if (findError || !enrollment) {
    return NextResponse.json(
      { error: 'Inscripción no encontrada' },
      { status: 404 }
    )
  }

  // Actualizar estado a cancelado (pero mantener acceso hasta la fecha de expiración)
  const { error: updateError } = await supabaseAdmin
    .from('user_courses')
    .update({
      subscription_status: 'canceled',
      canceled_at: new Date()
    })
    .eq('id', enrollment.id)

  if (updateError) {
    throw new Error(`Error cancelando suscripción: ${updateError.message}`)
  }

  // Registrar evento
  await recordSubscriptionEvent(
    enrollment.id,
    userId,
    courseId,
    'subscription_canceled',
    data,
    null,
    subscriptionId
  )

  return NextResponse.json({
    success: true,
    message: 'Suscripción cancelada. El acceso permanecerá hasta la fecha de expiración.',
    user_id: userId,
    course_id: courseId
  })
}

/**
 * Maneja reactivación de suscripción
 */
async function handleSubscriptionReactivated(
  userId: string,
  courseId: string,
  subscriptionId: string | undefined,
  data: HotmartWebhookPayload['data']
) {
  const { data: enrollment, error: findError } = await supabaseAdmin
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  if (findError || !enrollment) {
    return NextResponse.json(
      { error: 'Inscripción no encontrada' },
      { status: 404 }
    )
  }

  // Reactivar suscripción
  const { error: updateError } = await supabaseAdmin
    .from('user_courses')
    .update({
      subscription_status: 'active',
      canceled_at: null
    })
    .eq('id', enrollment.id)

  if (updateError) {
    throw new Error(`Error reactivando suscripción: ${updateError.message}`)
  }

  // Registrar evento
  await recordSubscriptionEvent(
    enrollment.id,
    userId,
    courseId,
    'subscription_renewed',
    data,
    null,
    subscriptionId
  )

  return NextResponse.json({
    success: true,
    message: 'Suscripción reactivada exitosamente',
    user_id: userId,
    course_id: courseId
  })
}

/**
 * Maneja reembolso
 */
async function handlePurchaseRefunded(
  userId: string,
  courseId: string,
  transactionId: string,
  data: HotmartWebhookPayload['data']
) {
  const { data: enrollment, error: findError } = await supabaseAdmin
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single()

  if (findError || !enrollment) {
    return NextResponse.json(
      { error: 'Inscripción no encontrada' },
      { status: 404 }
    )
  }

  // Marcar suscripción como cancelada y expirada inmediatamente
  const { error: updateError } = await supabaseAdmin
    .from('user_courses')
    .update({
      subscription_status: 'expired',
      subscription_expires_at: new Date(), // Expira inmediatamente
      canceled_at: new Date()
    })
    .eq('id', enrollment.id)

  if (updateError) {
    throw new Error(`Error procesando reembolso: ${updateError.message}`)
  }

  // Registrar evento
  await recordSubscriptionEvent(
    enrollment.id,
    userId,
    courseId,
    'payment_refunded',
    data,
    transactionId,
    null
  )

  return NextResponse.json({
    success: true,
    message: 'Reembolso procesado. Acceso revocado.',
    user_id: userId,
    course_id: courseId
  })
}

/**
 * Maneja contracargo
 */
async function handlePurchaseChargeback(
  userId: string,
  courseId: string,
  transactionId: string,
  data: HotmartWebhookPayload['data']
) {
  // Similar al reembolso
  return await handlePurchaseRefunded(userId, courseId, transactionId, data)
}

/**
 * Registra un evento de suscripción en el historial
 */
async function recordSubscriptionEvent(
  userCourseId: string,
  userId: string,
  courseId: string,
  eventType: string,
  data: any,
  transactionId: string | null = null,
  subscriptionId: string | undefined = null
) {
  const { error } = await supabaseAdmin
    .from('subscription_events')
    .insert({
      user_course_id: userCourseId,
      user_id: userId,
      course_id: courseId,
      event_type: eventType,
      hotmart_event_data: data,
      amount: data.purchase?.price?.value || null,
      currency: data.purchase?.price?.currency_code || 'USD',
      hotmart_transaction_id: transactionId,
      hotmart_subscription_id: subscriptionId
    })

  if (error) {
    console.error('⚠️ Error registrando evento:', error)
  }
}

/**
 * Maneja webhooks en formato simple (compatibilidad hacia atrás)
 */
async function handleSimpleWebhook(payload: SimpleWebhookPayload) {
  if (!payload.email || !payload.name) {
    return NextResponse.json(
      { error: 'Email y nombre son requeridos' },
      { status: 400 }
    )
  }

  if (!payload.course_id && !payload.course_code) {
    return NextResponse.json(
      { error: 'Se requiere course_id o course_code' },
      { status: 400 }
    )
  }

  // Buscar o crear usuario
  const { userId, isNewUser } = await findOrCreateUser(
    payload.email,
    payload.name
  )

  // Buscar el curso
  let courseId = payload.course_id
  if (!courseId && payload.course_code) {
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
  }

  // Verificar si ya tiene el curso
  const { data: existingEnrollment } = await supabaseAdmin
    .from('user_courses')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId!)
    .single()

  if (existingEnrollment) {
    return NextResponse.json({
      success: true,
      message: 'Usuario ya tiene acceso al curso',
      user_id: userId,
      course_id: courseId,
      already_enrolled: true
    })
  }

  // Asignar curso (pago único por defecto)
  const { error: enrollError } = await supabaseAdmin
    .from('user_courses')
    .insert({
      user_id: userId,
      course_id: courseId,
      subscription_type: 'one_time',
      subscription_status: 'active',
      hotmart_transaction_id: payload.transaction_id || null
    })

  if (enrollError) {
    throw new Error(`Error al asignar curso: ${enrollError.message}`)
  }

  return NextResponse.json({
    success: true,
    message: 'Curso asignado exitosamente',
    user_id: userId,
    course_id: courseId,
    is_new_user: isNewUser
  })
}

/**
 * Busca un usuario por email, si no existe lo crea
 */
async function findOrCreateUser(email: string, name: string) {
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    throw new Error(`Error buscando usuarios: ${listError.message}`)
  }

  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    return {
      userId: existingUser.id,
      isNewUser: false
    }
  }

  const temporaryPassword = generateRandomPassword()

  const { data: newUser, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: name
    }
  })

  if (signUpError || !newUser.user) {
    throw new Error(`Error creando usuario: ${signUpError?.message}`)
  }

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
  }

  return {
    userId: newUser.user.id,
    isNewUser: true
  }
}

function generateRandomPassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Hotmart webhook endpoint with subscriptions support is ready',
    timestamp: new Date().toISOString(),
    supported_events: [
      'PURCHASE_COMPLETE',
      'PURCHASE_APPROVED',
      'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_CANCELLATION',
      'SUBSCRIPTION_REACTIVATED',
      'PURCHASE_REFUNDED',
      'PURCHASE_CHARGEBACK'
    ]
  })
}
