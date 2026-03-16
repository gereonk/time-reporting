-- =============================================================================
-- Seed data for Time Reporting Application
-- =============================================================================
-- Run this after schema.sql and after the admin auth user has been created.

-- Admin profile (replace UUID with actual auth.users id after signup)
insert into profiles (id, email, role, full_name)
values (
  '00000000-0000-0000-0000-000000000000',  -- replace with real auth user UUID
  'admin@svt.se',
  'admin',
  'System Admin'
) on conflict (id) do nothing;

-- Sample teams
insert into teams (name) values
  ('SVT Nyheter'),
  ('SVT Sport'),
  ('SVT Play'),
  ('SVT Barn'),
  ('SVT Infrastruktur');

-- Sample team member assignments (uncomment and adjust UUIDs once real users exist)
-- insert into team_members (team_id, user_id)
-- select t.id, p.id
-- from teams t, profiles p
-- where t.name = 'SVT Nyheter'
--   and p.email = 'consultant@svt.se';
