import { createClient } from '@supabase/supabase-js'

export const crmSupabase = createClient(
  import.meta.env.VITE_CRM_SUPABASE_URL,
  import.meta.env.VITE_CRM_SUPABASE_ANON_KEY
)
