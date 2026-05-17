-- FanBattle 2026 seed data
-- Run after 001_initial_schema.sql.

insert into public.countries
  (code, name, flag, color, accent, flag_gradient, supporters_count, total_points)
values
  ('MAR', 'Maroc', '🇲🇦', '#c1272d', '#006233', 'linear-gradient(90deg, #c1272d, #006233)', 0, 0),
  ('FRA', 'France', '🇫🇷', '#002654', '#ed2939', 'linear-gradient(90deg, #002654 0 33%, #ffffff 33% 66%, #ed2939 66% 100%)', 0, 0),
  ('BRA', 'Brésil', '🇧🇷', '#009739', '#ffdf00', 'linear-gradient(135deg, #009739 0 48%, #ffdf00 48% 62%, #002776 62% 100%)', 0, 0),
  ('ARG', 'Argentine', '🇦🇷', '#75aadb', '#fcbf49', 'linear-gradient(180deg, #75aadb 0 33%, #ffffff 33% 66%, #75aadb 66% 100%)', 0, 0),
  ('USA', 'États-Unis', '🇺🇸', '#3c3b6e', '#b22234', 'linear-gradient(135deg, #3c3b6e 0 42%, #ffffff 42% 50%, #b22234 50% 100%)', 0, 0),
  ('SEN', 'Sénégal', '🇸🇳', '#00853f', '#fdef42', 'linear-gradient(90deg, #00853f 0 33%, #fdef42 33% 66%, #e31b23 66% 100%)', 0, 0),
  ('CAN', 'Canada', '🇨🇦', '#d52b1e', '#ffffff', 'linear-gradient(90deg, #d52b1e 0 28%, #ffffff 28% 72%, #d52b1e 72% 100%)', 0, 0),
  ('MEX', 'Mexique', '🇲🇽', '#006847', '#ce1126', 'linear-gradient(90deg, #006847 0 33%, #ffffff 33% 66%, #ce1126 66% 100%)', 0, 0),
  ('POR', 'Portugal', '🇵🇹', '#006600', '#ff0000', 'linear-gradient(90deg, #006600 0 40%, #ff0000 40% 100%)', 0, 0)
on conflict (code) do update set
  name = excluded.name,
  flag = excluded.flag,
  color = excluded.color,
  accent = excluded.accent,
  flag_gradient = excluded.flag_gradient,
  supporters_count = excluded.supporters_count,
  total_points = excluded.total_points;

insert into public.teams
  (external_provider, external_id, name, short_name, country_code, team_type, color, accent)
select 'seed', code, name, code, code, 'country', color, accent
from public.countries
on conflict (external_provider, external_id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  country_code = excluded.country_code,
  team_type = excluded.team_type,
  color = excluded.color,
  accent = excluded.accent;

with home_team as (
  select id from public.teams where external_provider = 'seed' and external_id = 'FRA'
),
away_team as (
  select id from public.teams where external_provider = 'seed' and external_id = 'POR'
)
insert into public.matches
  (external_provider, external_id, home_team_id, away_team_id, home_score, away_score, minute, status, starts_at)
select
  'seed',
  'fra-por-live',
  home_team.id,
  away_team.id,
  2,
  1,
  67,
  'live',
  now() - interval '67 minutes'
from home_team, away_team
on conflict (external_provider, external_id) do update set
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  minute = excluded.minute,
  status = excluded.status,
  starts_at = excluded.starts_at;

with demo_match as (
  select id from public.matches where external_provider = 'seed' and external_id = 'fra-por-live'
),
france as (
  select id from public.teams where external_provider = 'seed' and external_id = 'FRA'
),
portugal as (
  select id from public.teams where external_provider = 'seed' and external_id = 'POR'
)
insert into public.match_timeline_events
  (match_id, team_id, minute, event_type, title, description, external_id)
values
  ((select id from demo_match), (select id from france), 67, 'commentary', 'Pression France', 'Grosse pression côté France, les supporters accélèrent.', 'seed-67-france'),
  ((select id from demo_match), (select id from portugal), 61, 'commentary', 'Réaction Portugal', 'Portugal réduit l’écart dans le défi collectif.', 'seed-61-portugal'),
  ((select id from demo_match), (select id from france), 52, 'bonus', 'Bonus France', 'Nouveau bonus de série débloqué par la France.', 'seed-52-france'),
  ((select id from demo_match), null, 45, 'commentary', 'Pause', 'Pause: match très serré entre les deux communautés.', 'seed-45-pause')
on conflict (match_id, external_id) do update set
  team_id = excluded.team_id,
  minute = excluded.minute,
  event_type = excluded.event_type,
  title = excluded.title,
  description = excluded.description;
