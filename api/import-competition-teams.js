import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function normalizeTeam(item) {
  return {
    external_provider: 'api-football',
    external_id: String(item.team.id),
    name: item.team.name,
    short_name: item.team.code || item.team.name.slice(0, 3).toUpperCase(),
    logo_url: item.team.logo || null,
    country_code: null,
    team_type: 'club',
    color: '#264653',
    accent: '#f4a261',
  };
}

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost');
  const league = request.query?.league || url.searchParams.get('league');
  const season = request.query?.season || url.searchParams.get('season');
  const name = request.query?.name || url.searchParams.get('name');
  const country = request.query?.country || url.searchParams.get('country');

  if (!league || !season) {
    return response.status(400).json({
      ok: false,
      message: 'Missing required query params: league and season.',
      example: '/api/import-competition-teams?league=39&season=2025',
    });
  }

  try {
    const apiKey = getRequiredEnv('API_FOOTBALL_KEY');
    const supabaseUrl = getRequiredEnv('VITE_SUPABASE_URL');
    const supabaseAnonKey = getRequiredEnv('VITE_SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const apiResponse = await fetch(`https://v3.football.api-sports.io/teams?league=${league}&season=${season}`, {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({
        ok: false,
        message: 'API-FOOTBALL teams request failed.',
      });
    }

    const payload = await apiResponse.json();
    const rows = payload.response || [];
    const leagueInfo = rows[0]?.team
      ? {
          external_provider: 'api-football',
          external_id: String(league),
          name: name || `League ${league}`,
          country: country || null,
          logo_url: null,
          season: Number(season),
        }
      : null;

    if (!rows.length || !leagueInfo) {
      return response.status(200).json({
        ok: true,
        importedTeams: 0,
        message: 'No teams returned by API-FOOTBALL.',
      });
    }

    const { data: competition, error: competitionError } = await supabase
      .from('competitions')
      .upsert(leagueInfo, { onConflict: 'external_provider,external_id,season' })
      .select('id')
      .single();

    if (competitionError) {
      return response.status(500).json({
        ok: false,
        message: 'Failed to upsert competition.',
        details: competitionError.message,
      });
    }

    const teams = rows.map(normalizeTeam);
    const { data: upsertedTeams, error: teamsError } = await supabase
      .from('teams')
      .upsert(teams, { onConflict: 'external_provider,external_id' })
      .select('id, name');

    if (teamsError) {
      return response.status(500).json({
        ok: false,
        message: 'Failed to upsert teams.',
        details: teamsError.message,
      });
    }

    const competitionTeams = (upsertedTeams || []).map((team) => ({
      competition_id: competition.id,
      team_id: team.id,
    }));

    const { error: joinError } = await supabase
      .from('competition_teams')
      .upsert(competitionTeams, { onConflict: 'competition_id,team_id' });

    if (joinError) {
      return response.status(500).json({
        ok: false,
        message: 'Failed to link teams to competition.',
        details: joinError.message,
      });
    }

    return response.status(200).json({
      ok: true,
      competitionId: competition.id,
      importedTeams: upsertedTeams.length,
      teams: upsertedTeams,
    });
  } catch (error) {
    return response.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown import error.',
    });
  }
}
