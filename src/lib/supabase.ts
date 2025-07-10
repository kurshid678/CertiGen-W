import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Handle auth errors gracefully
    onAuthStateChange: (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        // If token refresh failed, clear stored tokens
        localStorage.removeItem('supabase.auth.token')
        sessionStorage.removeItem('supabase.auth.token')
      }
    }
  }
})

export type Template = {
  id: string
  user_id: string
  name: string
  canvas_data: any
  excel_data: any
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  email: string
  created_at: string
}