-- FanBattle 2026 profile and API scoring support
-- Run this after 001_initial_schema.sql.

alter table public.profiles
  add column if not exists normalized_display_name text;

update public.profiles
set display_name = concat('fan-', left(id::text, 8))
where display_name is null or trim(display_name) = '';

update public.profiles
set normalized_display_name = lower(trim(display_name))
where normalized_display_name is null;

create unique index if not exists profiles_normalized_display_name_unique
on public.profiles (normalized_display_name);

create or replace function public.normalize_profile_name()
returns trigger
language plpgsql
as $$
begin
  new.display_name = trim(new.display_name);
  new.normalized_display_name = lower(new.display_name);
  return new;
end;
$$;

drop trigger if exists profiles_normalize_name on public.profiles;
create trigger profiles_normalize_name
before insert or update on public.profiles
for each row execute function public.normalize_profile_name();

drop policy if exists "Public update profiles" on public.profiles;
create policy "Public update profiles"
on public.profiles for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public insert profiles" on public.profiles;
create policy "Public insert profiles"
on public.profiles for insert
to anon, authenticated
with check (display_name is not null and length(trim(display_name)) >= 2);

-- Prototype policy: lets the browser create API teams/matches for testing.
-- Replace this later with a Vercel Function or Supabase Edge Function.
drop policy if exists "Public insert teams" on public.teams;
create policy "Public insert teams"
on public.teams for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update teams" on public.teams;
create policy "Public update teams"
on public.teams for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public insert matches" on public.matches;
create policy "Public insert matches"
on public.matches for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update matches" on public.matches;
create policy "Public update matches"
on public.matches for update
to anon, authenticated
using (true)
with check (true);
