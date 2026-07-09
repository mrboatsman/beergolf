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

- Teoriprov (`/quiz`): aktiva frågor i slumpad ordning (facit stannar på servern),
  rättas server-side, godkänt vid ≥80 %. Försök sparas i `quiz_attempts`; första
  godkända bokförs på `certifications.theoryPassed`. Admin hanterar frågor
  (skapa/inaktivera/ta bort) på `/admin`.
- Underkänt visar felen med facit i resultatvyn (lära sig rätt, inte klicka rätt) +
  knappen "Jag har lärt mig läxan — autorätta": godkänner teorin på heder
  (`certifications.theoryAutoPassed`), misslyckade försök står kvar i historiken och
  visas öppet i profilen (dashboard-sektionen Teoriprov, badge "Autorättat på heder").

- **Certifieringsgate (kritisk)**: aspiranter (status `aspirant`) är utelåsta från allt
  utom `/certification`, `/quiz` och `/logout` — hårt i `hooks.server.ts`, redirect 303.
  Nav visar bara Grönt Kort + Teoriprov för aspiranter. Aspiranter kan inte läggas på coasters.
- Certifiering (`/certification`, logik i `src/lib/server/certification.ts`): aspiranten ser
  sina tre delar; certifierade medlemmar (vem som helst, inte bara rollen fadder) examinerar
  aspiranter — godkänner praktiskt prov med omdöme (kommentar) och bevis samt etikett.
  **Praktiskt prov kräver minst en bild/film** (server-side + required i UI) — missat bevis
  = rekonstruera situationen. Etikett godkänns via bekräftelsemodal som listar kriterierna
  (`src/lib/etiquette.ts`, `ETIQUETTE_CRITERIA`); aspiranten ser samma kriterier i Del 3-kortet
  när teoriprovet är inlämnat (≥1 försök eller godkänt). När alla tre delar är klara utfärdas
  grönt kort automatiskt (`maybeIssueGreenCard`): nästa medlemsnummer, status→active,
  role aspirant→member, HCP 36.
- Fil-lagring: `src/lib/server/storage.ts` — interface `FileStorage`, `STORAGE_DRIVER=fs`
  (dev, skriver till `UPLOAD_DIR`, default ./data/uploads) eller `s3` (produktion — drivern
  är en stub som ska implementeras med @aws-sdk/client-s3). Bevis i `certification_proofs`
  (storageKey/contentType/size), serveras auth-skyddat via `/files/[...key]` (nyckel måste
  finnas i db — ingen path traversal). `BODY_SIZE_LIMIT` i .env höjer adapter-nodes
  body-gräns för videouppladdning; max 200 MB/fil valideras i actionen.

## Kvar att bygga

- Turneringar (leaderboard, koppla rundor/coasters)
