# HealthMatrix

The HealthMatrix member app: your records, the Ekaay.AI companion, doctors, screening pods and an
emergency QR card in one place. Product notes are in [docs/PRODUCT.md](docs/PRODUCT.md).

- **App** — React Native, Expo SDK 57, Expo Router, TypeScript (this folder)
- **API** — Expo Router API routes ([`src/app/api/`](src/app/api)) with Mongoose 9, deployed with the app on EAS Hosting
- **Database** — MongoDB

## Run it

```bash
npm install
npm start
```

Put `MONGODB_URI` in `.env.local` first (see the comments there). The API is served by the same
dev server at `http://localhost:8081/api/v1`; `GET /health` reports whether MongoDB is connected.

## Deploy

The app's web build and the API deploy together to EAS Hosting:

```bash
npx eas-cli@latest env:create --name MONGODB_URI --value "<uri>" --environment production --visibility secret
npx expo export --platform web
npx eas-cli@latest deploy --prod
```

Then set the deployed URL as the API origin for phone builds, in `app.json`:
`"plugins": [["expo-router", { "origin": "https://<your-app>.expo.app" }], ...]`.

## Layout

```
src/
  app/                 Routes (Expo Router). Screens and layouts only.
    _layout.tsx        Fonts, providers, signed-in / signed-out gate
    (auth)/            login, verify-otp
    (tabs)/            index (Home), records, ekaay, care, card
    api/v1/            API routes (*+api.ts), run on the server only
  components/          Shared UI: Screen, ThemedText, ThemedView, tab bar
  constants/           theme.ts (brand tokens), plans.ts
  features/            Feature code by area; auth/ holds the session provider
  hooks/
  services/            api.ts (HTTP client), storage.ts (secure storage)
  server/              Server-only code for the API routes: env, db, models, errors
  types/               Shared domain types
assets/                Icons, splash
docs/PRODUCT.md        What we are building, from the product brochure
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `android` / `web` | Open on a platform |
| `npm run typecheck` | Typecheck the app |
