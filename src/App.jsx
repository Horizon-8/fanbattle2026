import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock3,
  Flame,
  Medal,
  Shield,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import {
  addMatchPoint,
  fetchMatchLeaderboard,
  fetchCountries,
  fetchCurrentMatch,
  fetchMatchTimeline,
  fetchScoreTotals,
  getOrCreateProfile,
  hasSupabaseConfig,
} from './supabaseClient';

const fallbackNations = [
  { code: 'MAR', region: 'MA', flag: '🇲🇦', name: 'Maroc', supporters: 0, points: 0, color: '#c1272d', accent: '#006233', flagGradient: 'linear-gradient(90deg, #c1272d, #006233)' },
  { code: 'FRA', region: 'FR', flag: '🇫🇷', name: 'France', supporters: 0, points: 0, color: '#002654', accent: '#ed2939', flagGradient: 'linear-gradient(90deg, #002654 0 33%, #ffffff 33% 66%, #ed2939 66% 100%)' },
  { code: 'BRA', region: 'BR', flag: '🇧🇷', name: 'Brésil', supporters: 0, points: 0, color: '#009739', accent: '#ffdf00', flagGradient: 'linear-gradient(135deg, #009739 0 48%, #ffdf00 48% 62%, #002776 62% 100%)' },
  { code: 'ARG', region: 'AR', flag: '🇦🇷', name: 'Argentine', supporters: 0, points: 0, color: '#75aadb', accent: '#fcbf49', flagGradient: 'linear-gradient(180deg, #75aadb 0 33%, #ffffff 33% 66%, #75aadb 66% 100%)' },
  { code: 'USA', region: 'US', flag: '🇺🇸', name: 'États-Unis', supporters: 0, points: 0, color: '#3c3b6e', accent: '#b22234', flagGradient: 'linear-gradient(135deg, #3c3b6e 0 42%, #ffffff 42% 50%, #b22234 50% 100%)' },
  { code: 'SEN', region: 'SN', flag: '🇸🇳', name: 'Sénégal', supporters: 0, points: 0, color: '#00853f', accent: '#fdef42', flagGradient: 'linear-gradient(90deg, #00853f 0 33%, #fdef42 33% 66%, #e31b23 66% 100%)' },
  { code: 'CAN', region: 'CA', flag: '🇨🇦', name: 'Canada', supporters: 0, points: 0, color: '#d52b1e', accent: '#ffffff', flagGradient: 'linear-gradient(90deg, #d52b1e 0 28%, #ffffff 28% 72%, #d52b1e 72% 100%)' },
  { code: 'MEX', region: 'MX', flag: '🇲🇽', name: 'Mexique', supporters: 0, points: 0, color: '#006847', accent: '#ce1126', flagGradient: 'linear-gradient(90deg, #006847 0 33%, #ffffff 33% 66%, #ce1126 66% 100%)' },
  { code: 'POR', region: 'PT', flag: '🇵🇹', name: 'Portugal', supporters: 0, points: 0, color: '#006600', accent: '#ff0000', flagGradient: 'linear-gradient(90deg, #006600 0 40%, #ff0000 40% 100%)' },
];

const fallbackLiveMatch = {
  id: 'fra-por-live',
  source: 'demo',
  minute: 67,
  status: 'LIVE',
  homeCode: 'FRA',
  awayCode: 'POR',
  homeTeamId: null,
  awayTeamId: null,
  homeName: 'France',
  awayName: 'Portugal',
  homeScore: 2,
  awayScore: 1,
  homeMatchPoints: 48240,
  awayMatchPoints: 44790,
};

const fallbackTimeline = [
  { id: 1, minute: "67'", text: 'Grosse pression côté France, les supporters accélèrent.', side: 'FRA' },
  { id: 2, minute: "61'", text: 'Portugal réduit l’écart dans le défi collectif.', side: 'POR' },
  { id: 3, minute: "52'", text: 'Nouveau bonus de série débloqué par la France.', side: 'FRA' },
  { id: 4, minute: "45'", text: 'Pause: match très serré entre les deux communautés.', side: null },
];

