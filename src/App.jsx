import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock3,
  MapPin,
  Medal,
  Plus,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import { hasSupabaseConfig } from './supabaseClient';

const nations = [
  { code: 'MAR', region: 'MA', flag: '🇲🇦', name: 'Maroc', supporters: '42.8k', points: 184200, color: '#c9152f' },
  { code: 'FRA', region: 'FR', flag: '🇫🇷', name: 'France', supporters: '39.1k', points: 173870, color: '#2756d8' },
  { code: 'BRA', region: 'BR', flag: '🇧🇷', name: 'Brésil', supporters: '38.4k', points: 169540, color: '#19a463' },
  { code: 'ARG', region: 'AR', flag: '🇦🇷', name: 'Argentine', supporters: '34.7k', points: 154220, color: '#4ab5e8' },
  { code: 'USA', region: 'US', flag: '🇺🇸', name: 'États-Unis', supporters: '28.2k', points: 137600, color: '#19326f' },
  { code: 'SEN', region: 'SN', flag: '🇸🇳', name: 'Sénégal', supporters: '24.9k', points: 128910, color: '#0b9b59' },
  { code: 'CAN', region: 'CA', flag: '🇨🇦', name: 'Canada', supporters: '21.6k', points: 120340, color: '#d61f2f' },
  { code: 'MEX', region: 'MX', flag: '🇲🇽', name: 'Mexique', supporters: '20.4k', points: 116800, color: '#11845b' },
];

const fallbackMatches = [
  { id: 1, title: 'Défi tirs au but', result: '+12 480 pts', time: 'Aujourd’hui' },
  { id: 2, title: 'Quiz supporters', result: '+8 220 pts', time: 'Hier' },
  { id: 3, title: 'Prédiction de score', result: '+5 940 pts', time: '2 jours' },
  { id: 4, title: 'Défi collectif', result: '+18 100 pts', time: '3 jours' },
];

function getSuggestedNationCode() {
  const locale = navigator.languages?.[0] || navigator.language || '';
  const region = locale.split('-')[1]?.toUpperCase();
  const match = nations.find((nation) => nation.region === region);

  return match?.code || 'MAR';
}

export function App() {
  const [selectedCode, setSelectedCode] = useState(getSuggestedNationCode);
  const [hasJoined, setHasJoined] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);
  const selectedNation = nations.find((nation) => nation.code === selectedCode) ?? nations[0];

  const rankedNations = useMemo(
    () =>
      nations
        .map((nation) => ({
          ...nation,
          points: nation.code === selectedCode ? nation.points + bonusPoints : nation.points,
        }))
        .sort((a, b) => b.points - a.points),
    [bonusPoints, selectedCode],
  );

  const selectedRank = rankedNations.findIndex((nation) => nation.code === selectedCode) + 1;

  if (!hasJoined) {
    return (
      <main className="app-shell">
        <section className="welcome-screen">
          <nav className="topbar" aria-label="Navigation principale">
            <div className="brand">
              <Shield aria-hidden="true" />
              <span>FanBattle</span>
            </div>
            <span className="status-pill">
              {hasSupabaseConfig ? 'Supabase connecté' : 'Démo locale'}
            </span>
          </nav>

          <div className="welcome-layout">
            <div className="welcome-copy">
              <p className="eyebrow">FanBattle 2026</p>
              <h1>Choisis ton pays</h1>
              <p className="intro">
                On te propose un pays selon la région détectée par ton navigateur. Tu peux le
                changer avant d’entrer dans le classement.
              </p>

              <div className="suggested-card">
                <MapPin aria-hidden="true" />
                <span>Pays suggéré</span>
                <strong>
                  {selectedNation.flag} {selectedNation.name}
                </strong>
              </div>
            </div>

            <div className="country-panel">
              <div className="section-title">
                <p>Nation</p>
                <h2>Représente tes couleurs</h2>
              </div>
              <div className="nation-grid">
                {nations.map((nation) => (
                  <button
                    className={nation.code === selectedCode ? 'nation-tile active' : 'nation-tile'}
                    key={nation.code}
                    onClick={() => setSelectedCode(nation.code)}
                    style={{ '--nation-color': nation.color }}
                    type="button"
                  >
                    <span className="flag">{nation.flag}</span>
                    <span>
                      <strong>{nation.name}</strong>
                      <small>{nation.supporters} fans</small>
                    </span>
                  </button>
                ))}
              </div>

              <button className="primary-button full-width" onClick={() => setHasJoined(true)} type="button">
                Continuer avec {selectedNation.name}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell dashboard-shell">
      <nav className="dashboard-topbar" aria-label="Navigation du tableau de bord">
        <button className="back-button" onClick={() => setHasJoined(false)} type="button">
          <ArrowLeft aria-hidden="true" />
          Changer de pays
        </button>
        <div className="brand dark">
          <Shield aria-hidden="true" />
          <span>FanBattle</span>
        </div>
      </nav>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1>
            {selectedNation.flag} {selectedNation.name}
          </h1>
          <p className="dashboard-intro">
            Chaque point marqué fait monter ton pays dans le classement mondial des supporters.
          </p>
        </div>

        <button className="score-button" onClick={() => setBonusPoints((points) => points + 1)} type="button">
          <Plus aria-hidden="true" />
          Marquer un point
        </button>
      </section>

      <section className="stats-grid" aria-label="Résumé du pays">
        <div className="stat-card">
          <Medal aria-hidden="true" />
          <span>Position</span>
          <strong>#{selectedRank}</strong>
        </div>
        <div className="stat-card">
          <Trophy aria-hidden="true" />
          <span>Points ajoutés</span>
          <strong>{bonusPoints.toLocaleString('fr-FR')}</strong>
        </div>
        <div className="stat-card">
          <Users aria-hidden="true" />
          <span>Supporters</span>
          <strong>{selectedNation.supporters}</strong>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Classement et historique">
        <div className="leaderboard panel">
          <div className="section-title">
            <p>Classement</p>
            <h2>Top nations</h2>
          </div>
          <ol>
            {rankedNations.map((nation, index) => (
              <li className={nation.code === selectedCode ? 'highlighted-row' : ''} key={nation.code}>
                <span className="rank">{index + 1}</span>
                <span className="flag">{nation.flag}</span>
                <span className="leader-name">{nation.name}</span>
                <strong>{nation.points.toLocaleString('fr-FR')}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel">
          <div className="section-title">
            <p>Historique</p>
            <h2>Derniers matchs</h2>
          </div>
          <div className="history-list">
            {fallbackMatches.map((match) => (
              <div className="history-row" key={match.id}>
                <Clock3 aria-hidden="true" />
                <span>
                  <strong>{match.title}</strong>
                  <small>{match.time}</small>
                </span>
                <em>{match.result}</em>
              </div>
            ))}
          </div>
          <div className="next-step">
            <BadgeCheck aria-hidden="true" />
            <span>Le bouton “Marquer un point” deviendra ensuite l’entrée vers le mini-jeu.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
