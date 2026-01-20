# Harmony Hub

React + Vite + TypeScript + Supabase app for provider-first music playback.

## Environment & secrets

- Copy `.env.example` to `.env` for local dev and fill the public Vite vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Do **not** commit secrets.
- Keep server-only secrets out of Vite. Set these in your hosting/Supabase function secrets: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `APP_REDIRECT_SUCCESS`, `APP_REDIRECT_ERROR`, and optional `VITE_YOUTUBE_API_KEY` for YouTube Data API.
- GitHub Actions CI expects secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (and optional `VITE_YOUTUBE_API_KEY`). Add them under repo Settings → Secrets → Actions.

## Local development

```sh
npm install
npm run dev
```

## Build / test

```sh
npm run build
npm test
```

## CI

GitHub Actions workflow `.github/workflows/ci.yml` checks out the repo, installs deps, and runs `npm run build` using the Vite env secrets from repository secrets.