const recentCountryGames = [
  { id: 1, title: 'France vs Portugal', result: '+12 480 pts', time: 'Live' },
  { id: 2, title: 'France vs Maroc', result: '+8 220 pts', time: 'Hier' },
  { id: 3, title: 'France vs Brésil', result: '+5 940 pts', time: '2 jours' },
];

function getSuggestedNationCode() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.split('-')[1]?.toUpperCase();
  const match = fallbackNations.find((nation) => nation.region === region);

  return match?.code || 'FRA';
}

function getNation(code, nations) {
  return nations.find((nation) => nation.code === code) ?? nations[0];
}

function getKnownNation(code, nations) {
  return nations.find((nation) => nation.code === code) ?? null;
}

function getMatchSide(code, match, nations) {
  const nation = getKnownNation(code, nations);

  if (nation) return nation;

  if (match.homeCode === code) {
    return {
      code,
      flag: '⚽',
      name: match.homeName || 'Équipe domicile',
      supporters: 0,
      points: 0,
      color: '#264653',
      accent: '#f4a261',
      flagGradient: 'linear-gradient(135deg, #264653, #2a9d8f, #f4a261)',
    };
  }

  if (match.awayCode === code) {
    return {
      code,
      flag: '⚽',
      name: match.awayName || 'Équipe extérieure',
      supporters: 0,
      points: 0,
      color: '#7b2cbf',
      accent: '#ffbe0b',
      flagGradient: 'linear-gradient(135deg, #7b2cbf, #ff006e, #ffbe0b)',
    };
  }

  return getNation(code, nations);
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function App() {
  const [selectedCode, setSelectedCode] = useState(getSuggestedNationCode);
  const [screen, setScreen] = useState('home');
  const [supportingCode, setSupportingCode] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [nations, setNations] = useState(fallbackNations);
  const [countryTotals, setCountryTotals] = useState({});
  const [matchTeamTotals, setMatchTeamTotals] = useState({});
  const [profile, setProfile] = useState(null);
  const [pseudoInput, setPseudoInput] = useState(window.localStorage.getItem('fanbattle:pseudo') || '');
  const [matchLeaderboard, setMatchLeaderboard] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [supabaseMatch, setSupabaseMatch] = useState(null);
  const [timeline, setTimeline] = useState(fallbackTimeline);
  const [scoreStatus, setScoreStatus] = useState('');

  const liveMatch = supabaseMatch ?? liveMatches[0] ?? fallbackLiveMatch;
  const activeMatchSource = supabaseMatch ? 'supabase' : liveMatches[0] ? 'api' : 'demo';
  const selectedNation = getNation(selectedCode, nations);
  const homeNation = getMatchSide(liveMatch.homeCode, liveMatch, nations);
  const awayNation = getMatchSide(liveMatch.awayCode, liveMatch, nations);
  const supportingNation = supportingCode ? getMatchSide(supportingCode, liveMatch, nations) : selectedNation;
  const selectedInLiveMatch = [liveMatch.homeCode, liveMatch.awayCode].includes(selectedCode);

  const matchTheme = {
    '--home-color': homeNation.color,
    '--home-accent': homeNation.accent,
    '--home-flag-gradient': homeNation.flagGradient,
    '--away-color': awayNation.color,
    '--away-accent': awayNation.accent,
    '--away-flag-gradient': awayNation.flagGradient,
    '--support-color': supportingNation.color,
    '--support-accent': supportingNation.accent,
    '--support-flag-gradient': supportingNation.flagGradient,
  };
  const homeMatchPoints =
    matchTeamTotals[`${liveMatch.id}:${liveMatch.homeTeamId}`] || liveMatch.homeMatchPoints || 0;
  const awayMatchPoints =
    matchTeamTotals[`${liveMatch.id}:${liveMatch.awayTeamId}`] || liveMatch.awayMatchPoints || 0;

  const rankedNations = useMemo(
    () =>
      nations
        .map((nation) => ({
          ...nation,
          points: (countryTotals[nation.code] || 0) + (supportingCode === nation.code ? bonusPoints : 0),
        }))
        .sort((a, b) => b.points - a.points),
    [bonusPoints, countryTotals, nations, supportingCode],
  );

  const selectedRank = rankedNations.findIndex((nation) => nation.code === selectedCode) + 1;

  useEffect(() => {
    let isMounted = true;

    async function loadSupabaseData() {
      const [countries, currentMatch, scoreTotals] = await Promise.all([
        fetchCountries(),
        fetchCurrentMatch(),
        fetchScoreTotals(),
      ]);

      if (!isMounted) return;

      if (countries.length) {
        setNations(countries.map((country) => ({ ...country, points: 0 })));
      }

      setCountryTotals(scoreTotals.countryTotals);
      setMatchTeamTotals(scoreTotals.matchTeamTotals);

      if (currentMatch) {
        setSupabaseMatch(currentMatch);
        const currentTimeline = await fetchMatchTimeline(currentMatch.id);
        if (isMounted && currentTimeline.length) {
          setTimeline(currentTimeline);
        }

        const currentLeaderboard = await fetchMatchLeaderboard(currentMatch.id);
        if (isMounted) {
          setMatchLeaderboard(currentLeaderboard);
        }
      }
    }

    async function loadLiveMatches() {
      try {
        const response = await fetch('/api/live-matches');
        if (!response.ok) return;

        const payload = await response.json();
        if (!isMounted) return;

        if (payload.matches?.length) {
          setLiveMatches(payload.matches);
        }
      } catch {
        return;
      }
    }

    loadSupabaseData();
    loadLiveMatches();
    const interval = window.setInterval(loadLiveMatches, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const storedPseudo = window.localStorage.getItem('fanbattle:pseudo');

    async function restoreProfile() {
      if (!storedPseudo) return;

      const restoredProfile = await getOrCreateProfile(storedPseudo, selectedCode);
      if (!isMounted || !restoredProfile) return;

      setProfile(restoredProfile);
      setPseudoInput(restoredProfile.display_name);
    }

    restoreProfile();

    return () => {
      isMounted = false;
    };
  }, [selectedCode]);

  function joinMatch(sideCode) {
    setSupportingCode(sideCode);
    setScreen('match');
  }

  async function refreshScoreTotals() {
    const totals = await fetchScoreTotals();
    setCountryTotals(totals.countryTotals);
    setMatchTeamTotals(totals.matchTeamTotals);
  }

  async function refreshMatchLeaderboard(matchId = liveMatch.id) {
    const leaderboard = await fetchMatchLeaderboard(matchId);
    setMatchLeaderboard(leaderboard);
  }

  async function handlePseudoSubmit(event) {
    event.preventDefault();
    setScoreStatus('Connexion du pseudo...');

    const nextProfile = await getOrCreateProfile(pseudoInput, selectedNation.code);
    if (!nextProfile) {
      setScoreStatus('Pseudo impossible à créer');
      return;
    }

    window.localStorage.setItem('fanbattle:pseudo', nextProfile.display_name);
    setProfile(nextProfile);
    setPseudoInput(nextProfile.display_name);
    setScoreStatus(`Connecté: ${nextProfile.display_name}`);
  }

  async function handleScorePoint() {
    if (!profile) {
      setScoreStatus('Entre ton pseudo avant de marquer');
      return;
    }

    setScoreStatus('Enregistrement...');

    const result = await addMatchPoint({
      match: liveMatch,
      supportingSide: supportingNation,
      profile,
      points: 1,
    });

    if (result.ok) {
      setBonusPoints(0);
      await refreshScoreTotals();
      await refreshMatchLeaderboard(result.matchId);
      setScoreStatus('+1 point enregistré');
      return;
    }

    setBonusPoints((points) => points + 1);
    setScoreStatus('Mode local: Supabase indisponible');
  }

  function focusLiveMatch() {
    document.querySelector('.live-match-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function goHomeToLiveMatch() {
    setScreen('home');
    window.setTimeout(focusLiveMatch, 0);
  }

  if (screen === 'country') {
    return (
      <main className="app-shell dashboard-shell">
        <nav className="dashboard-topbar" aria-label="Navigation pays">
          <button className="back-button" onClick={() => setScreen('home')} type="button">
            <ArrowLeft aria-hidden="true" />
            Accueil
          </button>
          <div className="brand dark">
            <Shield aria-hidden="true" />
            <span>FanBattle</span>
          </div>
        </nav>

        <section
          className="country-page-hero"
          style={{
            '--support-color': selectedNation.color,
            '--support-accent': selectedNation.accent,
            '--support-flag-gradient': selectedNation.flagGradient,
          }}
        >
          <div>
            <p className="eyebrow">Page pays</p>
            <h1>
              {selectedNation.flag} {selectedNation.name}
            </h1>
            <p className="dashboard-intro">
              Résumé de la communauté, historique récent et position dans le classement mondial.
            </p>
          </div>
          {selectedInLiveMatch ? (
            <button className="tap-game compact-action" onClick={() => joinMatch(selectedCode)} type="button">
              <Flame aria-hidden="true" />
              Rejoindre le match live
            </button>
          ) : (
            <button className="secondary-dark-button" onClick={goHomeToLiveMatch} type="button">
              Voir les matchs live
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </section>

        <section className="dashboard-grid" aria-label="Résumé du pays">
          <div className="panel">
            <div className="section-title">
              <p>Statistiques</p>
              <h2>
                {selectedNation.flag} {selectedNation.name}
              </h2>
            </div>
            <div className="country-stats">
              <div>
                <Medal aria-hidden="true" />
                <span>Rang global</span>
                <strong>#{selectedRank}</strong>
              </div>
              <div>
                <Users aria-hidden="true" />
                <span>Fans</span>
                <strong>{formatNumber(selectedNation.supporters)}</strong>
              </div>
              <div>
                <Trophy aria-hidden="true" />
                <span>Points</span>
                <strong>{formatNumber(selectedNation.points)}</strong>
              </div>
            </div>
            <div className="history-list">
              {recentCountryGames.map((game) => (
                <div className="history-row" key={game.id}>
                  <Clock3 aria-hidden="true" />
                  <span>
                    <strong>
                      {selectedNation.flag} {game.title}
                    </strong>
                    <small>{game.time}</small>
                  </span>
                  <em>{game.result}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="leaderboard panel">
            <div className="section-title">
              <p>Global</p>
              <h2>Classement pays</h2>
            </div>
            <ol>
              {rankedNations.slice(0, 7).map((nation, index) => (
                <li className={nation.code === selectedCode ? 'highlighted-row' : ''} key={nation.code}>
                  <span className="rank">{index + 1}</span>
                  <span className="flag">{nation.flag}</span>
                  <span className="leader-name">{nation.name}</span>
                  <strong>{formatNumber(nation.points)}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    );
  }

  if (screen === 'match') {
    return (
      <main className="app-shell dashboard-shell">
        <nav className="dashboard-topbar" aria-label="Navigation du match">
          <button className="back-button" onClick={() => setScreen('home')} type="button">
            <ArrowLeft aria-hidden="true" />
            Accueil
          </button>
          <div className="brand dark">
            <Shield aria-hidden="true" />
            <span>FanBattle</span>
          </div>
        </nav>

        <section className="match-layout" aria-label="Match live">
          <div className="game-zone" style={matchTheme}>
            <div className="match-kicker">
              <span className="live-dot" />
              Live match · {homeNation.flag} {homeNation.name} vs {awayNation.flag} {awayNation.name}
            </div>
            <h1>
              {homeNation.flag} {liveMatch.homeScore} - {liveMatch.awayScore} {awayNation.flag}
            </h1>
            <p className="dashboard-intro">
              Tu aides {supportingNation.flag} {supportingNation.name}. Pour l’instant le mini-jeu est remplacé par un
              bouton simple, puis on le transformera en vrai jeu.
            </p>

            <form className="pseudo-form" onSubmit={handlePseudoSubmit}>
              <label htmlFor="pseudo">Pseudo</label>
              <div>
                <input
                  id="pseudo"
                  maxLength={24}
                  minLength={2}
                  onChange={(event) => setPseudoInput(event.target.value)}
                  placeholder="cat123"
                  value={pseudoInput}
                />
                <button type="submit">{profile ? 'Changer' : 'Valider'}</button>
              </div>
              {profile ? <small>Connecté comme {profile.display_name}</small> : null}
            </form>

            <button className="tap-game" onClick={handleScorePoint} type="button">
              <Zap aria-hidden="true" />
              Marquer un point pour {supportingNation.name}
            </button>
            {scoreStatus ? <p className="score-status">{scoreStatus}</p> : null}
          </div>

          <aside className="match-info panel colorful-panel" style={matchTheme} aria-label="Informations du match">
            <div className="section-title">
              <p>Info match</p>
              <h2>
                {homeNation.flag} {homeNation.name} vs {awayNation.flag} {awayNation.name}
              </h2>
            </div>
            <div className="scoreline">
              <span>{homeNation.flag}</span>
              <strong>{liveMatch.homeScore}</strong>
              <em>{liveMatch.minute}'</em>
              <strong>{liveMatch.awayScore}</strong>
              <span>{awayNation.flag}</span>
            </div>
            <div className="timeline-list">
              {timeline.map((item) => (
                <div className="timeline-row" key={item.id}>
                  <time>{item.minute}</time>
                  <span>
                    {item.side ? `${getNation(item.side, nations).flag} ` : ''}
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="dashboard-grid" aria-label="Classements du match">
          <div className="panel">
            <div className="section-title">
              <p>Leaderboard</p>
              <h2>Top joueurs du match</h2>
            </div>
            <div className="player-list">
              {matchLeaderboard.length ? (
                matchLeaderboard.map((player, index) => {
                  const playerCountry = player.selectedCountryCode
                    ? getNation(player.selectedCountryCode, nations)
                    : null;
                  const supported = player.supportingCountryCode
                    ? getNation(player.supportingCountryCode, nations)
                    : null;

                  return (
                    <div className="player-row" key={player.profileId}>
                      <span className="rank">{index + 1}</span>
                      <span>
                        <strong>{player.displayName}</strong>
                        <small>
                          {playerCountry ? `${playerCountry.flag} joueur · ` : ''}
                          soutient {supported ? `${supported.flag} ${supported.name}` : player.supportingTeamName}
                        </small>
                      </span>
                      <em>{formatNumber(player.points)}</em>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  Aucun point réel sur ce match pour l’instant.
                </div>
              )}
            </div>
          </div>

          <div className="leaderboard panel">
            <div className="section-title">
              <p>Global</p>
              <h2>Classement pays</h2>
            </div>
            <ol>
              {rankedNations.slice(0, 6).map((nation, index) => (
                <li className={nation.code === selectedCode ? 'highlighted-row' : ''} key={nation.code}>
                  <span className="rank">{index + 1}</span>
                  <span className="flag">{nation.flag}</span>
                  <span className="leader-name">{nation.name}</span>
                  <strong>{formatNumber(nation.points)}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section
        className="home-screen"
        style={{
          '--support-color': selectedNation.color,
          '--support-accent': selectedNation.accent,
          '--support-flag-gradient': selectedNation.flagGradient,
        }}
      >
        <nav className="topbar" aria-label="Navigation principale">
          <div className="brand">
            <Shield aria-hidden="true" />
            <span>FanBattle</span>
          </div>
          <span className="status-pill">
            {hasSupabaseConfig ? 'Supabase connecté' : 'Démo locale'}
          </span>
        </nav>

        <div className="home-layout">
          <section className="home-hero" aria-label="Pays sélectionné">
            <p className="eyebrow">Ton pays</p>
            <h1>
              Soutiens {selectedNation.flag} {selectedNation.name}
            </h1>
            <p className="intro">
              Ton pays est suggéré automatiquement selon ton navigateur. Tu peux le changer, ou rejoindre directement
              un match live si ton pays joue.
            </p>
            <div className="home-actions">
              <button className="primary-button" onClick={() => setScreen('country')} type="button">
                Voir les stats de {selectedNation.flag} {selectedNation.name}
                <BarChart3 aria-hidden="true" />
              </button>
              <button
                className="secondary-button"
                onClick={selectedInLiveMatch ? () => joinMatch(selectedCode) : focusLiveMatch}
                type="button"
              >
                {selectedInLiveMatch ? `Jouer pour ${selectedNation.name}` : 'Voir le match live'}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>

          <section className="live-match-card" style={matchTheme} aria-label="Match live actuel">
            <div className="live-card-header">
              <span>
                <span className="live-dot" />
                Match live · {activeMatchSource === 'api' ? 'API' : activeMatchSource === 'supabase' ? 'Supabase' : 'démo'}
              </span>
              <strong>{liveMatch.minute}'</strong>
            </div>

            <div className="versus-grid">
              <button className="team-side home-side" onClick={() => joinMatch(homeNation.code)} type="button">
                <span className="team-flag">{homeNation.flag}</span>
                <strong>{homeNation.name}</strong>
                <small>{formatNumber(homeMatchPoints)} pts match</small>
              </button>

              <div className="match-score">
                <Flame aria-hidden="true" />
                <strong>
                  {liveMatch.homeScore} - {liveMatch.awayScore}
                </strong>
                <span>Choisis un côté</span>
              </div>

              <button className="team-side away-side" onClick={() => joinMatch(awayNation.code)} type="button">
                <span className="team-flag">{awayNation.flag}</span>
                <strong>{awayNation.name}</strong>
                <small>{formatNumber(awayMatchPoints)} pts match</small>
              </button>
            </div>

            <div className="live-scan" aria-hidden="true" />
          </section>
        </div>
      </section>

      <section className="home-content" aria-label="Classements et pays">
        <div className="country-panel">
          <div className="section-title">
            <p>Changer</p>
            <h2>Pays détecté ou choisi</h2>
          </div>
          <div className="nation-grid compact">
            {nations.slice(0, 8).map((nation) => (
              <button
                className={nation.code === selectedCode ? 'nation-tile active' : 'nation-tile'}
                key={nation.code}
                onClick={() => setSelectedCode(nation.code)}
                style={{ '--nation-color': nation.color, '--nation-flag-gradient': nation.flagGradient }}
                type="button"
              >
                <span className="flag">{nation.flag}</span>
                <span>
                  <strong>{nation.name}</strong>
                  <small>{formatNumber(nation.supporters)} fans</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="leaderboard panel">
          <div className="section-title">
            <p>Global</p>
            <h2>Classement pays</h2>
          </div>
          <ol>
            {rankedNations.slice(0, 7).map((nation, index) => (
              <li className={nation.code === selectedCode ? 'highlighted-row' : ''} key={nation.code}>
                <span className="rank">{index + 1}</span>
                <span className="flag">{nation.flag}</span>
                <span className="leader-name">{nation.name}</span>
                <strong>{formatNumber(nation.points)}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <div className="section-title">
            <p>Résumé</p>
            <h2>
              {selectedNation.flag} {selectedNation.name}
            </h2>
          </div>
          <div className="country-stats">
            <div>
              <Medal aria-hidden="true" />
              <span>Rang global</span>
              <strong>#{selectedRank}</strong>
            </div>
            <div>
              <Users aria-hidden="true" />
              <span>Fans</span>
              <strong>{formatNumber(selectedNation.supporters)}</strong>
            </div>
            <div>
              <Trophy aria-hidden="true" />
              <span>Points</span>
              <strong>{formatNumber(countryTotals[selectedNation.code] || 0)}</strong>
            </div>
          </div>
          <div className="history-list">
            {recentCountryGames.map((game) => (
              <div className="history-row" key={game.id}>
                <Clock3 aria-hidden="true" />
                <span>
                  <strong>
                    {selectedNation.flag} {game.title}
                  </strong>
                  <small>{game.time}</small>
                </span>
                <em>{game.result}</em>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
