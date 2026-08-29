# Beer Golf™ — klubbsystem

Webbapp för en herrklubbs Beer Golf™: medlemshantering, grönt kort-certifiering,
handikapp och turneringar. Hobbyprojekt, låga volymer.

## Stack

- **SvelteKit** (Svelte 5, runes) + **adapter-node** (self-host på VPS)
- **SQLite** via **Drizzle ORM** + better-sqlite3 (synkron driver)
- **Tailwind CSS v4** (`@theme` i `src/routes/layout.css`)
- Sessioner: token i cookie, sha256 lagras i db. Lösenord: argon2id (`@node-rs/argon2`).
  **Passkeys** (WebAuthn, `@simplewebauthn`): tabell `passkeys`, logik i
  `src/lib/server/passkeys.ts` (RP-id = request-hostname, challenge i httpOnly-cookie
  `pk_challenge`), endpoints `/api/passkey/register` (GET options/POST verify, inloggad) och
  `/api/passkey/login` (öppen; POST skapar session). Discoverable credentials → "Logga in med
  passkey" på `/login` utan e-post.
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

## Deploy

- `Dockerfile` (multistage, node:22-bookworm-slim, `/data`-volym för db+uploads, migrerar
  vid start via `scripts/migrate.mjs`, `ORIGIN` krävs i runtime). `.github/workflows/docker.yml`
  bygger och pushar till `ghcr.io/mrboatsman/beergolf` på push till main / `v*`-taggar.
  Första admin i container: `docker exec ... node scripts/seed.ts`. Se README.

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
  max 6 spelare per coaster. **Grönt kort krävs för att spela**: skapa coaster (skaparen blir
  spelare 1) och läggas till kräver `greenCardIssuedAt` — sökfältet visar bara medlemmar med
  kort. Spelare läggs till via namnsök högst upp på sidan; alla på coastern kan ta bort en
  ej signerad spelare (✕ vid namnet).
  Varje spelare fyller sin rad (partiellt OK), signerar när klar → raden låses,
  runda skapas och HCP justeras mot coasterns par. Layout efter fysiska underlägget
  (`tmp/score-coaster.png`).
- **Poängmodell** (`src/lib/scoring.ts`): per hål `null` = ej spelat, `0` = **x** (OB, räknas som
  2 × par), 1–9 = slag. Brutto räknas ALLTID mot coasterns par via `grossTotal`/
  `grossTotalComplete` — summera aldrig scores rakt av. Vid signering blir tomma hål x
  (`fillMissingWithX`, bekräftelsedialog i UI); `rounds.scores` lagrar också 0 för x.
  Inmatning: `0` eller bokstav → x (`parseScore`); admin tillåter 1–30/x (`parseScoreAdmin`).
- Poängfält på coastern (medlem + gäst) använder `use:scoreInput` (`src/lib/score-input.ts`):
  ett tecken (1–9, 0/bokstav = x), numeriskt tangentbord, auto-hopp till nästa hål, backspace i
  tomt fält går bakåt. Admin-rättning tillåter 1–30 och x.
- **Autospar + live**: ingen spara-knapp. Egen rad hålls i lokalt state (`myScores`, dirty-flagga)
  och autosparas debounced via `?/saveScores` med `createAutosave` (`src/lib/live-coaster.ts`,
  fetch mot form action + `deserialize`). Blur-flush fördröjs ett tick (auto-hoppet blurrar före
  Svelte-handlern). Live: `src/lib/server/live.ts` (in-memory EventEmitter, **en replika**),
  mutationer anropar `notifyCoaster(id)`, SSE på `/coasters/[id]/events` och
  `/t/[slug]/gast/[token]/events`; klienten `invalidate('coaster:<id>')` / `'guest:rows'`.
  Servern skriver bara över lokalt state när inget osparat finns. Klick på pappen → fokus på
  första tomma hålet. OBS: puppeteer-tester måste använda `waitUntil: 'load'` (SSE håller
  anslutningen öppen så `networkidle0` timar ut).
- **Vinnarmärke**: när alla (≥2) signerat räknas lägst netto (`players[].net` från
  `rounds.netTotal`, gäst = brutto − playingHcp) → guldsigill över vimpeln + rad under titeln;
  delad seger vid lika netto.
