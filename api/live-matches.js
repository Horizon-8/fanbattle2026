const COUNTRY_ALIASES = {
  Argentina: 'ARG',
  Brazil: 'BRA',
  Brasil: 'BRA',
  Canada: 'CAN',
  France: 'FRA',
  Mexico: 'MEX',
  Morocco: 'MAR',
  Maroc: 'MAR',
  Portugal: 'POR',
  Senegal: 'SEN',
  Sénégal: 'SEN',
  USA: 'USA',
  'United States': 'USA',
  'United States of America': 'USA',
};

function inferCountryCode(teamName) {
  return COUNTRY_ALIASES[teamName] || null;
}

function normalizeFixture(fixture) {
  const homeName = fixture?.teams?.home?.name;
  const awayName = fixture?.teams?.away?.name;
  const homeCode = inferCountryCode(homeName) || `TEAM_${fixture?.teams?.home?.id || 'HOME'}`;
  const awayCode = inferCountryCode(awayName) || `TEAM_${fixture?.teams?.away?.id || 'AWAY'}`;

  if (!homeName || !awayName) {
    return null;
  }

  return {
    id: String(fixture.fixture.id),
    source: 'api-football',
    minute: fixture.fixture.status.elapsed || 0,
    status: fixture.fixture.status.short || 'LIVE',
    homeCode,
    awayCode,
    homeName,
    awayName,
    homeLogo: fixture?.teams?.home?.logo || null,
    awayLogo: fixture?.teams?.away?.logo || null,
    homeScore: fixture.goals.home ?? 0,
    awayScore: fixture.goals.away ?? 0,
    homeMatchPoints: 0,
    awayMatchPoints: 0,
  };
}

export default async function handler(request, response) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return response.status(200).json({
      configured: false,
      matches: [],
      message: 'Missing API_FOOTBALL_KEY.',
    });
  }

  try {
    const apiResponse = await fetch('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: {
        'x-apisports-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      return response.status(apiResponse.status).json({
        configured: true,
        matches: [],
        message: 'Sports API request failed.',
      });
    }

    const payload = await apiResponse.json();
    const matches = (payload.response || [])
      .map(normalizeFixture)
      .filter(Boolean)
      .slice(0, 3);

    return response.status(200).json({
      configured: true,
      matches,
    });
  } catch (error) {
    return response.status(500).json({
      configured: true,
      matches: [],
      message: error instanceof Error ? error.message : 'Unknown sports API error.',
    });
  }
}
