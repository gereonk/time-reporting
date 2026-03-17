import { supabase } from './supabase'

// Fire-and-forget audit logging — never blocks the UI
export function logAction(action, value) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const email = session?.user?.email || 'unknown'
    supabase
      .from('audit_logs')
      .insert({ user_email: email, action, value })
      .then(({ error }) => {
        if (error) console.warn('Audit log failed:', error.message)
      })
  })
}