- **Avslutad coaster = visningsläge**: när alla (≥2) signerat döljs regler och lägg-till-spelare.
  Påskägg: klick på pappen flippar den (CSS 3D, `flipped`) → baksida lika stor som coastern.
  `CoasterBack.svelte` (kortytan) + `CoasterBackToolbar.svelte` (verktyg utanför kortet) delar
  `BackEditor` (`src/lib/back-editor.svelte.ts`, $state-klass: mode draw/images, färg, storlek,
  vald bild, status). Logiskt koordinatsystem: bredd 1200, höjd = kortets proportion på enheten,
  allt förankrat uppe till vänster (ingen förvrängning; kortare skärm klipper). Bilder i tabell
  `coaster_back_images` (x/y = centrum, scale 1 = 600 px bred, rotation°, z), lagras via storage
  under `coasters/<id>/`, serveras via `/files/`. Drag = flytta, pinch = skala+rotera (två pekare),
  desktop-knappar ±15°/±15 %, vald bild läggs överst. Ritning = canvas över hela kortet, sparas
  som transparent PNG (`coasters.backDrawingKey`) efter penseldrag. Bara deltagare redigerar
  (`backEditGuard`, max 12 bilder à 10 MB), övriga ser. **Låses 2 dagar efter sista signaturen**
  (`backLockAt`, `BACK_EDIT_WINDOW_MS`; load returnerar `backLocked`/`backLockAt`, UI visar datum). Baksidan har `data-no-flip`; vänd
  tillbaka via knapp.
- **Galleri** (`/gallery`, nav-länk "Galleri"): rutnät (kvadratiska kort) med baksidorna på alla
  färdigspelade coasters (`CoasterBackView.svelte` = read-only-renderare av bilder + ritning-PNG,
  samma logiska koordinater). Fullskärmsvisare: tryck/Enter vänder kortet (3D-flip) till samma
  papp-coaster som på `/coasters/[id]`, svep/piltangenter/knappar bläddrar (wrap-around), Esc
  stänger. Pappret är extraherat till `CoasterPaper.svelte` (props coaster/players/winners,
  snippets `cell`/`remove` för redigerbart läge på coaster-sidan; galleriet skickar inga).
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
  (`certifications.theoryAutoPassed`), misslyckade försök står kvar i historiken.
- Bevis i certifieringsmodalen: kvadratiska thumbnails (film = första bildrutan + ▶) som öppnar
  `ProofLightbox.svelte` (helskärm z-70, bild/video, svep/pilar, stäng med ✕/Esc/kort tryck,
  safe-area). Ingen `target=_blank` — skulle öppna Safari ur PWA:n.
- Profilen (dashboard) visar Grönt Kort-kortet (som på /certification) med en (i)-knapp
  i hörnet → modal "Certifieringsunderlag": teoriprov-resultat + försökshistorik
  (inkl. "Autorättat på heder"-badge), fadderns omdöme och bevismaterialet.
  Ej certifierad: statuskort ("Under certifiering — x av 3" / "urmedlem").

- **Certifieringsgate (kritisk)**: aspiranter (status `aspirant`) är utelåsta från allt
  utom `/certification`, `/quiz` och `/logout` — hårt i `hooks.server.ts`, redirect 303.
  Nav visar bara Grönt Kort + Teoriprov för aspiranter. Aspiranter kan inte läggas på coasters.
- Certifiering (`/certification`, logik i `src/lib/server/certification.ts`): aspiranten ser
  sina tre delar; certifierade medlemmar (vem som helst, inte bara rollen fadder) examinerar
  aspiranter — godkänner praktiskt prov med omdöme (kommentar) och bevis samt etikett.
  Aspirantlistan har namnfilter. Den som godkänner en aspirant uppgraderas automatiskt
  member→fadder (captain/admin behåller sin roll); admin visar fadderträdet som interaktiv
  d3-visualisering (`FadderTree.svelte`: d3-hierarchy-layout, zoom/pan, namnsök → visar bara
  medlemmens relaterade träd = fadder-kedjan uppåt + skyddslingar neråt, skalar till 1000+).
  Träd-logiken (ren, delad server/klient) i `src/lib/fadder-tree.ts`: `buildFadderTree`,
  `flattenForest`, `focusForest` — relationerna kommer från `certifications.fadderId`.
  Trädet har fit-to-view-start, dynamiska zoomgränser, "Anpassa vy" och fullskärmsläge.
- **Bjud in** (`/invite`, nav-länk för alla med grönt kort, kräver rollen member+): medlemmen
  skapar egna invalskoder (aspirant, 30 dagar, max 10 öppna), kopierar/delar länken
  `/join?code=…`, ser status per kod och kan ta bort oanvända. Vid inlösen i `/join` skapas
  `certifications`-raden med `fadderId = invites.createdBy` och inbjudaren uppgraderas
  member→fadder (captain/admin behåller roll). Examinatorn skriver inte över befintlig fadder
  (`fadderId: cert.fadderId ?? me.id`). Admin-listan över koder visar "Skapad av" + sök på skapare.
