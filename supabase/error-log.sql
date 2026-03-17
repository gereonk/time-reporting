-- Error logs table
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_email text not null,
  source text not null,
  message text not null,
  details text
);

-- Indexes
create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);
create index if not exists error_logs_user_email_idx on public.error_logs (user_email);

-- Enable RLS
alter table public.error_logs enable row level security;

-- Admins can read all error logs
create policy "Admins can read error logs"
  on public.error_logs
  for select
  to authenticated
  using (public.is_admin());

-- All authenticated users can insert error logs
create policy "Authenticated users can insert error logs"
  on public.error_logs
  for insert
  to authenticated
  with check (true);
