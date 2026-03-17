-- =============================================================================
-- Audit Log Table (client-side logging, no triggers)
-- =============================================================================

create table if not exists audit_logs (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  user_email text not null,
  action     text not null,
  value      text
);

create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_user_email on audit_logs (user_email);

alter table audit_logs enable row level security;

create policy "Admins can read all audit logs"
  on audit_logs for select
  using (public.is_admin());

create policy "Authenticated users can insert audit logs"
  on audit_logs for insert
  with check (auth.role() = 'authenticated');