- **Utskrift av invalskort** (`/invite/print`, member+): 85×55 mm, 4 per A4, framsidor + speglade
  baksidor med QR (`qrcode`, SVG) för dubbelsidig utskrift; `?codes=A,B` väljer, annars alla egna
  öppna koder; bara egna (captain+ allas), max 40. Komponent `InviteCards.svelte` (egen CSS,
  `@page` A4 utan marginal), sidan döljer app-skalet med `@media print`. PDF = webbläsarens
  "Spara som PDF". Länkar: `/invite` ("Skriv ut kort" + per kod), admin-kodlistan (per öppen kod).
- **FAQ** (`/faq`, nav-länk, member+): innehåll i `src/lib/faq.ts` (`buildFaq(vars)`), servern
  skickar riktiga konstanter (HCP-start/faktor/gränser, min/max spelare, par) + räkneexempel via
  `nextHcp()`. Regelsektionen renderar `<CoasterRules open />` — regeltext bara i `rules.ts`.
- **Fadder-att-göra**: `getPendingAspirantsFor(fadderId)` (certification.ts) = aspiranter med
  `certifications.fadderId = jag` som ännu är aspirant, med `missing[]`. Visas som kort överst på
  egen dashboard ("Dina aspiranter väntar", länk `/certification?aspirant=<id>` för bevis +
  godkännande), antal som badge på "Grönt Kort" i sidebar/sheet och på Meny-fliken
  (`data.pendingAspirants` från root-layout-load).
- Listor är paginerade + filtrerbara (server-side, GET-params): `/members` (q/page,
  namn eller e-post), admin-medlemmar (mq/mpage) och invalskoder (iq/ipage — sök på kod
  eller medlemsnamn; kolumnen "Blev medlem" länkar till profilen som koden skapade).
- **Säsonger** (`src/lib/season.ts` ren logik, `src/lib/server/seasons.ts`): start månad/dag i
  `club_settings` (admin → Säsong, default 1 jan), etikett "2026" eller "2026/27". Leaderboard och
  dashboard använder `currentSeason()`-gränser; leaderboarden rankar bara medlemmar med ≥1 runda i
  säsongen (övriga orankade "–" efteråt) ⇒ ny säsong = ny leaderboard, HCP löper vidare.
  Avslutade säsonger: `/history` + `/history/[label]` (`getSeasonArchive`: beräknas via
  `computeSeasonStats` första gången efter säsongsslut, cachas i `season_archives` som JSON;
  ändrad säsongsstart kastar cachen). Statistik: slutställning (HCP vid säsongsslut = sista
  rundans hcpAfter), vinnare, bästa fadder (certifiedAt i säsongen), flest rundor/vinster,
  störst HCP-sänkning, bästa brutto/netto, nya gröna kort/konton.
- `/members` är kombinerad **Leaderboard + medlemslista** (nav-etikett "Leaderboard"):
  rankad på HCP (lägst bäst), global rank via korrelerad subquery. OBS: skriv
  `members.hcp` som literal text i sql-templaten — drizzle-interpolation av kolumner
  inuti korrelerade subqueries renderas okvalificerat och binder till fel tabell.
  Kolumner: grönt kort-nr, rundor i år, bästa brutto. 🏆 på (delad) förstaplats.
- Fake-data: `npm run db:seed:fake` skapar 1000 medlemmar i fadderträd (5–10 nivåer,
  superfaddrar, djupa kedjor; allt märkt @fake.beergolf). `-- --clean` tar bort dem.
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

- **Utfärda grönt kort** (admin, i medlemstabellen, action `issueGreenCard` →
  `issueGreenCardDirect` i certification.ts): utan prov, alla delar bokförs godkända på heder,
  nästa lediga kortnummer. Seeden (`db:seed`) ger admin kort automatiskt (urmedlem).
- **Redigera medlem** (admin, modal i medlemstabellen, action `updateMember`): namn, e-post,
  roll, HCP (0–54) och kort-nr; unika e-post/kort-nr valideras; egen roll kan inte ändras.
- **Profilbild**: `members.avatarKey` (egen, JPEG 320×320 via klientbeskärare
  `AvatarCropper.svelte`: dra/nyp/zoom i cirkel) och `members.gravatar` (default på). Upplösning i
  `src/lib/server/avatar.ts` (`avatarUrl`: egen > Gravatar sha256(e-post), `d=404` > null) — räknas
  på servern så e-post aldrig går till klienten; `Avatar.svelte` faller tillbaka på initialer vid
  404/null. Används i sidebar/sheet (layout), leaderboard, dashboard-huvud. Inställningar:
  ladda upp/byt/ta bort egen bild, Gravatar-toggle (`setGravatar`, `uploadAvatar`, `removeAvatar`).
  Filer under `avatars/<memberId>/`, serveras via `/files/` (lookup i members).
