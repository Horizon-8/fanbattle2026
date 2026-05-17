import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function fetchCountries() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('countries')
    .select('code, name, flag, color, accent, flag_gradient, supporters_count, total_points')
    .order('total_points', { ascending: false });

  if (error) {
    console.error('Supabase countries error', error);
    return [];
  }

  return (data || []).map((country) => ({
    code: country.code,
    region: country.code === 'USA' ? 'US' : country.code,
    flag: country.flag,
    name: country.name,
    supporters: country.supporters_count,
    points: country.total_points,
    color: country.color,
    accent: country.accent,
    flagGradient: country.flag_gradient,
  }));
}

export async function fetchCurrentMatch() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      external_provider,
      external_id,
      home_score,
      away_score,
      minute,
      status,
      home_team:home_team_id(id, name, short_name, logo_url, country_code, color, accent),
      away_team:away_team_id(id, name, short_name, logo_url, country_code, color, accent)
    `)
    .eq('status', 'live')
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase current match error', error);
    return null;
  }

  if (!data?.home_team || !data?.away_team) return null;

  return {
    id: data.id,
    source: 'supabase',
    minute: data.minute || 0,
    status: data.status,
    homeCode: data.home_team.country_code || `TEAM_${data.home_team.id}`,
    awayCode: data.away_team.country_code || `TEAM_${data.away_team.id}`,
    homeTeamId: data.home_team.id,
    awayTeamId: data.away_team.id,
    homeName: data.home_team.name,
    awayName: data.away_team.name,
    homeScore: data.home_score ?? 0,
    awayScore: data.away_score ?? 0,
    homeMatchPoints: 0,
    awayMatchPoints: 0,
  };
}

export async function fetchMatchTimeline(matchId) {
  if (!supabase || !matchId) return [];

  const { data, error } = await supabase
    .from('match_timeline_events')
    .select('id, minute, description, team:team_id(country_code)')
    .eq('match_id', matchId)
    .order('minute', { ascending: false });

  if (error) {
    console.error('Supabase timeline error', error);
    return [];
  }

  return (data || []).map((event) => ({
    id: event.id,
    minute: event.minute ? `${event.minute}'` : '',
    text: event.description,
    side: event.team?.country_code || null,
  }));
}

export async function fetchScoreTotals() {
  if (!supabase) return { countryTotals: {}, matchTeamTotals: {} };

  const { data, error } = await supabase
    .from('score_events')
    .select(`
      match_id,
      points,
      team:supporting_team_id(id, country_code)
    `);

  if (error) {
    console.error('Supabase score totals error', error);
    return { countryTotals: {}, matchTeamTotals: {} };
  }

  return (data || []).reduce(
    (totals, event) => {
      const points = event.points || 0;
      const teamId = event.team?.id;
      const countryCode = event.team?.country_code;

      if (countryCode) {
        totals.countryTotals[countryCode] = (totals.countryTotals[countryCode] || 0) + points;
      }

      if (event.match_id && teamId) {
        const key = `${event.match_id}:${teamId}`;
        totals.matchTeamTotals[key] = (totals.matchTeamTotals[key] || 0) + points;
      }

      return totals;
    },
    { countryTotals: {}, matchTeamTotals: {} },
  );
}

export async function addScoreEvent({ matchId, supportingCode, points = 1, source = 'tap' }) {
  if (!supabase || !matchId || !supportingCode) {
    return { ok: false, reason: 'missing-config' };
  }

  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('country_code', supportingCode)
    .limit(1)
    .maybeSingle();

  if (teamError || !team) {
    console.error('Supabase team lookup error', teamError);
    return { ok: false, reason: 'missing-team' };
  }

  const { error } = await supabase.from('score_events').insert({
    match_id: matchId,
    supporting_team_id: team.id,
    points,
    source,
  });

  if (error) {
    console.error('Supabase score insert error', error);
    return { ok: false, reason: 'insert-failed' };
  }

  return { ok: true };
}
