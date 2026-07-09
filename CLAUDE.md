# Beer Golf™ — klubbsystem

Webbapp för en herrklubbs Beer Golf™: medlemshantering, grönt kort-certifiering,
handikapp och turneringar. Hobbyprojekt, låga volymer.

## Stack

- **SvelteKit** (Svelte 5, runes) + **adapter-node** (self-host på VPS)
- **SQLite** via **Drizzle ORM** + better-sqlite3 (synkron driver)
- **Tailwind CSS v4** (`@theme` i `src/routes/layout.css`)
- Sessioner: token i cookie, sha256 lagras i db. Lösenord: argon2id (`@node-rs/argon2`)
- **jj (Jujutsu)** för versionshantering (colocated med git) — se `jujutsu`-skill före VCS-kommandon

## Kommandon

```
npm run dev            # dev-server
npm run check          # svelte-check (typer)
npm run format         # prettier
npm run build          # produktionsbygge (adapter-node → build/)
npm run db:generate    # generera migration från schema
npm run db:migrate     # applicera migrationer på db
npm run db:seed        # skapa admin + teoriprov-frågor (ADMIN_EMAIL/ADMIN_PASSWORD env)
npm run db:studio      # drizzle studio
```

DB-fil: `./data/beergolf.db` (via `DATABASE_URL` i `.env`, ej i git).

## Grafisk profil ("country club", efter tmp/design.html)

- Mörk skogsgrön sidebar + guld + cream. Tokens i `layout.css`: `club-*` (grönt),
  `gold-*`, `cream-*`, `parchment` (kort). Serif-rubriker: `font-display`
  (Cormorant Garamond via @fontsource).
- Layout: sidebar (desktop) / topbar (mobil) i `+layout.svelte`; nav: Dashboard,
  Enter Scorecard, Rundor, Medlemmar, Admin (staff). Utloggad: enkel centrerad vy.
- Papp-coastern (`/coasters/[id]`) har egen profil: `print`/`ink`/`card`-tokens +
  `font-coaster`/`font-hand` — ändra inte den till club-paletten.
- `beer-*`/`turf-*`-tokens är legacy, används ej i nya vyer.
- Visuell verifiering: puppeteer-core + systemets Chrome (se scratchpad-mönster:
  logga in via curl, skicka session-cookie, screenshot).

## Arkitektur

- `src/lib/server/db/schema.ts` — Drizzle-schema. Tabeller: members, sessions, invites,
  certifications, quiz_questions, quiz_attempts, tournaments, rounds.
- `src/lib/server/auth.ts` — lösenord (argon2), sessioner, cookies. `toSafeMember` droppar hash.
- `src/lib/server/guard.ts` — rollhierarki + `requireMember` / `requireRole`.
  Roller: aspirant < member < fadder < captain < admin.
- `src/lib/handicap.ts` — självjusterande handikapp. Lägre score = bättre.
  Ny medlem HCP 36, justeras per runda mot `nextHcp(hcp, gross, par)` där par är
  coasterns totala par.
- `src/hooks.server.ts` — fyller `locals.member` / `locals.session` per request.

## Konventioner

- **better-sqlite3 är synkront**: `db.transaction()`-callback får INTE vara async.
  Använd sync `.run()`/`.get()` inuti transaktioner.
- Form actions för mutationer (progressive enhancement via `use:enhance`).
- All UI-text på svenska.

## Certifiering (grönt kort, tre delar)

1. Teoriprov (quiz, godkänt ~80 %)
2. Praktiskt prov (provslingan, fadder examinerar, bevis bifogas)
3. Etikett & hänsyn (fadder bedömer löpande)

Klart → numrerat grönt kort + ingångshandicap HCP 36.

## Byggt

- Iteration 1 (fundament): auth, invite-koder (`/join`, fristående koder utan e-post),
  admin (medlemmar + invites).
- Delade virtuella Score Coasters (`/coasters`): 9 hål, egen par-rad (default 4,4,3,4,5,3,4,3,5 = 35),
  max 6 spelare per coaster. Skaparen blir spelare 1; spelare på coastern bjuder in fler.
  Varje spelare fyller sin rad (partiellt OK), signerar när klar → raden låses,
  runda skapas och HCP justeras mot coasterns par. Layout efter fysiska underlägget
  (`tmp/score-coaster.png`).
- **Coastern är enda sättet att registrera rundor** — `/rounds` är ren historik.
- Dashboard (`/`, komponent `MemberDashboard.svelte`, data `src/lib/server/dashboard.ts`):
  HCP-hero med säsongsförändring, statkort (rundor/bästa brutto/snitt mot par),
  HCP-trendgraf (`HcpTrend.svelte`, ren SVG), matcher (pågående/avslutade coasters),
  senaste rundor. Alla medlemmar kan se varandras dashboards: `/members` → `/members/[id]`.

## Kvar att bygga

- Teoriprov-quiz-flöde (`quiz_questions`/`quiz_attempts` finns)
- Certifieringsflöde för fadder (godkänn de tre delarna → utfärda grönt kort + membernr)
- Turneringar (leaderboard, koppla rundor/coasters)
