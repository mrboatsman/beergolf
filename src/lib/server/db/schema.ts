import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// --- Roller ---------------------------------------------------------------
// aspirant  = under upplärning, ej grönt kort
// member    = certifierad medlem med grönt kort
// fadder     = får examinera aspiranter (praktiskt + etikett)
// captain    = klubbmästare, håller i turneringar
// admin      = full åtkomst (skapa medlemmar, invites, allt)
export type Role = 'aspirant' | 'member' | 'fadder' | 'captain' | 'admin';

// Ingångshandicap för nya certifierade medlemmar
export const START_HCP = 36;

export const members = sqliteTable('members', {
	id: text('id').primaryKey(), // uuid
	memberNumber: integer('member_number'), // sätts vid certifiering (grönt kort-nr)
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash'), // null tills aspiranten satt lösenord
	// true efter admin-återställning: engångslösenordet måste bytas vid inloggning
	mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
	role: text('role').$type<Role>().notNull().default('aspirant'),
	status: text('status').$type<'aspirant' | 'active' | 'inactive'>().notNull().default('aspirant'),
	hcp: real('hcp').notNull().default(START_HCP),
	greenCardIssuedAt: integer('green_card_issued_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(), // sha256 av token
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Engångskoder för invald (skapade av admin/captain)
export const invites = sqliteTable('invites', {
	id: text('id').primaryKey(),
	code: text('code').notNull().unique(), // slumpad kort kod, delas med aspiranten
	role: text('role').$type<Role>().notNull().default('aspirant'),
	createdBy: text('created_by').references(() => members.id),
	usedBy: text('used_by').references(() => members.id),
	usedAt: integer('used_at', { mode: 'timestamp' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Passkeys (WebAuthn): inloggning utan lösenord. id = credentialID (base64url).
export const passkeys = sqliteTable('passkeys', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	publicKey: text('public_key').notNull(), // base64url
	counter: integer('counter').notNull().default(0),
	transports: text('transports', { mode: 'json' }).$type<string[]>(),
	deviceType: text('device_type'), // singleDevice | multiDevice
	backedUp: integer('backed_up', { mode: 'boolean' }).notNull().default(false),
	name: text('name').notNull(), // användarens etikett, ex "iPhone"
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
});

// Certifiering av grönt kort — de tre delarna
export const certifications = sqliteTable('certifications', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	fadderId: text('fadder_id').references(() => members.id), // examinator
	// Del 1 – Teoriprov
	theoryPassed: integer('theory_passed', { mode: 'boolean' }).notNull().default(false),
	theoryScore: real('theory_score'), // andel rätt 0..1
	theoryAt: integer('theory_at', { mode: 'timestamp' }),
	// Godkänt via "jag har lärt mig läxan" efter underkänt försök —
	// hederssystemet: det handlar om att lära sig rätt, inte klicka rätt.
	theoryAutoPassed: integer('theory_auto_passed', { mode: 'boolean' }).notNull().default(false),
	// Del 2 – Praktiskt prov (provslingan)
	practicalPassed: integer('practical_passed', { mode: 'boolean' }).notNull().default(false),
	practicalComment: text('practical_comment'), // fadderns omdöme
	practicalAt: integer('practical_at', { mode: 'timestamp' }),
	// Del 3 – Etikett & hänsyn
	etiquettePassed: integer('etiquette_passed', { mode: 'boolean' }).notNull().default(false),
	// Slutförande
	certifiedAt: integer('certified_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Bevis för praktiska provet: video/bilder uppladdade av faddern.
// Lagras via storage-abstraktionen (fs i dev, S3 i produktion) — storageKey
// är nyckeln i respektive backend.
export const certificationProofs = sqliteTable('certification_proofs', {
	id: text('id').primaryKey(),
	certificationId: text('certification_id')
		.notNull()
		.references(() => certifications.id, { onDelete: 'cascade' }),
	storageKey: text('storage_key').notNull().unique(),
	filename: text('filename').notNull(), // ursprungligt filnamn
	contentType: text('content_type').notNull(),
	size: integer('size').notNull(),
	uploadedBy: text('uploaded_by').references(() => members.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// --- Teoriprov (quiz) -----------------------------------------------------
export const quizQuestions = sqliteTable('quiz_questions', {
	id: text('id').primaryKey(),
	question: text('question').notNull(),
	options: text('options', { mode: 'json' }).$type<string[]>().notNull(),
	correctIndex: integer('correct_index').notNull(),
	category: text('category')
		.$type<'regler' | 'säkerhet' | 'historia'>()
		.notNull()
		.default('regler'),
	active: integer('active', { mode: 'boolean' }).notNull().default(true)
});

export const quizAttempts = sqliteTable('quiz_attempts', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	score: real('score').notNull(), // andel rätt 0..1
	passed: integer('passed', { mode: 'boolean' }).notNull(),
	// frågeId → valt alternativ-index
	answers: text('answers', { mode: 'json' }).$type<Record<string, number>>().notNull(),
	takenAt: integer('taken_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// --- Turneringar ----------------------------------------------------------
// Turneringar är klubbens välgörenhetsinsamlingar: innan en turnering öppnas
// deklareras välgörenhet, anmälningsavgift och prisupplägg. Alla belopp
// lagras i heltal ören. Efter avslut publiceras en transparensrapport
// (intäkter − Stripe-avgifter − kostnader − priser = till välgörenhet).
//
// Synlighet: open   = alla certifierade medlemmar kan anmäla sig
//            closed = captain bjuder in utvalda medlemmar
//            public = egen publik sida (/t/[slug]) där gäster utan
//                     medlemskap anmäler sig och betalar
//
// Format: stroke = slagspel, alla mot hela startfältet, lägst netto vinner
//         match  = matchspel/cup, slumpad lottning, 1 mot 1 per omgång,
//                  vinnaren går vidare (tournament_matches)
export type PrizeTier = { place: number; label?: string; amountOre?: number; percent?: number };

export const tournaments = sqliteTable('tournaments', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	slug: text('slug').unique(), // krävs (a-z0-9-) när visibility = 'public'
	format: text('format').$type<'stroke' | 'match'>().notNull().default('stroke'),
	visibility: text('visibility').$type<'open' | 'closed' | 'public'>().notNull().default('open'),
	status: text('status')
		.$type<'draft' | 'open' | 'finished' | 'cancelled'>()
		.notNull()
		.default('draft'),
	startsAt: integer('starts_at', { mode: 'timestamp' }),
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	// Välgörenhet — måste vara satt innan turneringen öppnas
	charityName: text('charity_name'),
	charityDescription: text('charity_description'),
	charityUrl: text('charity_url'),
	// Avgift & priser — låses när turneringen öppnas
	entryFeeOre: integer('entry_fee_ore').notNull().default(0),
	prizeMode: text('prize_mode').$type<'none' | 'fixed' | 'percent'>().notNull().default('none'),
	prizes: text('prizes', { mode: 'json' })
		.$type<PrizeTier[]>()
		.notNull()
		.default(sql`'[]'`),
	// Utbetalning till välgörenheten — markeras manuellt av captain
	charityPaidOre: integer('charity_paid_ore'),
	charityPaidAt: integer('charity_paid_at', { mode: 'timestamp' }),
	charityReceiptKey: text('charity_receipt_key'),
	charityReceiptType: text('charity_receipt_type'),
	charityReceiptName: text('charity_receipt_name'),
	openedAt: integer('opened_at', { mode: 'timestamp' }),
	finishedAt: integer('finished_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Deltagare: medlem XOR gäst (memberId null = gäst; valideras i appkod).
// playingHcp är ett snapshot vid anmälan (gäster självdeklarerar, default 36)
// — leaderboarden påverkas inte av att medlemmens HCP ändras under spel.
// status: invited = inbjuden till stängd turnering, ej anmäld/betald
//         pending = anmäld, väntar på Stripe-betalning
//         paid    = betald (stripe/manual/free)
//         refunded = återbetald — exkluderas ur rapport och leaderboard
export const tournamentParticipants = sqliteTable(
	'tournament_participants',
	{
		id: text('id').primaryKey(),
		tournamentId: text('tournament_id')
			.notNull()
			.references(() => tournaments.id, { onDelete: 'cascade' }),
		memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
		guestName: text('guest_name'),
		guestEmail: text('guest_email'),
		guestToken: text('guest_token').unique(), // bearer-länk till gästens spelsida
		playingHcp: real('playing_hcp').notNull(),
		status: text('status')
			.$type<'invited' | 'pending' | 'paid' | 'refunded'>()
			.notNull()
			.default('pending'),
		paidVia: text('paid_via').$type<'stripe' | 'manual' | 'free'>(),
		amountPaidOre: integer('amount_paid_ore'),
		stripeSessionId: text('stripe_session_id'),
		stripePaymentIntentId: text('stripe_payment_intent_id'),
		stripeFeeOre: integer('stripe_fee_ore'),
		paidAt: integer('paid_at', { mode: 'timestamp' }),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`)
	},
	// Flera NULL tillåts i unikt index (SQLite) — gäster krockar inte
	(t) => [uniqueIndex('tournament_member_unique').on(t.tournamentId, t.memberId)]
);

// Matchspel (cup): matcherna bildar en utslagsstege. round 1 = första
// omgången, slot = position inom omgången. Vinnaren i (round, slot)
// avancerar till (round + 1, floor(slot / 2)). Frilottade (bye) får
// participant2 = null och avgörs direkt. Matchen avgörs på egen coaster
// (coasterId) — lägst netto vinner när båda signerat; captain kan alltid
// sätta vinnare manuellt (walkover/lika).
export const tournamentMatches = sqliteTable(
	'tournament_matches',
	{
		id: text('id').primaryKey(),
		tournamentId: text('tournament_id')
			.notNull()
			.references(() => tournaments.id, { onDelete: 'cascade' }),
		round: integer('round').notNull(),
		slot: integer('slot').notNull(),
		participant1Id: text('participant1_id').references(() => tournamentParticipants.id, {
			onDelete: 'set null'
		}),
		participant2Id: text('participant2_id').references(() => tournamentParticipants.id, {
			onDelete: 'set null'
		}),
		winnerId: text('winner_id').references(() => tournamentParticipants.id, {
			onDelete: 'set null'
		}),
		coasterId: text('coaster_id').references(() => coasters.id, { onDelete: 'set null' }),
		decidedAt: integer('decided_at', { mode: 'timestamp' })
	},
	(t) => [uniqueIndex('tournament_match_slot_unique').on(t.tournamentId, t.round, t.slot)]
);

// Kostnadsbok: captain bokför turneringens utgifter (kvitto valfritt,
// lagras via storage-abstraktionen som certifieringsbevisen).
export const tournamentExpenses = sqliteTable('tournament_expenses', {
	id: text('id').primaryKey(),
	tournamentId: text('tournament_id')
		.notNull()
		.references(() => tournaments.id, { onDelete: 'cascade' }),
	description: text('description').notNull(),
	amountOre: integer('amount_ore').notNull(),
	receiptKey: text('receipt_key').unique(),
	receiptType: text('receipt_type'),
	receiptName: text('receipt_name'),
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// --- Rundor (virtuella Score Coasters) ------------------------------------
// scores lagras som json-array (ett tal per hål). hcpBefore/After ger
// handikapp-historik runda för runda.
export const rounds = sqliteTable('rounds', {
	id: text('id').primaryKey(),
	memberId: text('member_id')
		.notNull()
		.references(() => members.id, { onDelete: 'cascade' }),
	tournamentId: text('tournament_id').references(() => tournaments.id, { onDelete: 'set null' }),
	holes: integer('holes').notNull().default(18),
	scores: text('scores', { mode: 'json' }).$type<number[]>().notNull(),
	grossTotal: integer('gross_total').notNull(),
	hcpBefore: real('hcp_before').notNull(),
	hcpAfter: real('hcp_after').notNull(),
	netTotal: real('net_total').notNull(),
	playedAt: integer('played_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// --- Virtuella Score Coasters (delade) --------------------------------------
// En coaster är det delade "underlägget": 9 hål med par-rad och upp till
// 6 spelarrader. Varje spelare fyller sin rad och signerar när rundan är
// klar — signaturen låser raden och skapar en post i rounds (HCP-justering).
export const MAX_COASTER_PLAYERS = 6;
// Man kan inte spela en runda ensam — minst två spelare på coastern innan signering.
export const MIN_COASTER_PLAYERS = 2;
export const DEFAULT_PAR = [4, 4, 3, 4, 5, 3, 4, 3, 5];

export const coasters = sqliteTable('coasters', {
	id: text('id').primaryKey(),
	name: text('name'), // valfritt, ex "Lördagsslingan"
	par: text('par', { mode: 'json' }).$type<number[]>().notNull(), // 9 värden
	// Turneringscoaster: rundor som signeras här bokförs på turneringen
	tournamentId: text('tournament_id').references(() => tournaments.id, { onDelete: 'set null' }),
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	// Påskägg: baksidan på en färdigspelad coaster — ritning (transparent PNG-overlay);
	// bilderna bor i coaster_back_images
	backDrawingKey: text('back_drawing_key'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Bilder på coasterns baksida. Position/skala/rotation i baksidans logiska
// koordinatsystem (1200×900, origo uppe till vänster, x/y = bildens centrum).
export const coasterBackImages = sqliteTable('coaster_back_images', {
	id: text('id').primaryKey(),
	coasterId: text('coaster_id')
		.notNull()
		.references(() => coasters.id, { onDelete: 'cascade' }),
	storageKey: text('storage_key').notNull(),
	contentType: text('content_type').notNull(),
	width: integer('width').notNull(), // naturlig bildstorlek (px) — för aspect
	height: integer('height').notNull(),
	x: real('x').notNull(),
	y: real('y').notNull(),
	scale: real('scale').notNull().default(1), // 1 = bredd 600 logiska px
	rotation: real('rotation').notNull().default(0), // grader
	z: integer('z').notNull().default(0),
	createdBy: text('created_by').references(() => members.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Gästrader (publika turneringar): memberId är null och participantId pekar
// på turneringsdeltagaren. INVARIANT: gästrader skapar ALDRIG rounds-poster
// och rör aldrig members.hcp — gästens slutresultat bor i scores + signedAt.
export const coasterPlayers = sqliteTable(
	'coaster_players',
	{
		id: text('id').primaryKey(),
		coasterId: text('coaster_id')
			.notNull()
			.references(() => coasters.id, { onDelete: 'cascade' }),
		memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
		// Sätts på alla rader på turneringscoasters (medlem och gäst)
		participantId: text('participant_id').references(() => tournamentParticipants.id, {
			onDelete: 'cascade'
		}),
		position: integer('position').notNull(), // radordning 1–6
		// null = hålet ej spelat än ("You don't have to play nine at one time.")
		scores: text('scores', { mode: 'json' }).$type<(number | null)[]>().notNull(),
		signedAt: integer('signed_at', { mode: 'timestamp' }), // spelarens signatur
		roundId: text('round_id').references(() => rounds.id) // sätts vid signering
	},
	(t) => [
		uniqueIndex('coaster_player_unique').on(t.coasterId, t.memberId),
		// En rad per deltagare och coaster. Slagspel begränsas dessutom till EN
		// rad per deltagare i hela turneringen (appkod) — matchspel spelar en
		// coaster per omgång.
		uniqueIndex('coaster_player_participant_unique').on(t.coasterId, t.participantId)
	]
);

// --- Relationer -----------------------------------------------------------
export const membersRelations = relations(members, ({ many }) => ({
	sessions: many(sessions),
	rounds: many(rounds),
	certifications: many(certifications)
}));

export const roundsRelations = relations(rounds, ({ one }) => ({
	member: one(members, { fields: [rounds.memberId], references: [members.id] }),
	tournament: one(tournaments, { fields: [rounds.tournamentId], references: [tournaments.id] })
}));

export const coastersRelations = relations(coasters, ({ one, many }) => ({
	creator: one(members, { fields: [coasters.createdBy], references: [members.id] }),
	tournament: one(tournaments, { fields: [coasters.tournamentId], references: [tournaments.id] }),
	players: many(coasterPlayers)
}));

export const coasterPlayersRelations = relations(coasterPlayers, ({ one }) => ({
	coaster: one(coasters, { fields: [coasterPlayers.coasterId], references: [coasters.id] }),
	member: one(members, { fields: [coasterPlayers.memberId], references: [members.id] }),
	participant: one(tournamentParticipants, {
		fields: [coasterPlayers.participantId],
		references: [tournamentParticipants.id]
	}),
	round: one(rounds, { fields: [coasterPlayers.roundId], references: [rounds.id] })
}));

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
	creator: one(members, { fields: [tournaments.createdBy], references: [members.id] }),
	participants: many(tournamentParticipants),
	expenses: many(tournamentExpenses),
	coasters: many(coasters),
	rounds: many(rounds)
}));

export const tournamentParticipantsRelations = relations(tournamentParticipants, ({ one }) => ({
	tournament: one(tournaments, {
		fields: [tournamentParticipants.tournamentId],
		references: [tournaments.id]
	}),
	member: one(members, { fields: [tournamentParticipants.memberId], references: [members.id] })
}));

export const tournamentExpensesRelations = relations(tournamentExpenses, ({ one }) => ({
	tournament: one(tournaments, {
		fields: [tournamentExpenses.tournamentId],
		references: [tournaments.id]
	}),
	creator: one(members, { fields: [tournamentExpenses.createdBy], references: [members.id] })
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
	member: one(members, { fields: [certifications.memberId], references: [members.id] }),
	fadder: one(members, { fields: [certifications.fadderId], references: [members.id] })
}));

export type Member = typeof members.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type TournamentExpense = typeof tournamentExpenses.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type Certification = typeof certifications.$inferSelect;
export type Coaster = typeof coasters.$inferSelect;
export type CoasterPlayer = typeof coasterPlayers.$inferSelect;
export type CertificationProof = typeof certificationProofs.$inferSelect;
