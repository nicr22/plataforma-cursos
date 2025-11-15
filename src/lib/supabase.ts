import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Configuración optimizada para evitar timeouts Y mantener la sesión
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // ✅ ACTIVADO: Mantiene la sesión del usuario
    autoRefreshToken: true, // ✅ Refresca el token automáticamente
    detectSessionInUrl: true, // ✅ Detecta la sesión en la URL
    storageKey: 'supabase.auth.token', // Clave para guardar en localStorage
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web',
    },
  },
})