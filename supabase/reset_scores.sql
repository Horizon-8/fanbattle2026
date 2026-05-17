-- Reset FanBattle test scores to zero.
-- Use this only during development.

truncate table public.score_events restart identity cascade;

update public.countries
set total_points = 0,
    supporters_count = 0;
