import { createClient } from '@supabase/supabase-js'

// Fallback placeholders let the app boot even before .env is filled in —
// real requests will fail gracefully and surface as friendly error states
// instead of crashing at import time.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
