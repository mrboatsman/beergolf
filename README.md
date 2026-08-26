# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Docker / deploy

Imagen byggs av GitHub Actions (`.github/workflows/docker.yml`) vid push till `main`
och taggar `v*`, och publiceras till `ghcr.io/mrboatsman/beergolf` (`latest`, branch, sha, semver).

```sh
docker run -d --name beergolf \
  -p 3000:3000 \
  -v beergolf-data:/data \
  -e ORIGIN=https://beergolf.example.se \
  -e STRIPE_SECRET_KEY=sk_live_... \
  -e STRIPE_WEBHOOK_SECRET=whsec_... \
  ghcr.io/mrboatsman/beergolf:latest

# Första admin + teoriprov-frågor (en gång)
docker exec -e ADMIN_EMAIL=du@example.se -e ADMIN_PASSWORD=hemligt beergolf node scripts/seed.ts
```

- Migreringar körs automatiskt vid start (`scripts/migrate.mjs`).
- Seeden ger admin grönt kort nr 1. Konton som seedats med äldre version: Admin → medlemstabellen → **Utfärda grönt kort**.
- `/data` = SQLite-db + uppladdningar; montera som volym.
- `ORIGIN` måste sättas till den publika URL:en (form actions/CSRF bakom proxy).
- Lokalt bygge: `docker build -t beergolf .`
