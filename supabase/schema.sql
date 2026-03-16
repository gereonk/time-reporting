-- =============================================================================
-- Supabase Schema for Time Reporting Application
-- =============================================================================

-- 1. Enable UUID extension
-- =============================================================================
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 2. Profiles table
-- =============================================================================
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null unique,
  role       text not null default 'consultant' check (role in ('consultant', 'admin')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 3. Teams table
-- =============================================================================
create table teams (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 4. Team members (join table)
-- =============================================================================
create table team_members (
  id         uuid primary key default uuid_generate_v4(),
  team_id    uuid not null references teams on delete cascade,
  user_id    uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- =============================================================================
-- 5. Time entries
-- =============================================================================
create table time_entries (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles on delete cascade,
  work_date  date not null,
  hours      numeric not null check (hours >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

-- =============================================================================
-- 6. Vacations
-- =============================================================================
create table vacations (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles on delete cascade,
  start_date date not null,
  end_date   date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- =============================================================================
-- Indexes
-- =============================================================================
create index idx_time_entries_user_id   on time_entries (user_id);
create index idx_time_entries_work_date on time_entries (work_date);
create index idx_vacations_user_id      on vacations (user_id);
create index idx_team_members_team_id   on team_members (team_id);
create index idx_team_members_user_id   on team_members (user_id);

-- =============================================================================
-- 8. Row Level Security
-- =============================================================================

-- ---- Profiles ----
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- Teams ----
alter table teams enable row level security;

create policy "All authenticated users can read teams"
  on teams for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert teams"
  on teams for insert
  with check (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update teams"
  on teams for update
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete teams"
  on teams for delete
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

-- ---- Team Members ----
alter table team_members enable row level security;

create policy "All authenticated users can read team_members"
  on team_members for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert team_members"
  on team_members for insert
  with check (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update team_members"
  on team_members for update
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete team_members"
  on team_members for delete
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

-- ---- Time Entries ----
alter table time_entries enable row level security;

create policy "Users can read own time_entries"
  on time_entries for select
  using (auth.uid() = user_id);

create policy "Admins can read all time_entries"
  on time_entries for select
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can insert own time_entries"
  on time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own time_entries"
  on time_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own time_entries"
  on time_entries for delete
  using (auth.uid() = user_id);

-- ---- Vacations ----
alter table vacations enable row level security;

create policy "Users can read own vacations"
  on vacations for select
  using (auth.uid() = user_id);

create policy "Admins can read all vacations"
  on vacations for select
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can insert own vacations"
  on vacations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own vacations"
  on vacations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own vacations"
  on vacations for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- 9. Auto-create profile on auth.users insert
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'consultant');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 10. Email domain validation
-- =============================================================================
create or replace function public.check_email_domain()
returns trigger
language plpgsql
as $$
begin
  if new.email is null or new.email not like '%@svt.se' then
    raise exception 'Only svt.se email addresses are allowed. Got: %', new.email;
  end if;
  return new;
end;
$$;

create trigger enforce_email_domain
  before insert or update of email on profiles
  for each row execute function public.check_email_domain();

-- =============================================================================
-- 11. Function: get consultants missing hours for a given week
-- =============================================================================
create or replace function public.get_consultants_missing_hours(week_start date)
returns table (
  user_id   uuid,
  email     text,
  full_name text
)
language plpgsql
stable
as $$
declare
  week_end date := week_start + interval '4 days';  -- Monday to Friday
begin
  return query
  select p.id, p.email, p.full_name
  from profiles p
  where p.role = 'consultant'
    -- No time entries for any day in that week
    and not exists (
      select 1
      from time_entries te
      where te.user_id = p.id
        and te.work_date between week_start and week_end
    )
    -- No vacation that fully covers the week
    and not exists (
      select 1
      from vacations v
      where v.user_id = p.id
        and v.start_date <= week_start
        and v.end_date   >= week_end
    );
end;
$$;

-- =============================================================================
-- Auto-update updated_at on time_entries
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger time_entries_set_updated_at
  before update on time_entries
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 12. Seed: admin profile placeholder
--     The actual auth.users row must be created via Supabase Auth (dashboard or
--     API). This inserts the corresponding profiles row once that user exists.
--     Replace the UUID below with the real auth user id after signup.
-- =============================================================================
-- insert into profiles (id, email, role, full_name)
-- values (
--   '00000000-0000-0000-0000-000000000000',  -- replace with real auth user UUID
--   'admin@svt.se',
--   'admin',
--   'System Admin'
-- );
