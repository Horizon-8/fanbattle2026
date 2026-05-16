import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  Goal,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { hasSupabaseConfig } from './supabaseClient';

const nations = [
  { code: 'MAR', flag: '🇲🇦', name: 'Maroc', supporters: '42.8k', points: 184200, color: '#c9152f' },
  { code: 'FRA', flag: '🇫🇷', name: 'France', supporters: '39.1k', points: 173870, color: '#2756d8' },
  { code: 'BRA', flag: '🇧🇷', name: 'Brésil', supporters: '38.4k', points: 169540, color: '#19a463' },
  { code: 'ARG', flag: '🇦🇷', name: 'Argentine', supporters: '34.7k', points: 154220, color: '#4ab5e8' },
  { code: 'USA', flag: '🇺🇸', name: 'États-Unis', supporters: '28.2k', points: 137600, color: '#19326f' },
  { code: 'SEN', flag: '🇸🇳', name: 'Sénégal', supporters: '24.9k', points: 128910, color: '#0b9b59' },
];

const moments = [
  { label: 'Tirs au but', value: '+180 pts', icon: Goal },
  { label: 'Quiz live', value: '+75 pts', icon: Zap },
  { label: 'Défi collectif', value: '+2.4M', icon: Sparkles },
];

export function App() {
  const [selectedCode, setSelectedCode] = useState('MAR');
  const selectedNation = nations.find((nation) => nation.code === selectedCode) ?? nations[0];

  const rankedNations = useMemo(
    () =>
      nations
        .map((nation) => ({
          ...nation,
          points: nation.code === selectedCode ? nation.points + 1240 : nation.points,
        }))
        .sort((a, b) => b.points - a.points),
    [selectedCode],
  );

  return (
    <main className="app-shell">
      <section className="hero">
        <nav className="topbar" aria-label="Navigation principale">
          <div className="brand">
            <Shield aria-hidden="true" />
            <span>FanBattle</span>
          </div>
          <button className="ghost-button" type="button">
            <Trophy aria-hidden="true" />
            Saison 2026
          </button>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Coupe du monde des supporters</p>
            <h1>FanBattle 2026</h1>
            <p className="intro">
              Choisis ton pays, joue pendant les matchs et fais grimper ta nation dans le
              classement mondial des fans.
            </p>
            <div className="hero-actions">
              <button className="primary-button" type="button">
                Entrer dans l'arène
                <ChevronRight aria-hidden="true" />
              </button>
              <span className="live-pill">
                {hasSupabaseConfig ? 'Supabase connecté' : 'Démo locale'}
              </span>
            </div>
          </div>

          <div className="pitch-panel" aria-label="Démo du mini-jeu">
            <div className="score-strip">
              <span>{selectedNation.flag}</span>
              <strong>{selectedNation.code}</strong>
              <span className="score">3 / 5</span>
            </div>
            <div className="goal-box">
              <button className="target" type="button" aria-label="Tirer en haut à gauche" />
              <button className="target" type="button" aria-label="Tirer en haut à droite" />
              <button className="target" type="button" aria-label="Tirer en bas à gauche" />
              <button className="target" type="button" aria-label="Tirer en bas à droite" />
              <div className="net-line vertical" />
              <div className="net-line horizontal" />
            </div>
            <div className="play-summary">
              <BadgeCheck aria-hidden="true" />
              <span>But parfait: +320 points pour {selectedNation.name}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid" aria-label="Tableau de bord FanBattle">
        <div className="selector-panel">
          <div className="section-title">
            <p>Pays</p>
            <h2>Représente ta nation</h2>
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
        </div>

        <div className="mini-panel">
          <div className="section-title">
            <p>Matchday</p>
            <h2>Actions rapides</h2>
          </div>
          <div className="moment-list">
            {moments.map((moment) => {
              const Icon = moment.icon;
              return (
                <button className="moment-row" key={moment.label} type="button">
                  <Icon aria-hidden="true" />
                  <span>{moment.label}</span>
                  <strong>{moment.value}</strong>
                </button>
              );
            })}
          </div>
        </div>

        <div className="leaderboard">
          <div className="section-title">
            <p>Classement</p>
            <h2>Top nations</h2>
          </div>
          <ol>
            {rankedNations.map((nation, index) => (
              <li key={nation.code}>
                <span className="rank">{index + 1}</span>
                <span className="flag">{nation.flag}</span>
                <span className="leader-name">{nation.name}</span>
                <strong>{nation.points.toLocaleString('fr-FR')}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
