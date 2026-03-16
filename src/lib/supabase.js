import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable Navigator Lock API to avoid "steal lock" errors in dev
    lock: async (name, acquireTimeout, fn) => {
      return await fn()
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
