// Supabase Edge Function: send-reminders
// Triggered by pg_cron or manually via HTTP POST
// Checks for consultants who haven't logged hours for the previous week
// and sends a reminder email to gereon.kaver@svt.se

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REMINDER_RECIPIENT = 'gereon.kaver@svt.se'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate previous week's Monday
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const thisMonday = new Date(today)
    thisMonday.setDate(today.getDate() - diffToMonday)
    const prevMonday = new Date(thisMonday)
    prevMonday.setDate(thisMonday.getDate() - 7)
    const prevFriday = new Date(prevMonday)
    prevFriday.setDate(prevMonday.getDate() + 4)

    const weekStart = prevMonday.toISOString().split('T')[0]
    const weekEnd = prevFriday.toISOString().split('T')[0]

    // Get consultants missing hours using the database function
    const { data: missingConsultants, error } = await supabase.rpc(
      'get_consultants_missing_hours',
      { week_start: weekStart }
    )

    if (error) {
      console.error('Error fetching missing consultants:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!missingConsultants || missingConsultants.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'All consultants have reported hours for last week.',
          week: `${weekStart} to ${weekEnd}`,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Build the email content
    const consultantList = missingConsultants
      .map((c: any) => `- ${c.full_name || 'Unknown'} (${c.email})`)
      .join('\n')

    const emailSubject = `Time Report Reminder: ${missingConsultants.length} consultant(s) missing hours for week ${weekStart}`
    const emailBody = `
The following consultants have not reported hours for the week of ${weekStart} to ${weekEnd}:

${consultantList}

Please follow up with them to ensure their time reports are submitted.

---
This is an automated reminder from the Time Reporting system.
    `.trim()

    // Send email via Supabase's built-in email or a webhook
    // Option 1: Use Supabase's auth.admin to send an email (requires email provider setup)
    // Option 2: Use a third-party email service via fetch
    // For now, we log the reminder and you can connect your preferred email service

    console.log('=== REMINDER EMAIL ===')
    console.log(`To: ${REMINDER_RECIPIENT}`)
    console.log(`Subject: ${emailSubject}`)
    console.log(`Body:\n${emailBody}`)
    console.log('======================')

    // If you have a mail service (e.g., Resend, SendGrid), uncomment and configure:
    /*
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Time Reporting <noreply@svt.se>',
          to: REMINDER_RECIPIENT,
          subject: emailSubject,
          text: emailBody,
        }),
      })
    }
    */

    return new Response(
      JSON.stringify({
        message: `Reminder needed for ${missingConsultants.length} consultant(s)`,
        week: `${weekStart} to ${weekEnd}`,
        consultants: missingConsultants,
        recipient: REMINDER_RECIPIENT,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
