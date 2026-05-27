import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Mantener sesión iniciada entre cierres de navegador
    persistSession: true,
    
    // Refrescar el token automáticamente antes de que expire
    autoRefreshToken: true,
    
    // Detectar sesión en URL (útil para magic links, recovery password)
    detectSessionInUrl: true,
    
    // Storage donde se guarda la sesión (localStorage por default en web)
    storage: window.localStorage,
    
    // Flow de autenticación recomendado por Supabase
    flowType: 'pkce',
  },
})