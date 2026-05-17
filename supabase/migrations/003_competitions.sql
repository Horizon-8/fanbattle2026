-- FanBattle 2026 competitions support
-- Run this after 002_profiles_and_api_scoring.sql.

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  external_provider text not null,
  external_id text not null,
  name text not null,
  country text,
  logo_url text,
  season integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint competitions_external_unique unique (external_provider, external_id, season)
);

create table if not exists public.competition_teams (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (competition_id, team_id)
);

drop trigger if exists competitions_touch_updated_at on public.competitions;
create trigger competitions_touch_updated_at
before update on public.competitions
for each row execute function public.touch_updated_at();

alter table public.competitions enable row level security;
alter table public.competition_teams enable row level security;

drop policy if exists "Public read competitions" on public.competitions;
create policy "Public read competitions"
on public.competitions for select
to anon, authenticated
using (true);

drop policy if exists "Public read competition teams" on public.competition_teams;
create policy "Public read competition teams"
on public.competition_teams for select
to anon, authenticated
using (true);

-- Prototype policies: lets the Vercel function use the anon key for imports.
-- In production, move imports behind a service-role-only backend.
drop policy if exists "Public insert competitions" on public.competitions;
create policy "Public insert competitions"
on public.competitions for insert
to anon, authenticated
with check (true);

drop policy if exists "Public update competitions" on public.competitions;
create policy "Public update competitions"
on public.competitions for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "Public insert competition teams" on public.competition_teams;
create policy "Public insert competition teams"
on public.competition_teams for insert
to anon, authenticated
with check (true);
