import { createClient } from '@supabase/supabase-js'

/**
 * Utilidades para verificar acceso a cursos con soporte para suscripciones
 */

// Cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface CourseAccessResult {
  hasAccess: boolean
  status: 'active' | 'canceled' | 'expired' | 'suspended' | 'past_due' | 'none'
  expiresAt: string | null
  isExpired: boolean
  subscriptionType: 'one_time' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  nextBillingDate: string | null
  message: string
}

/**
 * Verifica si un usuario tiene acceso válido a un curso
 */
export async function checkCourseAccess(
  userId: string,
  courseId: string
): Promise<CourseAccessResult> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Consultar inscripción del usuario al curso
    const { data: enrollment, error } = await supabase
      .from('user_courses')
      .select(`
        subscription_type,
        subscription_status,
        subscription_expires_at,
        next_billing_date
      `)
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()

    // Si no hay inscripción, no tiene acceso
    if (error || !enrollment) {
      return {
        hasAccess: false,
        status: 'none',
        expiresAt: null,
        isExpired: false,
        subscriptionType: 'one_time',
        nextBillingDate: null,
        message: 'No tienes acceso a este curso. Por favor, realiza la compra.'
      }
    }

    // Caso 1: Pago único (acceso permanente)
    if (enrollment.subscription_type === 'one_time') {
      return {
        hasAccess: true,
        status: 'active',
        expiresAt: null,
        isExpired: false,
        subscriptionType: 'one_time',
        nextBillingDate: null,
        message: 'Tienes acceso completo a este curso.'
      }
    }

    // Caso 2: Suscripción - verificar estado y fecha de expiración
    const now = new Date()
    const expiresAt = enrollment.subscription_expires_at
      ? new Date(enrollment.subscription_expires_at)
      : null

    const isExpired = expiresAt ? expiresAt <= now : false

    // Determinar acceso según estado de suscripción
    const hasAccess =
      enrollment.subscription_status === 'active' && !isExpired

    // Mensajes según el estado
    let message = ''
    if (hasAccess) {
      if (expiresAt) {
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        message = `Tu suscripción está activa. Expira en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`
      } else {
        message = 'Tu suscripción está activa.'
      }
    } else if (enrollment.subscription_status === 'canceled') {
      if (isExpired) {
        message = 'Tu suscripción ha sido cancelada y ha expirado. Renueva para continuar.'
      } else {
        message = 'Tu suscripción está cancelada pero aún tienes acceso hasta la fecha de expiración.'
      }
    } else if (enrollment.subscription_status === 'expired' || isExpired) {
      message = 'Tu suscripción ha expirado. Renueva para continuar accediendo al contenido.'
    } else if (enrollment.subscription_status === 'suspended') {
      message = 'Tu suscripción está suspendida. Por favor, verifica tu método de pago.'
    } else if (enrollment.subscription_status === 'past_due') {
      message = 'Tu suscripción tiene un pago pendiente. Por favor, actualiza tu método de pago.'
    }

    return {
      hasAccess,
      status: enrollment.subscription_status,
      expiresAt: enrollment.subscription_expires_at,
      isExpired,
      subscriptionType: enrollment.subscription_type,
      nextBillingDate: enrollment.next_billing_date,
      message
    }

  } catch (error) {
    console.error('Error verificando acceso al curso:', error)
    throw error
  }
}

/**
 * Verifica acceso y redirige si no tiene permiso (para usar en Server Components)
 */
export async function requireCourseAccess(
  userId: string,
  courseId: string
): Promise<CourseAccessResult> {
  const access = await checkCourseAccess(userId, courseId)

  if (!access.hasAccess) {
    throw new Error(access.message)
  }

  return access
}

/**
 * Obtiene todos los cursos con acceso activo del usuario
 */
export async function getUserActiveCourses(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('user_courses')
    .select(`
      *,
      courses (
        id,
        title,
        description,
        thumbnail_url,
        payment_type
      )
    `)
    .eq('user_id', userId)
    .or(`subscription_status.eq.active,subscription_type.eq.one_time`)

  if (error) {
    console.error('Error obteniendo cursos del usuario:', error)
    return []
  }

  // Filtrar cursos con suscripción expirada
  const now = new Date()
  const activeCourses = data.filter(enrollment => {
    // Pago único siempre es válido
    if (enrollment.subscription_type === 'one_time') {
      return true
    }

    // Suscripción debe estar activa y no expirada
    if (enrollment.subscription_status !== 'active') {
      return false
    }

    if (enrollment.subscription_expires_at) {
      const expiresAt = new Date(enrollment.subscription_expires_at)
      return expiresAt > now
    }

    return true
  })

  return activeCourses
}

/**
 * Obtiene el historial de eventos de suscripción de un usuario para un curso
 */
export async function getSubscriptionHistory(
  userId: string,
  courseId: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('subscription_events')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error obteniendo historial de suscripción:', error)
    return []
  }

  return data
}

/**
 * Formatea el tipo de suscripción para mostrarlo al usuario
 */
export function formatSubscriptionType(type: string): string {
  const translations: Record<string, string> = {
    'one_time': 'Pago Único',
    'monthly': 'Mensual',
    'quarterly': 'Trimestral',
    'semiannual': 'Semestral',
    'annual': 'Anual'
  }

  return translations[type] || type
}

/**
 * Formatea el estado de suscripción para mostrarlo al usuario
 */
export function formatSubscriptionStatus(status: string): string {
  const translations: Record<string, string> = {
    'active': 'Activa',
    'canceled': 'Cancelada',
    'expired': 'Expirada',
    'suspended': 'Suspendida',
    'past_due': 'Pago Pendiente',
    'none': 'Sin Acceso'
  }

  return translations[status] || status
}

/**
 * Calcula los días restantes hasta la expiración
 */
export function getDaysUntilExpiration(expiresAt: string | null): number | null {
  if (!expiresAt) return null

  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  return days > 0 ? days : 0
}
