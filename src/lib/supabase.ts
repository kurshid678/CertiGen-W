import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

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