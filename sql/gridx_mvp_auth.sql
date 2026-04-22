-- GridX MVP table-based auth (no Supabase Auth/GoTrue dependency)
-- Run in Supabase SQL editor before using /login and /signup pages.

create extension if not exists pgcrypto;

create table if not exists public.gridx_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists public.gridx_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists public.gridx_profiles (
  user_id uuid primary key references public.gridx_users(id) on delete cascade,
  display_name text,
  account_type text check (account_type in ('user', 'org_member')) not null default 'user',
  org_id uuid references public.gridx_organisations(id),
  role text check (role in ('admin', 'member')) not null default 'member',
  created_at timestamptz default now()
);

alter table public.gridx_users enable row level security;
alter table public.gridx_organisations enable row level security;
alter table public.gridx_profiles enable row level security;

drop policy if exists "gridx_mvp_open_users" on public.gridx_users;
create policy "gridx_mvp_open_users"
  on public.gridx_users for all
  using (true)
  with check (true);

drop policy if exists "gridx_mvp_open_orgs" on public.gridx_organisations;
create policy "gridx_mvp_open_orgs"
  on public.gridx_organisations for all
  using (true)
  with check (true);

drop policy if exists "gridx_mvp_open_profiles" on public.gridx_profiles;
create policy "gridx_mvp_open_profiles"
  on public.gridx_profiles for all
  using (true)
  with check (true);
