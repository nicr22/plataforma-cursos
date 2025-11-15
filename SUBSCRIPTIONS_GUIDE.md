# 📋 Guía Completa de Suscripciones

Esta guía explica cómo funciona el sistema de suscripciones en tu plataforma de cursos.

## 📚 Índice

1. [Conceptos Básicos](#conceptos-básicos)
2. [Configuración Inicial](#configuración-inicial)
3. [Flujo de Funcionamiento](#flujo-de-funcionamiento)
4. [Uso con Hotmart](#uso-con-hotmart)
5. [Uso con Stripe](#uso-con-stripe)
6. [Verificación de Acceso](#verificación-de-acceso)
7. [Ejemplos de Código](#ejemplos-de-código)

---

## Conceptos Básicos

### Tipos de Pago

Tu plataforma ahora soporta dos tipos de productos:

1. **Pago Único (`one_time`)**: El usuario paga una sola vez y tiene acceso permanente.
2. **Suscripción (`subscription`)**: El usuario paga recurrentemente (mensual, trimestral, semestral o anual).

### Estados de Suscripción

- **`active`**: Suscripción activa, el usuario tiene acceso
- **`canceled`**: Cancelada por el usuario, acceso hasta fecha de expiración
- **`expired`**: Ha pasado la fecha de expiración, sin acceso
- **`suspended`**: Suspendida por falta de pago
- **`past_due`**: Pago pendiente

---

## Configuración Inicial

### 1. Ejecutar Migraciones SQL

Ejecuta el script en Supabase SQL Editor:

```bash
# Archivo: migrations/add-subscriptions-support.sql
```

Este script crea:
- ✅ Campos de suscripción en `courses` y `user_courses`
- ✅ Tabla `subscription_events` para historial
- ✅ Función `check_user_course_access()` para verificar acceso
- ✅ Función `update_expired_subscriptions()` para limpieza automática
- ✅ Índices para optimización
- ✅ Políticas RLS

### 2. Actualizar Webhook

Reemplaza el archivo actual:

```bash
# De: src/app/api/webhooks/hotmart/route.ts
# A:   src/app/api/webhooks/hotmart/route-with-subscriptions.ts
```

O simplemente renombra:
```bash
mv src/app/api/webhooks/hotmart/route-with-subscriptions.ts src/app/api/webhooks/hotmart/route.ts
```

### 3. Variables de Entorno

Asegúrate de tener configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
WEBHOOK_SECRET_KEY=tu_secret_para_webhooks
```

---

## Flujo de Funcionamiento

### Flujo de Pago Único

```
1. Usuario compra curso → Hotmart/Stripe envía webhook "APPROVED"
2. Webhook crea registro en user_courses:
   - subscription_type = 'one_time'
   - subscription_status = 'active'
   - subscription_expires_at = NULL (acceso permanente)
3. Usuario tiene acceso para siempre ✅
```

### Flujo de Suscripción

```
1. Usuario suscribe → Hotmart envía webhook "SUBSCRIPTION_CREATED"
2. Webhook crea registro en user_courses:
   - subscription_type = 'monthly' (o el intervalo configurado)
   - subscription_status = 'active'
   - subscription_expires_at = fecha dentro de 30 días
   - next_billing_date = fecha del próximo cobro

3. Cada mes:
   a) Pago exitoso → Webhook "SUBSCRIPTION_RENEWED"
      - Actualiza subscription_expires_at (+30 días)
      - Actualiza last_payment_date
      - Mantiene status = 'active'

   b) Pago fallido → Webhook "PAYMENT_FAILED"
      - Cambia status a 'past_due' o 'suspended'
      - Usuario pierde acceso

4. Usuario cancela → Webhook "SUBSCRIPTION_CANCELED"
   - Cambia status a 'canceled'
   - Mantiene acceso hasta subscription_expires_at
   - Después de esa fecha → sin acceso

5. Usuario no renueva → Sistema automático
   - Cuando subscription_expires_at < NOW()
   - Status cambia a 'expired'
   - Usuario pierde acceso
```

---

## Uso con Hotmart

### 1. Configurar Producto en Hotmart

1. Ve a tu producto en Hotmart
2. Configura como "Suscripción" si es recurrente
3. Define el intervalo (mensual, trimestral, etc.)
4. Anota el **Product ID** (lo usarás como `course_code`)

### 2. Configurar Curso en tu BD

```sql
-- Ejemplo: Crear curso con suscripción mensual
INSERT INTO courses (
  title,
  description,
  price,
  course_code,
  payment_type,
  subscription_interval
) VALUES (
  'Curso Premium de React',
  'Aprende React desde cero',
  29.99,
  123456,  -- Product ID de Hotmart
  'subscription',
  'monthly'
);
```

### 3. Configurar Webhook en Hotmart

1. Ve a Hotmart → Tu Producto → Configuraciones → Webhooks
2. URL: `https://tudominio.com/api/webhooks/hotmart`
3. Header: `x-api-key: tu_webhook_secret_key`
4. Eventos a activar:
   - ✅ PURCHASE_COMPLETE
   - ✅ PURCHASE_APPROVED
   - ✅ SUBSCRIPTION_CREATED
   - ✅ SUBSCRIPTION_CANCELLATION
   - ✅ SUBSCRIPTION_REACTIVATED
   - ✅ PURCHASE_REFUNDED
   - ✅ PURCHASE_CHARGEBACK

### 4. Payload que Envía Hotmart

```json
{
  "event": "SUBSCRIPTION_CREATED",
  "data": {
    "product": {
      "id": 123456,
      "name": "Curso Premium de React"
    },
    "buyer": {
      "email": "user@example.com",
      "name": "Juan Pérez"
    },
    "purchase": {
      "transaction": "HP12345678",
      "status": "APPROVED",
      "price": {
        "value": 29.99,
        "currency_code": "USD"
      }
    },
    "subscription": {
      "subscriber": {
        "code": "SUB-ABC123"
      },
      "status": "ACTIVE",
      "date_next_charge": "2025-02-08T00:00:00Z"
    }
  }
}
```

---

## Uso con Stripe

### 1. Instalar Stripe

```bash
npm install stripe @stripe/stripe-js
```

### 2. Crear Producto y Precio en Stripe

```javascript
// Backend: crear producto con suscripción
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const product = await stripe.products.create({
  name: 'Curso Premium de React',
  description: 'Acceso mensual al curso'
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2999, // $29.99 en centavos
  currency: 'usd',
  recurring: {
    interval: 'month' // month, year, etc.
  }
});

console.log('Price ID:', price.id); // Guardar este ID
```

### 3. Crear Sesión de Checkout

```javascript
// API Route: /api/checkout/create-session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  mode: 'subscription', // O 'payment' para pago único
  line_items: [{
    price: 'price_1ABC123', // ID del precio creado arriba
    quantity: 1,
  }],
  success_url: 'https://tudominio.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://tudominio.com/cancel',
  metadata: {
    course_id: 'uuid-del-curso',
    user_email: 'user@example.com'
  }
});

// Redirigir al usuario a session.url
```

### 4. Configurar Webhook de Stripe

```javascript
// API Route: /api/webhooks/stripe
import { buffer } from 'micro';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Crear user_course
      break;

    case 'invoice.payment_succeeded':
      // Renovar suscripción
      break;

    case 'customer.subscription.deleted':
      // Cancelar suscripción
      break;
  }

  res.json({ received: true });
}
```

---

## Verificación de Acceso

### En tus Componentes/Páginas

```typescript
import { checkCourseAccess } from '@/lib/courseAccess'

// En Server Component
export default async function CoursePage({ params }) {
  const { user } = await getUser() // Tu función para obtener usuario

  // Verificar acceso
  const access = await checkCourseAccess(user.id, params.courseId)

  if (!access.hasAccess) {
    return (
      <div>
        <h1>Acceso Denegado</h1>
        <p>{access.message}</p>
        {access.status === 'expired' && (
          <button>Renovar Suscripción</button>
        )}
      </div>
    )
  }

  // Usuario tiene acceso, mostrar contenido
  return <CourseContent courseId={params.courseId} />
}
```

### Usar Función SQL Directamente

```javascript
const { data, error } = await supabase
  .rpc('check_user_course_access', {
    p_user_id: userId,
    p_course_id: courseId
  })

console.log(data[0].has_access) // true/false
console.log(data[0].status)     // 'active', 'expired', etc.
```

---

## Ejemplos de Código

### Ejemplo 1: Mostrar Estado de Suscripción

```typescript
import {
  checkCourseAccess,
  formatSubscriptionStatus,
  getDaysUntilExpiration
} from '@/lib/courseAccess'

export default async function SubscriptionStatus({ userId, courseId }) {
  const access = await checkCourseAccess(userId, courseId)
  const daysLeft = getDaysUntilExpiration(access.expiresAt)

  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <h3>Estado de Suscripción</h3>
      <p>Estado: {formatSubscriptionStatus(access.status)}</p>

      {access.hasAccess && access.expiresAt && (
        <p>Expira en: {daysLeft} días</p>
      )}

      {access.nextBillingDate && (
        <p>Próximo cobro: {new Date(access.nextBillingDate).toLocaleDateString()}</p>
      )}

      {!access.hasAccess && (
        <button className="bg-red-600 px-4 py-2 rounded">
          Renovar Ahora
        </button>
      )}
    </div>
  )
}
```

### Ejemplo 2: Listar Cursos Activos del Usuario

```typescript
import { getUserActiveCourses } from '@/lib/courseAccess'

export default async function MyCourses({ userId }) {
  const courses = await getUserActiveCourses(userId)

  return (
    <div>
      <h2>Mis Cursos Activos</h2>
      {courses.map(enrollment => (
        <div key={enrollment.id}>
          <h3>{enrollment.courses.title}</h3>
          <span>Tipo: {enrollment.subscription_type}</span>
          {enrollment.subscription_expires_at && (
            <span>Expira: {new Date(enrollment.subscription_expires_at).toLocaleDateString()}</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

### Ejemplo 3: Historial de Pagos

```typescript
import { getSubscriptionHistory } from '@/lib/courseAccess'

export default async function PaymentHistory({ userId, courseId }) {
  const history = await getSubscriptionHistory(userId, courseId)

  return (
    <div>
      <h3>Historial de Pagos</h3>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Evento</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          {history.map(event => (
            <tr key={event.id}>
              <td>{new Date(event.created_at).toLocaleDateString()}</td>
              <td>{event.event_type}</td>
              <td>${event.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 🔄 Mantenimiento Automático

### Ejecutar limpieza de suscripciones expiradas (Cron Job)

Crea un endpoint API para ejecutar periódicamente:

```typescript
// /api/cron/update-subscriptions
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Verificar API key para seguridad
  const apiKey = request.headers.get('authorization')
  if (apiKey !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ejecutar función SQL
  const { data, error } = await supabase.rpc('update_expired_subscriptions')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    success: true,
    expired_count: data,
    message: `${data} suscripciones actualizadas a estado expirado`
  })
}
```

Configurar en Vercel Cron (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/update-subscriptions",
    "schedule": "0 0 * * *"
  }]
}
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar script SQL en Supabase
- [ ] Actualizar archivo de webhook
- [ ] Configurar variables de entorno
- [ ] Configurar productos en Hotmart/Stripe
- [ ] Configurar webhooks en Hotmart/Stripe
- [ ] Probar compra de curso con pago único
- [ ] Probar suscripción mensual
- [ ] Probar cancelación de suscripción
- [ ] Probar renovación automática
- [ ] Implementar verificación de acceso en páginas de curso
- [ ] Configurar cron job para limpieza
- [ ] Probar reembolsos y contracargos

---

## 🆘 Solución de Problemas

### Webhook no recibe eventos
1. Verifica la URL del webhook
2. Verifica el header `x-api-key`
3. Revisa logs de Hotmart/Stripe
4. Verifica que WEBHOOK_SECRET_KEY esté configurado

### Usuario no tiene acceso después de pagar
1. Verifica que el evento se procesó (tabla subscription_events)
2. Verifica que course_code coincide con Product ID
3. Verifica RLS de la tabla user_courses
4. Revisa logs del webhook

### Suscripción no expira
1. Ejecuta manualmente: `SELECT update_expired_subscriptions()`
2. Verifica que el cron job esté configurado
3. Verifica fechas en subscription_expires_at

---

¿Necesitas ayuda? Revisa los logs en:
- Supabase → Database → Logs
- Vercel → Functions → Logs
- Hotmart → Webhooks → Historial