- Kontoåtgärder i admin (endast rollen admin, ej på sig själv): **Återställ lösenord**
  (engångslösenord visas en gång; `members.mustChangePassword` tvingar byte via
  hooks-redirect till `/password`), **Inaktivera/Aktivera** (inactive kan inte logga in,
  levande sessioner dödas i hooks), **Anonymisera (GDPR, oåterkallelig)** — namn/e-post
  ersätts, lösenord+sessioner raderas, bevismedia tas bort ur lagringen och fadderns
  omdöme rensas; spelhistorik behålls som klubbstatistik. `/settings` (Inställningar, länk i användarkortet;
  `/password` → 301) = passkeys (lägg till/ta bort) + byt eget lösenord (loggar ut övriga
  sessioner). Framtida profilinställningar hör hemma här.
- **Admin: Score Coasters** (`/admin/coasters`, endast rollen admin, logik i
  `src/lib/server/coaster-admin.ts`): sök på coaster-/spelar-/turneringsnamn (q/page),
  detaljsida `/admin/coasters/[id]`: byt namn, rätta poäng på valfri rad (även signerad),
  häv signatur, ta bort spelare, ta bort hela coastern. Allt som rör signerade
  medlemsrader spelar om medlemmens HCP-kedja från `ENTRY_HCP` (36) i kronologisk ordning
  (`recomputeMemberHcp`, par från coastern via coaster_players.roundId). Gästrader rör
  aldrig rounds/HCP. Matchresultat avgörs inte om automatiskt vid rättning.
- Regeltext i `src/lib/rules.ts` (`RULES`, sektioner Spelet / Räkning & signatur / Etikett),
  visas hopfällbart (`CoasterRules.svelte`) ovanför coastern på `/coasters/[id]`.
- **Web Push** (`src/lib/server/push.ts`, `web-push` + VAPID från .env `VAPID_PUBLIC_KEY/
PRIVATE_KEY/SUBJECT`; saknas → `isPushEnabled()=false`, no-op): tabell `push_subscriptions`
  (en per enhet), API `/api/push/public-key|subscribe|unsubscribe` (öppna i hooks-gaterna),
  service worker hanterar `push` (payload `{title, body, url, tag}`) + `notificationclick`
  (fokusera/navigera). `sendPush(memberIds, payload)` fire-and-forget (`void sendPush(...)` i
  actions), rensar döda prenumerationer (404/410). Händelser hittills: inbjuden skapar konto →
  faddern (`/join`), tillagd på coaster → medlemmen (`addPlayer`). Inställningar → Notiser:
  slå på/av per enhet, testnotis, enhetslista. iOS kräver installerad PWA (hemskärm).
- **PWA**: `static/manifest.webmanifest` + ikoner i `static/icons/` (genererade från
  `src/lib/assets/logo.png` med sips; maskable = logo på club-800), meta/länkar i `src/app.html`,
  service worker `src/service-worker.ts` (auto-registrerad av SvelteKit): app-skalet (build +
  static) cache-first, navigeringar network-first med inbyggd offline-sida, data/`/files/`
  cachas aldrig. Kräver HTTPS i produktion för installation.
- **Installera som app**: `app.html` fångar `beforeinstallprompt` tidigt (`window.__bgInstallPrompt`),
  `src/lib/pwa-install.svelte.ts` (`pwaInstall`: canPrompt/installed/platform, `prompt()`),
  `InstallPwaButton.svelte` = native prompt där den finns, annars instruktionsmodal per plattform
  (iOS Safari/iOS annan/Android/desktop). Används i Inställningar ("App på hemskärmen") och
  välkomstmodalen.
- Mobil (<lg): topbaren har bara logo/titel. Fast bottennav med ikoner: Hem, Coasters,
  Leaderboard, Bjud in, Meny (aspiranter: Grönt Kort, Teoriprov, Meny). "Meny" öppnar
  en bottom sheet (fly-transition) ovanför navet med användarkort + hela navlistan, stängs
  vid navigering/klick utanför;
  safe-area-padding (`viewport-fit=cover`), footern har pb-24 så innehåll inte döljs.
  Coaster-tabellen och leaderboarden ryms på 390 px: kortnamn "Förnamn E." via
  `src/lib/names.ts` (`shortName`) under `sm`, leaderboarden döljer Grönt Kort/Bästa brutto.
