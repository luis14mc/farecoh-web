create extension if not exists pgcrypto;

create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamp default now(),
  constraint staff_profiles_role_check check (role in ('super_admin', 'event_manager', 'seller', 'checkin_operator')),
  constraint staff_profiles_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create index if not exists staff_profiles_user_id_idx on public.staff_profiles(user_id);
create index if not exists staff_profiles_role_idx on public.staff_profiles(role);
create index if not exists staff_profiles_active_idx on public.staff_profiles(active);

alter table public.staff_profiles enable row level security;

create policy "Staff can read own active profile" on public.staff_profiles
  for select
  using (auth.uid() = user_id and active = true);

create policy "Super admins can read staff profiles" on public.staff_profiles
  for select
  using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid()
        and sp.role = 'super_admin'
        and sp.active = true
    )
  );

create policy "Super admins can manage staff profiles" on public.staff_profiles
  for all
  using (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid()
        and sp.role = 'super_admin'
        and sp.active = true
    )
  )
  with check (
    exists (
      select 1 from public.staff_profiles sp
      where sp.user_id = auth.uid()
        and sp.role = 'super_admin'
        and sp.active = true
    )
  );