// Seed: skapa admin-konto och teoriprov-frågor.
// Körs med:  npm run db:seed
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { randomUUID } from 'node:crypto';
import { members, quizQuestions } from '../src/lib/server/db/schema.ts';

const url = (process.env.DATABASE_URL ?? './data/beergolf.db').replace(/^file:/, '');
const db = drizzle(new Database(url), { schema: { members, quizQuestions } });

const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@beergolf.local').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? 'byt-detta-nu';

// --- Admin ----------------------------------------------------------------
const existing = db.select().from(members).where(eq(members.email, adminEmail)).get();
if (existing) {
	console.log(`Admin finns redan: ${adminEmail}`);
} else {
	db.insert(members)
		.values({
			id: randomUUID(),
			name: 'Klubbmästare',
			email: adminEmail,
			role: 'admin',
			status: 'active',
			passwordHash: await hash(adminPassword, ARGON)
		})
		.run();
	console.log(`Admin skapad: ${adminEmail} / ${adminPassword}  (byt lösenord!)`);
}

// --- Teoriprov ------------------------------------------------------------
const questions = [
	{
		question: 'Hur många klunkar får du ta per hål?',
		options: ['Ingen', 'En', 'Två', 'Så många du orkar'],
		correctIndex: 1,
		category: 'regler' as const
	},
	{
		question: 'En medspelare står i sitt utslag – vad gör du?',
		options: ['Hejar högt', 'Tyst och stilla', 'Filmar', 'Går förbi'],
		correctIndex: 1,
		category: 'säkerhet' as const
	},
	{
		question: 'Vid tveksam poäng – hur dömer du?',
		options: [
			'Till din fördel',
			'Frågar publiken',
			'Hederssystemet: till din nackdel vid tvekan',
			'Slår om'
		],
		correctIndex: 2,
		category: 'regler' as const
	},
	{
		question: 'Hur planerar du din hemresa efter en runda?',
		options: ['Kör själv', 'Bokad transport / ej bil', 'Improviserar', 'Cyklar utan lyse'],
		correctIndex: 1,
		category: 'säkerhet' as const
	},
	{
		question: 'Vilket tempo gäller enligt reglerna?',
		options: ['Play Fast', 'Play Slow', 'Spring mellan hålen', 'Valfritt'],
		correctIndex: 1,
		category: 'regler' as const
	}
];

let added = 0;
for (const q of questions) {
	const dupe = db.select().from(quizQuestions).where(eq(quizQuestions.question, q.question)).get();
	if (dupe) continue;
	db.insert(quizQuestions)
		.values({ id: randomUUID(), ...q, active: true })
		.run();
	added++;
}
console.log(`Teoriprov: ${added} nya frågor tillagda.`);
console.log('Seed klar.');