- Signering kräver minst `MIN_COASTER_PLAYERS` (2) spelare på coastern — man spelar inte ensam.
- **Välkomstmodal** (`WelcomeModal.svelte`, på egen dashboard när `greenCardIssuedAt` satt och
  `members.welcomeSeenAt` null): gratulation, tips (coasters/bjud in/leaderboard), profilbild via
  `AvatarCropper` → `/settings?/uploadAvatar`, PWA-installation (`beforeinstallprompt`-knapp,
  iOS-instruktion), knapp "Slå ut! ⛳" → `?/dismissWelcome` på `/` stämplar → aldrig igen.
- **Notisfråga i PWA** (`PushPromptModal.svelte` i root-layout): visas EN gång per enhet, bara i
  standalone-läge, bara om tillstånd ej beslutat och ingen prenumeration; localStorage
  `bg:push-asked`. Aldrig i vanlig webbläsare (Inställningar → Notiser istället). Klientlogik för
  push delad i `src/lib/push-client.ts` (`enablePush`, `disablePush`, `shouldShowPushPrompt`).
- Profilens HCP-kort visar global leaderboard-placering ("#N av M", länkad till /members).

- **Turneringar = välgörenhetsinsamlingar** (`/tournaments`, logik i
  `src/lib/server/tournaments.ts`): innan öppning deklareras välgörenhet,
  anmälningsavgift och prisupplägg (inga/fasta/procent av potten, max 3 nivåer).
  Alla belopp i heltal **ören** (`src/lib/money.ts`: formatKr/parseKr).
  Livscykel draft→open→finished (+cancelled); avgift/priser/synlighet/format
  låses vid open. Skapas av captain+; captain-panelen bor på detaljsidan.
  - **Format**: `stroke` (slagspel — netto-leaderboard, brutto-flik vid sidan av;
    en coaster-rad per deltagare) eller `match` (cup: slumpad lottning med byes i
    `tournament_matches`, vinnare i (round,slot) → (round+1, floor(slot/2)); egen
    matchcoaster per match, lägst netto vinner när båda signerat
    (`maybeDecideMatch` anropas från båda sign-flödena), captain kan sätta vinnare
    manuellt; `MatchBracket.svelte` visualiserar stegen med finalen/mästaren i mitten).
  - **Synlighet**: open (alla medlemmar), closed (captain bjuder in via namnsök),
    public (helt publik sida `/t/[slug]` — gäster anmäler sig utan konto).
  - **Betalning**: Stripe Checkout (`src/lib/server/stripe.ts`, lazy init;
    STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET i .env). Webhook
    `/api/stripe/webhook` (signaturverifierad, idempotent) + success-fallback på
    `?session_id` om webhooken tappas — båda via `settleCheckoutSession` som även
    hämtar faktisk Stripe-avgift (balance transaction). Gratis turnering → paid
    direkt (`paidVia: 'free'`); captain kan markera manuellt betald (kontant) och
    markera återbetald (själva återbetalningen görs i Stripe-dashboarden).
  - **Gäster** (publika turneringar): självdeklarerat HCP (default 36, clamp 0–54),
    bearer-tokenlänk `/t/[slug]/gast/[token]` för egen scoreinmatning.
    **INVARIANT: gästrader skapar aldrig rounds och rör aldrig members.hcp** —
    gästresultat bor i `coaster_players.scores` + `signedAt` (memberId null,
    participantId satt). `/t` + `/api/stripe` är öppna i hooks-gaterna.
  - **Transparensrapport** (`getReport`): intäkter − Stripe-avgifter − kostnadsbok
    (`tournament_expenses`, kvittobilder via storage) − priser = till välgörenhet;
    utbetalning markeras manuellt (avvikelse ⇒ varning, blockerar ej). Medlemsvyn
    visar kvittolänkar; publika vyn (`/t/[slug]`) visar bara siffror, aldrig
    e-post. Delad komponent `TournamentReport.svelte`.
  - Turneringscoasters: `coasters.tournamentId` sätts vid skapande (från
    turneringssidan, standardpar för jämförbart brutto), kopieras till
    `rounds.tournamentId` vid signering; medlemsrundor justerar HCP som vanligt.
    `coaster_players.memberId` är nullable (gästrad) + `participantId`; unik per
    (coasterId, participantId) — slagspel håller en-rad-per-deltagare i appkod.

## Kvar att bygga

- (tomt — säg till när nästa idé kommer)
