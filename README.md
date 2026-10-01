# HealthMatrix

The HealthMatrix member app: your records, the Ekaay.AI companion, doctors, screening pods and an
emergency QR card in one place. Product notes are in [docs/PRODUCT.md](docs/PRODUCT.md).

- **App** — React Native, Expo SDK 57, Expo Router, TypeScript (this folder)
- **API** — Node, Express 5, Mongoose 9, TypeScript ([`server/`](server))
- **Database** — MongoDB

## Run it

```bash
# App
cp .env.example .env
npm install
npm start
```

```bash
# API (needs a MongoDB URI in server/.env)
cd server
cp .env.example .env
npm install
npm run dev
```

The API answers at `http://localhost:4000/api/v1`; `GET /health` reports whether MongoDB is connected.

## Layout

```
src/
  app/                 Routes (Expo Router). Screens and layouts only.
    _layout.tsx        Fonts, providers, signed-in / signed-out gate
    (auth)/            login, verify-otp
    (tabs)/            index (Home), records, ekaay, care, card
  components/          Shared UI: Screen, ThemedText, ThemedView, tab bar
  constants/           theme.ts (brand tokens), plans.ts
  features/            Feature code by area; auth/ holds the session provider
  hooks/
  services/            api.ts (HTTP client), storage.ts (secure storage)
  types/               Shared domain types
assets/                Icons, splash
server/
  src/
    config/            env.ts (validated env), db.ts (MongoDB connection)
    constants/         Domain enums (plans, pod tiers, record types...)
    models/            Mongoose models
    modules/           One folder per API area: auth, members, emergency,
                       records, ekaay, care, family
    middleware/        Error handling
    routes/            Mounts modules under /api/v1
    app.ts, server.ts
docs/PRODUCT.md        What we are building, from the product brochure
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `android` / `web` | Open on a platform |
| `npm run typecheck` | Typecheck the app |
| `npm run server` | Start the API in watch mode |
| `npm run typecheck` (in `server/`) | Typecheck the API |
