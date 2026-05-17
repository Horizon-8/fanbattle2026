-- Robust pseudo creation through an RPC.
-- Run this after 002_profiles_and_api_scoring.sql.

create or replace function public.get_or_create_profile(
  p_display_name text,
  p_selected_country_code text default null
)
returns table (
  id uuid,
  display_name text,
  selected_country_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  normalized_name text;
begin
  clean_name := trim(coalesce(p_display_name, ''));
  normalized_name := lower(clean_name);

  if length(clean_name) < 2 then
    raise exception 'display_name_too_short';
  end if;

  return query
  select p.id, p.display_name, p.selected_country_code
  from public.profiles p
  where p.normalized_display_name = normalized_name
  limit 1;

  if found then
    return;
  end if;

  insert into public.profiles (
    display_name,
    normalized_display_name,
    selected_country_code
  )
  values (
    clean_name,
    normalized_name,
    p_selected_country_code
  )
  on conflict (normalized_display_name) do update
  set selected_country_code = coalesce(public.profiles.selected_country_code, excluded.selected_country_code);

  return query
  select p.id, p.display_name, p.selected_country_code
  from public.profiles p
  where p.normalized_display_name = normalized_name
  limit 1;
end;
$$;

grant execute on function public.get_or_create_profile(text, text) to anon, authenticated;
