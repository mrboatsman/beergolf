// Fake-data för fadderträdet: ~1000 medlemmar, 5–10 nivåer djupt.
// Några superfaddrar med många skyddslingar, några kedjor där
// skyddslingarna själva blivit faddrar många steg neråt.
//
//   npm run db:seed:fake            # skapa
//   npm run db:seed:fake -- --clean # ta bort all fake-data igen
//
// All fake-data har e-post @fake.beergolf och kan städas säkert.
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const TOTAL = 1000;
const MAX_DEPTH = 10;

const url = (process.env.DATABASE_URL ?? './data/beergolf.db').replace(/^file:/, '');
const db = new Database(url);
db.pragma('foreign_keys = ON');

if (process.argv.includes('--clean')) {
	const fakes = db
		.prepare(`SELECT id FROM members WHERE email LIKE '%@fake.beergolf'`)
		.all() as Array<{ id: string }>;
	const clean = db.transaction(() => {
		for (const m of fakes) db.prepare('DELETE FROM certifications WHERE member_id=?').run(m.id);
		for (const m of fakes) {
			db.prepare('UPDATE certifications SET fadder_id=NULL WHERE fadder_id=?').run(m.id);
			db.prepare('DELETE FROM members WHERE id=?').run(m.id);
		}
	});
	clean();
	console.log(`${fakes.length} fake-medlemmar borttagna.`);
	process.exit(0);
}

const FIRST = [
	'Göran',
	'Bosse',
	'Sture',
	'Lennart',
	'Kjell',
	'Roland',
	'Ingemar',
	'Åke',
	'Rune',
	'Bertil',
	'Sixten',
	'Folke',
	'Gunnar',
	'Evert',
	'Holger',
	'Ragnar',
	'Tage',
	'Verner',
	'Ivar',
	'Melker',
	'Assar',
	'Börje',
	'Egon',
	'Fritiof',
	'Gösta',
	'Harry',
	'Ingvar',
	'Jarl',
	'Knut',
	'Lage',
	'Måns',
	'Nisse',
	'Ossian',
	'Pontus',
	'Rolf',
	'Sigge',
	'Torsten',
	'Uno',
	'Valter',
	'Yngve'
];
const LAST = [
	'Ölberg',
	'Klunk',
	'Fatöl',
	'Humle',
	'Malt',
	'Skum',
	'Krus',
	'Tunna',
	'Bägare',
	'Stånka',
	'Pilsner',
	'Lager',
	'Porter',
	'Stout',
	'Bock',
	'Sejdel',
	'Kagge',
	'Brygd',
	'Jäst',
	'Kork',
	'Flaska',
	'Kapsyl',
	'Svagdricka',
	'Mäsk',
	'Vört',
	'Drav',
	'Tapp',
	'Sump',
	'Bir',
	'Halvlitersson'
];

// Roten: klubbmästaren (första admin) — allt fake hänger under den.
const root = db
	.prepare(`SELECT id FROM members WHERE role='admin' ORDER BY created_at LIMIT 1`)
	.get() as { id: string } | undefined;
if (!root) {
	console.error('Ingen admin hittad — kör npm run db:seed först.');
	process.exit(1);
}

let memberNumber =
	((db.prepare('SELECT max(member_number) m FROM members').get() as { m: number | null }).m ?? 0) +
	1;

type Node = { id: string; depth: number; children: number };
const nodes: Node[] = [{ id: root.id, depth: 0, children: 0 }];

// ~12 utpekade superfaddrar får oproportionerligt många skyddslingar
const superFaddrar: Node[] = [];

function pickParent(): Node {
	const r = Math.random();
	// 15 %: förläng de djupaste kedjorna → ner mot 8–10 nivåer
	if (r < 0.15) {
		const maxDepth = Math.max(...nodes.map((n) => n.depth));
		const deep = nodes.filter((n) => n.depth >= Math.max(1, maxDepth - 1) && n.depth < MAX_DEPTH);
		if (deep.length) return deep[Math.floor(Math.random() * deep.length)];
	}
	// 40 %: superfaddrar samlar på sig många
	if (r < 0.55 && superFaddrar.length) {
		const s = superFaddrar[Math.floor(Math.random() * superFaddrar.length)];
		if (s.depth < MAX_DEPTH) return s;
	}
	// resten: slumpad befintlig, lätt viktad mot de som redan har barn
	for (let tries = 0; tries < 20; tries++) {
		const c = nodes[Math.floor(Math.random() * nodes.length)];
		if (c.depth >= MAX_DEPTH) continue;
		if (c.children > 0 || Math.random() < 0.5) return c;
	}
	return nodes[0];
}

const insertMember = db.prepare(
	`INSERT INTO members (id,name,email,role,status,hcp,member_number,green_card_issued_at,created_at)
	 VALUES (?,?,?,?,?,?,?,?,unixepoch())`
);
const insertCert = db.prepare(
	`INSERT INTO certifications (id,member_id,fadder_id,theory_passed,theory_score,theory_at,
	   practical_passed,practical_at,etiquette_passed,certified_at,created_at)
	 VALUES (?,?,?,1,?,?,1,?,1,?,unixepoch())`
);

const now = Math.floor(Date.now() / 1000);
const YEAR = 365 * 86400;

const seed = db.transaction(() => {
	for (let i = 0; i < TOTAL; i++) {
		const parent = pickParent();
		const id = randomUUID();
		const name = `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`;
		const email = `fake${i}@fake.beergolf`;
		const hcp = Math.round((4 + Math.random() * 41) * 10) / 10;
		const certifiedAt = now - Math.floor(Math.random() * 3 * YEAR);
		const score = Math.random() < 0.25 ? 0.8 : Math.round((0.8 + Math.random() * 0.2) * 100) / 100;

		insertMember.run(id, name, email, 'member', 'active', hcp, memberNumber++, certifiedAt);
		insertCert.run(randomUUID(), id, parent.id, score, certifiedAt, certifiedAt, certifiedAt);

		parent.children++;
		const node: Node = { id, depth: parent.depth + 1, children: 0 };
		nodes.push(node);
		if (superFaddrar.length < 12 && Math.random() < 0.06) superFaddrar.push(node);
	}
	// Alla med skyddslingar blir faddrar
	db.prepare(
		`UPDATE members SET role='fadder'
		 WHERE role='member' AND id IN (SELECT DISTINCT fadder_id FROM certifications WHERE fadder_id IS NOT NULL)`
	).run();
});
seed();

// Statistik
const depths = nodes.slice(1).map((n) => n.depth);
const byDepth = new Map<number, number>();
for (const d of depths) byDepth.set(d, (byDepth.get(d) ?? 0) + 1);
const topFaddrar = [...nodes]
	.sort((a, b) => b.children - a.children)
	.slice(0, 5)
	.map((n) => n.children);
console.log(`${TOTAL} fake-medlemmar skapade.`);
console.log(`Maxdjup: ${Math.max(...depths)} nivåer`);
console.log(
	'Per nivå:',
	[...byDepth.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([d, c]) => `${d}:${c}`)
		.join('  ')
);
console.log(`Största faddrarna (antal skyddslingar): ${topFaddrar.join(', ')}`);
