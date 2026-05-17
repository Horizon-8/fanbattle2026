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

export async function getOrCreateProfile(displayName, selectedCountryCode) {
  if (!supabase) return null;

  const cleanName = displayName.trim();
  if (!cleanName) return null;

  const normalizedName = cleanName.toLowerCase();
  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id, display_name, selected_country_code')
    .eq('normalized_display_name', normalizedName)
    .maybeSingle();

  if (existingError) {
    console.error('Supabase profile lookup error', existingError);
    return null;
  }

  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      display_name: cleanName,
      selected_country_code: selectedCountryCode || null,
    })
    .select('id, display_name, selected_country_code')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: duplicate } = await supabase
        .from('profiles')
        .select('id, display_name, selected_country_code')
        .eq('normalized_display_name', normalizedName)
        .maybeSingle();

      if (duplicate) return duplicate;
    }

    console.error('Supabase profile insert error', error);
    return null;
  }

  return data;
}

export async function upsertApiTeam({ code, name, color, accent, teamType = 'unknown', countryCode = null }) {
  if (!supabase || !code || !name) return null;

  const { data, error } = await supabase
    .from('teams')
    .upsert(
      {
        external_provider: 'app',
        external_id: code,
        name,
        short_name: code,
        country_code: countryCode,
        team_type: teamType,
        color,
        accent,
      },
      { onConflict: 'external_provider,external_id' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('Supabase team upsert error', error);
    return null;
  }

  return data;
}

export async function upsertAppMatch(match, homeTeamId, awayTeamId) {
  if (!supabase || !match?.id || !homeTeamId || !awayTeamId) return null;

  const { data, error } = await supabase
    .from('matches')
    .upsert(
      {
        external_provider: match.source || 'app',
        external_id: String(match.id),
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: match.homeScore || 0,
        away_score: match.awayScore || 0,
        minute: match.minute || 0,
        status: 'live',
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'external_provider,external_id' },
    )
    .select('id')
    .single();

  if (error) {
    console.error('Supabase match upsert error', error);
    return null;
  }

  return data;
}

export async function addMatchPoint({ match, supportingSide, profile, points = 1 }) {
  if (!supabase || !match || !supportingSide || !profile) {
    return { ok: false, reason: 'missing-config' };
  }

  const homeTeam = await upsertApiTeam({
    code: match.homeCode,
    name: match.homeName,
    color: supportingSide.code === match.homeCode ? supportingSide.color : undefined,
    accent: supportingSide.code === match.homeCode ? supportingSide.accent : undefined,
    teamType: match.homeCode?.startsWith('TEAM_') ? 'club' : 'country',
    countryCode: match.homeCode?.startsWith('TEAM_') ? null : match.homeCode,
  });

  const awayTeam = await upsertApiTeam({
    code: match.awayCode,
    name: match.awayName,
    color: supportingSide.code === match.awayCode ? supportingSide.color : undefined,
    accent: supportingSide.code === match.awayCode ? supportingSide.accent : undefined,
    teamType: match.awayCode?.startsWith('TEAM_') ? 'club' : 'country',
    countryCode: match.awayCode?.startsWith('TEAM_') ? null : match.awayCode,
  });

  if (!homeTeam || !awayTeam) return { ok: false, reason: 'missing-team' };

  const persistedMatch = await upsertAppMatch(match, homeTeam.id, awayTeam.id);
  if (!persistedMatch) return { ok: false, reason: 'missing-match' };

  const supportingTeamId = supportingSide.code === match.homeCode ? homeTeam.id : awayTeam.id;

  const { error } = await supabase.from('score_events').insert({
    match_id: persistedMatch.id,
    profile_id: profile.id,
    supporting_team_id: supportingTeamId,
    points,
    source: 'tap',
  });

  if (error) {
    console.error('Supabase match point insert error', error);
    return { ok: false, reason: 'insert-failed' };
  }

  return {
    ok: true,
    matchId: persistedMatch.id,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
  };
}

export async function fetchMatchLeaderboard(matchId) {
  if (!supabase || !matchId) return [];

  const { data, error } = await supabase
    .from('score_events')
    .select(`
      points,
      profile:profile_id(id, display_name, selected_country_code),
      team:supporting_team_id(id, name, country_code)
    `)
    .eq('match_id', matchId);

  if (error) {
    console.error('Supabase match leaderboard error', error);
    return [];
  }

  const grouped = new Map();

  for (const event of data || []) {
    const profileId = event.profile?.id || 'anonymous';
    const current = grouped.get(profileId) || {
      profileId,
      displayName: event.profile?.display_name || 'Anonyme',
      selectedCountryCode: event.profile?.selected_country_code || null,
      supportingTeamName: event.team?.name || 'Équipe',
      supportingCountryCode: event.team?.country_code || null,
      points: 0,
    };

    current.points += event.points || 0;
    grouped.set(profileId, current);
  }

  return [...grouped.values()].sort((a, b) => b.points - a.points);
}
