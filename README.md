# FanBattle 2026

FanBattle 2026 est une compétition numérique entre supporters: chaque fan choisit une nation, participe à des actions simples pendant les matchs et aide son pays à grimper dans un classement mondial.

## MVP

- Choix d'une nation
- Mini-jeu de tirs au but
- Actions rapides de matchday
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

## Vision produit

Le projet doit rester rapide, viral et facile à comprendre: une session courte, un score immédiat, et le sentiment de contribuer à son pays en direct.
