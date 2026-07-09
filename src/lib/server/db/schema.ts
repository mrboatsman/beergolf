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
export const tournaments = sqliteTable('tournaments', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	startsAt: integer('starts_at', { mode: 'timestamp' }),
	holes: integer('holes').notNull().default(18),
	status: text('status').$type<'draft' | 'open' | 'finished'>().notNull().default('draft'),
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
export const DEFAULT_PAR = [4, 4, 3, 4, 5, 3, 4, 3, 5];

export const coasters = sqliteTable('coasters', {
	id: text('id').primaryKey(),
	name: text('name'), // valfritt, ex "Lördagsslingan"
	par: text('par', { mode: 'json' }).$type<number[]>().notNull(), // 9 värden
	createdBy: text('created_by')
		.notNull()
		.references(() => members.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const coasterPlayers = sqliteTable(
	'coaster_players',
	{
		id: text('id').primaryKey(),
		coasterId: text('coaster_id')
			.notNull()
			.references(() => coasters.id, { onDelete: 'cascade' }),
		memberId: text('member_id')
			.notNull()
			.references(() => members.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(), // radordning 1–6
		// null = hålet ej spelat än ("You don't have to play nine at one time.")
		scores: text('scores', { mode: 'json' }).$type<(number | null)[]>().notNull(),
		signedAt: integer('signed_at', { mode: 'timestamp' }), // spelarens signatur
		roundId: text('round_id').references(() => rounds.id) // sätts vid signering
	},
	(t) => [uniqueIndex('coaster_player_unique').on(t.coasterId, t.memberId)]
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
	players: many(coasterPlayers)
}));

export const coasterPlayersRelations = relations(coasterPlayers, ({ one }) => ({
	coaster: one(coasters, { fields: [coasterPlayers.coasterId], references: [coasters.id] }),
	member: one(members, { fields: [coasterPlayers.memberId], references: [members.id] }),
	round: one(rounds, { fields: [coasterPlayers.roundId], references: [rounds.id] })
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
export type Certification = typeof certifications.$inferSelect;
export type Coaster = typeof coasters.$inferSelect;
export type CoasterPlayer = typeof coasterPlayers.$inferSelect;
export type CertificationProof = typeof certificationProofs.$inferSelect;
