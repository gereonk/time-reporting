import { supabase } from './supabase'

// Fire-and-forget error logging — never blocks the UI
export function logError(source, message, details) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const email = session?.user?.email || 'anonymous'
    supabase
      .from('error_logs')
      .insert({
        user_email: email,
        source,
        message,
        details: details || null,
      })
      .then(({ error }) => {
        if (error) console.warn('Error log failed:', error.message)
      })
  })
}
