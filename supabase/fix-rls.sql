-- =============================================================================
-- Fix: RLS infinite recursion
-- The admin policies on profiles query profiles itself, causing a loop.
-- Solution: use a security definer function that bypasses RLS to check role.
-- =============================================================================

-- Helper function that bypasses RLS to check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- Drop old policies ----
drop policy if exists "Users can read own profile" on profiles;
drop policy if exists "Admins can read all profiles" on profiles;
drop policy if exists "Users can update own profile" on profiles;

drop policy if exists "Admins can insert teams" on teams;
drop policy if exists "Admins can update teams" on teams;
drop policy if exists "Admins can delete teams" on teams;

drop policy if exists "Admins can insert team_members" on team_members;
drop policy if exists "Admins can update team_members" on team_members;
drop policy if exists "Admins can delete team_members" on team_members;

drop policy if exists "Admins can read all time_entries" on time_entries;
drop policy if exists "Admins can read all vacations" on vacations;

-- ---- Profiles: fixed ----
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can also delete profiles (for user removal)
create policy "Admins can delete profiles"
  on profiles for delete
  using (public.is_admin());

-- ---- Teams: fixed ----
create policy "Admins can insert teams"
  on teams for insert
  with check (public.is_admin());

create policy "Admins can update teams"
  on teams for update
  using (public.is_admin());

create policy "Admins can delete teams"
  on teams for delete
  using (public.is_admin());

-- ---- Team Members: fixed ----
create policy "Admins can insert team_members"
  on team_members for insert
  with check (public.is_admin());

create policy "Admins can update team_members"
  on team_members for update
  using (public.is_admin());

create policy "Admins can delete team_members"
  on team_members for delete
  using (public.is_admin());

-- ---- Time Entries: fixed ----
create policy "Admins can read all time_entries"
  on time_entries for select
  using (public.is_admin());

-- ---- Vacations: fixed ----
create policy "Admins can read all vacations"
  on vacations for select
  using (public.is_admin());
