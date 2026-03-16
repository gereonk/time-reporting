-- =============================================================================
-- Weekly Reminder: notify consultants who have not reported hours
-- =============================================================================
-- Prerequisites:
--   - pg_cron extension (enabled via Supabase dashboard > Database > Extensions)
--   - pg_net  extension (for HTTP calls to Edge Functions / webhooks)
--   - A Supabase Edge Function or webhook endpoint that sends reminder emails
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =============================================================================
-- Function: send weekly reminders
--
-- Finds all consultants missing hours for the previous work week (Mon-Fri)
-- and calls a Supabase Edge Function via pg_net to send reminder emails.
-- =============================================================================
create or replace function public.send_weekly_reminders()
returns void
language plpgsql
security definer
as $$
declare
  prev_monday date;
  consultant  record;
  edge_fn_url text := current_setting('app.settings.edge_function_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
begin
  -- Calculate previous Monday
  prev_monday := date_trunc('week', current_date - interval '7 days')::date;

  for consultant in
    select * from public.get_consultants_missing_hours(prev_monday)
  loop
    -- Fire an async HTTP POST to the Edge Function for each consultant
    perform net.http_post(
      url     := coalesce(edge_fn_url, 'https://<project-ref>.supabase.co/functions/v1/send-reminder'),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || coalesce(service_key, '')
      ),
      body := jsonb_build_object(
        'user_id',   consultant.user_id,
        'email',     consultant.email,
        'full_name', consultant.full_name,
        'week_start', prev_monday::text
      )
    );
  end loop;
end;
$$;

-- =============================================================================
-- Schedule: run every Monday at 09:00 UTC
-- =============================================================================
select cron.schedule(
  'weekly-time-report-reminder',   -- job name
  '0 9 * * 1',                     -- cron expression: every Monday at 09:00
  $$select public.send_weekly_reminders()$$
);

-- =============================================================================
-- Manual test: trigger the reminder for a specific week
-- =============================================================================
-- select public.send_weekly_reminders();
--
-- Or check who is missing hours for a specific week:
-- select * from public.get_consultants_missing_hours('2026-03-09');
