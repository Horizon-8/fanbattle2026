# FanBattle 2026

FanBattle 2026 est une compétition numérique entre supporters: chaque fan choisit une nation, participe à des actions simples pendant les matchs et aide son pays à grimper dans un classement mondial.

## MVP

- Choix d'une nation
- Pays suggéré automatiquement selon la région du navigateur
- Mini-jeu de tirs au but
- Tableau de bord après sélection
- Bouton provisoire pour marquer un point
- Historique simple des derniers matchs
- Classement mondial par pays
- Interface web mobile-first

## Lancer le projet en local

```bash
npm install
npm run dev
```

Le site démarre ensuite avec Vite, généralement sur `http://localhost:5173`.

Si Git affiche un avertissement `dubious ownership`, lance cette commande une seule fois :

```bash
git config --global --add safe.directory "C:/Users/PC/Documents/New project 2/fanbattle2026"
```

## Configurer Supabase

1. Crée un projet sur Supabase.
2. Copie `.env.example` vers `.env.local`.
3. Remplis `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

Ces variables sont publiques côté navigateur. Les clés secrètes Supabase ne doivent jamais être ajoutées dans Vite.

## Déployer sur Vercel

1. Importe ce dépôt GitHub dans Vercel.
2. Ajoute les mêmes variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Lance un déploiement. Vercel utilisera `npm run build` et publiera le dossier `dist`.

## Tester les matchs live

L'application contient une fonction Vercel `api/live-matches.js`.

1. Crée une clé API sur API-FOOTBALL / API-SPORTS.
2. Dans Vercel, ajoute une variable d'environnement serveur :

```bash
API_FOOTBALL_KEY=ta-cle-api
```

3. Redéploie le projet.

Important : cette variable ne doit pas commencer par `VITE_`, sinon elle serait exposée dans le navigateur.

Si aucune clé n'est configurée, ou si aucun match live n'est disponible, l'application garde le match de démonstration France vs Portugal.

## Créer les tables Supabase

Dans Supabase, ouvre **SQL Editor**, puis exécute ces fichiers dans cet ordre :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql`

Le schéma sépare :

- `countries` : identité nationale, couleurs, points globaux.
- `teams` : équipes jouables, nationales ou clubs venant d'une API.
- `profiles` : utilisateurs ou visiteurs anonymes.
- `matches` : matchs live ou planifiés.
- `match_timeline_events` : événements/commentaires d'un match.
- `match_participants` : utilisateur inscrit dans un camp pour un match.
- `score_events` : historique append-only des points marqués.

On stocke les points comme événements dans `score_events`, puis on calcule ou synchronise les totaux. C'est plus robuste que modifier directement un score depuis le navigateur.

## Source des données dans l'app

L'interface lit maintenant :

1. Les pays depuis Supabase (`countries`), avec fallback local.
2. Le match live seedé depuis Supabase (`matches`), avec fallback local.
3. Les matchs live externes via `/api/live-matches` si `API_FOOTBALL_KEY` est configurée.

L'ordre d'affichage du match principal est :

```text
API live disponible -> match Supabase live -> match de démonstration
```

## Vision produit

Le projet doit rester rapide, viral et facile à comprendre: une session courte, un score immédiat, et le sentiment de contribuer à son pays en direct.
