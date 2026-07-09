# Beer Golf™ — klubbsystem

Webbapp för en herrklubbs Beer Golf™: medlemshantering, grönt kort-certifiering,
handikapp och turneringar. Hobbyprojekt, låga volymer.

## Stack

- **SvelteKit** (Svelte 5, runes) + **adapter-node** (self-host på VPS)
- **SQLite** via **Drizzle ORM** + better-sqlite3 (synkron driver)
- **Tailwind CSS v4** (`@theme` i `src/routes/layout.css`, palett `beer-*` / `turf-*`)
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

## Arkitektur

- `src/lib/server/db/schema.ts` — Drizzle-schema. Tabeller: members, sessions, invites,
  certifications, quiz_questions, quiz_attempts, tournaments, rounds.
- `src/lib/server/auth.ts` — lösenord (argon2), sessioner, cookies. `toSafeMember` droppar hash.
- `src/lib/server/guard.ts` — rollhierarki + `requireMember` / `requireRole`.
  Roller: aspirant < member < fadder < captain < admin.
- `src/lib/handicap.ts` — självjusterande handikapp. Lägre score = bättre.
  Ny medlem HCP 36, justeras per runda mot `nextHcp()`.
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

## Byggt (iteration 1 — fundament)

Auth, invite-koder (`/join`), admin (medlemmar + invites), rundor/Score Coasters (`/rounds`)
med handikappjustering. Schema för certifiering/quiz/turneringar finns men saknar UI ännu.

## Kvar att bygga

- Teoriprov-quiz-flöde (`quiz_questions`/`quiz_attempts` finns)
- Certifieringsflöde för fadder (godkänn de tre delarna → utfärda grönt kort + membernr)
- Turneringar (leaderboard, koppla rundor)
- Snyggare virtuell Score Coaster-layout (inspiration: beergolf.shop)
