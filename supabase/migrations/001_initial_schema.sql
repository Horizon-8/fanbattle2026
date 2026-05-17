-- FanBattle 2026 initial schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.countries (
  code text primary key,
  name text not null,
  flag text not null,
  color text not null,
  accent text not null,
  flag_gradient text not null,
  supporters_count integer not null default 0,
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  external_provider text,
  external_id text,
  name text not null,
  short_name text,
  logo_url text,
  country_code text references public.countries(code),
  team_type text not null default 'club',
  color text,
  accent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_type_check check (team_type in ('country', 'club', 'unknown')),
  constraint teams_external_unique unique (external_provider, external_id)
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  detected_country_code text references public.countries(code),
  selected_country_code text references public.countries(code),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_provider text,
  external_id text,
  home_team_id uuid references public.teams(id),
  away_team_id uuid references public.teams(id),
  home_score integer not null default 0,
  away_score integer not null default 0,
  minute integer not null default 0,
  status text not null default 'scheduled',
  starts_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_status_check check (status in ('scheduled', 'live', 'paused', 'finished', 'cancelled')),
  constraint matches_external_unique unique (external_provider, external_id),
  constraint matches_different_teams check (home_team_id is distinct from away_team_id)
);

create table if not exists public.match_timeline_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id),
  minute integer,
  event_type text not null default 'commentary',
  title text,
  description text not null,
  external_id text,
  created_at timestamptz not null default now(),
  constraint match_timeline_external_unique unique (match_id, external_id)
);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  supporting_team_id uuid not null references public.teams(id),
  created_at timestamptz not null default now(),
  constraint match_participants_unique unique (match_id, profile_id)
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  supporting_team_id uuid not null references public.teams(id),
  points integer not null default 1,
  source text not null default 'tap',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint score_events_points_positive check (points > 0)
);

create index if not exists countries_total_points_idx on public.countries (total_points desc);
create index if not exists teams_country_code_idx on public.teams (country_code);
create index if not exists matches_status_starts_at_idx on public.matches (status, starts_at desc);
create index if not exists score_events_match_team_idx on public.score_events (match_id, supporting_team_id);
create index if not exists score_events_created_at_idx on public.score_events (created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists countries_touch_updated_at on public.countries;
create trigger countries_touch_updated_at
before update on public.countries
for each row execute function public.touch_updated_at();

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at
before update on public.teams
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists matches_touch_updated_at on public.matches;
create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

alter table public.countries enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_timeline_events enable row level security;
alter table public.match_participants enable row level security;
alter table public.score_events enable row level security;

drop policy if exists "Public read countries" on public.countries;
create policy "Public read countries"
on public.countries for select
to anon, authenticated
using (true);

drop policy if exists "Public read teams" on public.teams;
create policy "Public read teams"
on public.teams for select
to anon, authenticated
using (true);

drop policy if exists "Public read matches" on public.matches;
create policy "Public read matches"
on public.matches for select
to anon, authenticated
using (true);

drop policy if exists "Public read timeline" on public.match_timeline_events;
create policy "Public read timeline"
on public.match_timeline_events for select
to anon, authenticated
using (true);

drop policy if exists "Public read score events" on public.score_events;
create policy "Public read score events"
on public.score_events for select
to anon, authenticated
using (true);

drop policy if exists "Public insert score events" on public.score_events;
create policy "Public insert score events"
on public.score_events for insert
to anon, authenticated
with check (points between 1 and 10);

drop policy if exists "Public read participants" on public.match_participants;
create policy "Public read participants"
on public.match_participants for select
to anon, authenticated
using (true);

drop policy if exists "Public insert participants" on public.match_participants;
create policy "Public insert participants"
on public.match_participants for insert
to anon, authenticated
with check (true);

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Public insert profiles" on public.profiles;
create policy "Public insert profiles"
on public.profiles for insert
to anon, authenticated
with check (true);
