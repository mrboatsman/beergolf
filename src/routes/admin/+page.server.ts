import { fail } from '@sveltejs/kit';
import { asc, desc, eq, isNotNull, like, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '$lib/server/db';
import {
	certificationProofs,
	certifications,
	invites,
	members,
	sessions,
	quizQuestions,
	type Role
} from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { storage } from '$lib/server/storage';
import { newId, newInviteCode } from '$lib/server/ids';
import { requireRole } from '$lib/server/guard';
import { buildFadderTree } from '$lib/fadder-tree';
import { MAX_HCP, MIN_HCP, round1 } from '$lib/handicap';
import type { Actions, PageServerLoad } from './$types';

const ROLES: Role[] = ['aspirant', 'member', 'fadder', 'captain', 'admin'];

const PAGE_SIZE = 25;

function paging(url: URL, key: string) {
	const q = url.searchParams.get(`${key}q`)?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get(`${key}page`) ?? 1) || 1);
	return { q, page };
}

export const load: PageServerLoad = async ({ url }) => {
	// Medlemslistan: filtrera på namn/e-post, paginerad (mq/mpage)
	const m = paging(url, 'm');
	const memberWhere = m.q
		? or(like(members.name, `%${m.q}%`), like(members.email, `%${m.q}%`))
		: undefined;
	const memberTotal =
		(
			await db
				.select({ n: sql<number>`count(*)` })
				.from(members)
				.where(memberWhere)
				.get()
		)?.n ?? 0;
	const memberPages = Math.max(1, Math.ceil(memberTotal / PAGE_SIZE));
	const memberPage = Math.min(m.page, memberPages);
	const memberList = await db
		.select()
		.from(members)
		.where(memberWhere)
		.orderBy(desc(members.createdAt))
		.limit(PAGE_SIZE)
		.offset((memberPage - 1) * PAGE_SIZE)
		.all();

	// Invalskoder: filtrera på kod, namnet på medlemmen som koden skapade eller
	// vem som skapade koden, paginerad (iq/ipage).
	const usedBy = alias(members, 'used_by_member');
	const createdBy = alias(members, 'created_by_member');
	const i = paging(url, 'i');
	const inviteWhere = i.q
		? or(
				like(invites.code, `%${i.q}%`),
				like(usedBy.name, `%${i.q}%`),
				like(createdBy.name, `%${i.q}%`)
			)
		: undefined;
	const inviteTotal =
		(
			await db
				.select({ n: sql<number>`count(*)` })
				.from(invites)
				.leftJoin(usedBy, eq(invites.usedBy, usedBy.id))
				.leftJoin(createdBy, eq(invites.createdBy, createdBy.id))
				.where(inviteWhere)
				.get()
		)?.n ?? 0;
	const invitePages = Math.max(1, Math.ceil(inviteTotal / PAGE_SIZE));
	const invitePage = Math.min(i.page, invitePages);
	const inviteList = await db
		.select({
			id: invites.id,
			code: invites.code,
			role: invites.role,
			usedAt: invites.usedAt,
			expiresAt: invites.expiresAt,
			createdAt: invites.createdAt,
			usedById: usedBy.id,
			usedByName: usedBy.name,
			createdById: createdBy.id,
			createdByName: createdBy.name
		})
		.from(invites)
		.leftJoin(usedBy, eq(invites.usedBy, usedBy.id))
		.leftJoin(createdBy, eq(invites.createdBy, createdBy.id))
		.where(inviteWhere)
		.orderBy(desc(invites.createdAt))
		.limit(PAGE_SIZE)
		.offset((invitePage - 1) * PAGE_SIZE)
		.all();

	// Fadderträdet behöver hela medlemslistan (lätta fält)
	const [allMembers, questionList, relations] = await Promise.all([
		db
			.select({ id: members.id, name: members.name, role: members.role, status: members.status })
			.from(members)
			.all(),
		db.select().from(quizQuestions).orderBy(asc(quizQuestions.question)).all(),
		db
			.select({ memberId: certifications.memberId, fadderId: certifications.fadderId })
			.from(certifications)
			.where(isNotNull(certifications.fadderId))
			.all()
	]);
	const fadderTree = buildFadderTree(
		allMembers,
		relations.filter((r): r is { memberId: string; fadderId: string } => r.fadderId !== null)
	);

	return {
		members: memberList.map(({ passwordHash: _drop, ...mm }) => mm),
		memberTotal,
		memberPage,
		memberPages,
		memberQ: m.q,
		invites: inviteList,
		inviteTotal,
		invitePage,
		invitePages,
		inviteQ: i.q,
		questions: questionList,
		fadderTree
	};
};

export const actions: Actions = {
	// Skapa engångskod
	createInvite: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'captain');
		const form = await request.formData();
		const role = String(form.get('role') ?? 'aspirant') as Role;
		if (!ROLES.includes(role)) return fail(400, { error: 'Ogiltig roll.' });

		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dagar
		const code = newInviteCode();
		await db.insert(invites).values({
			id: newId(),
			code,
			role,
			createdBy: me.id,
			expiresAt
		});
		return { created: code };
	},

	// Skapa medlem direkt (admin skapar konto med temporärt lösenord)
	createMember: async ({ request, locals }) => {
		requireRole(locals.member, 'captain');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = String(form.get('role') ?? 'aspirant') as Role;
		const password = String(form.get('password') ?? '');

		if (!name || !email || !password)
			return fail(400, { error: 'Namn, e-post och lösenord krävs.' });
		if (password.length < 8) return fail(400, { error: 'Lösenord minst 8 tecken.' });
		if (!ROLES.includes(role)) return fail(400, { error: 'Ogiltig roll.' });

		const existing = await db.select().from(members).where(eq(members.email, email)).get();
		if (existing) return fail(400, { error: 'E-posten finns redan.' });

		await db.insert(members).values({
			id: newId(),
			name,
			email,
			role,
			status: role === 'aspirant' ? 'aspirant' : 'active',
			passwordHash: await hashPassword(password)
		});
		return { memberCreated: true };
	},

	// --- Teoriprov-frågor ---------------------------------------------------
	createQuestion: async ({ request, locals }) => {
		requireRole(locals.member, 'captain');
		const form = await request.formData();
		const question = String(form.get('question') ?? '').trim();
		const options = [0, 1, 2, 3]
			.map((i) => String(form.get(`opt${i}`) ?? '').trim())
			.filter(Boolean);
		const correctIndex = Number(form.get('correctIndex') ?? -1);
		const category = String(form.get('category') ?? 'regler') as 'regler' | 'säkerhet' | 'historia';

		if (!question) return fail(400, { error: 'Frågetext krävs.' });
		if (options.length < 2) return fail(400, { error: 'Minst två svarsalternativ.' });
		if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
			return fail(400, { error: 'Markera vilket alternativ som är rätt.' });
		}
		if (!['regler', 'säkerhet', 'historia'].includes(category)) {
			return fail(400, { error: 'Ogiltig kategori.' });
		}

		await db
			.insert(quizQuestions)
			.values({ id: newId(), question, options, correctIndex, category, active: true });
		return { questionCreated: true };
	},

	toggleQuestion: async ({ request, locals }) => {
		requireRole(locals.member, 'captain');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const q = await db.select().from(quizQuestions).where(eq(quizQuestions.id, id)).get();
		if (!q) return fail(404, { error: 'Frågan finns inte.' });
		await db.update(quizQuestions).set({ active: !q.active }).where(eq(quizQuestions.id, id));
		return { questionToggled: true };
	},

	deleteQuestion: async ({ request, locals }) => {
		requireRole(locals.member, 'captain');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
		return { questionDeleted: true };
	},

	// --- Kontoåtgärder (endast admin) ----------------------------------------

	// Nytt engångslösenord — visas en gång för admin, måste bytas vid inloggning.
	resetPassword: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'admin');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (id === me.id) return fail(400, { error: 'Byt ditt eget lösenord under /password.' });
		const target = await db.select().from(members).where(eq(members.id, id)).get();
		if (!target) return fail(404, { error: 'Medlemmen finns inte.' });

		const oneTime = newInviteCode(10);
		await db
			.update(members)
			.set({ passwordHash: await hashPassword(oneTime), mustChangePassword: true })
			.where(eq(members.id, id));
		// gamla sessioner ska inte överleva en återställning
		await db.delete(sessions).where(eq(sessions.memberId, id));

		return { passwordReset: { name: target.name, oneTime } };
	},

	// Admin redigerar medlemsuppgifter: namn, e-post, roll, HCP, medlemsnummer.
	// Egen roll kan inte ändras (låser inte ute sig själv). Uppgraderas
	// aspirant till annan roll utan grönt kort lämnas status orörd — kortet
	// utfärdas via certifieringen.
	updateMember: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'admin');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const target = await db.select().from(members).where(eq(members.id, id)).get();
		if (!target) return fail(404, { error: 'Medlemmen finns inte.' });

		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = String(form.get('role') ?? target.role) as Role;
		const hcpRaw = String(form.get('hcp') ?? '')
			.trim()
			.replace(',', '.');
		const numberRaw = String(form.get('memberNumber') ?? '').trim();

		if (name.length < 2) return fail(400, { error: 'Namn måste vara minst två tecken.' });
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { error: 'Ogiltig e-post.' });
		if (!ROLES.includes(role)) return fail(400, { error: 'Ogiltig roll.' });
		if (id === me.id && role !== target.role) {
			return fail(400, { error: 'Du kan inte ändra din egen roll.' });
		}
		const hcp = Number(hcpRaw);
		if (hcpRaw === '' || !Number.isFinite(hcp) || hcp < MIN_HCP || hcp > MAX_HCP) {
			return fail(400, { error: `HCP måste vara ${MIN_HCP}–${MAX_HCP}.` });
		}
		let memberNumber: number | null = null;
		if (numberRaw !== '') {
			memberNumber = Number(numberRaw);
			if (!Number.isInteger(memberNumber) || memberNumber < 1) {
				return fail(400, { error: 'Medlemsnummer måste vara ett positivt heltal.' });
			}
			const taken = await db
				.select({ id: members.id })
				.from(members)
				.where(eq(members.memberNumber, memberNumber))
				.get();
			if (taken && taken.id !== id) {
				return fail(400, { error: `Medlemsnummer ${memberNumber} används redan.` });
			}
		}
		const emailTaken = await db
			.select({ id: members.id })
			.from(members)
			.where(eq(members.email, email))
			.get();
		if (emailTaken && emailTaken.id !== id) {
			return fail(400, { error: 'E-postadressen används redan.' });
		}

		await db
			.update(members)
			.set({ name, email, role, hcp: round1(hcp), memberNumber })
			.where(eq(members.id, id));
		return { memberUpdated: name };
	},

	toggleActive: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'admin');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (id === me.id) return fail(400, { error: 'Du kan inte inaktivera dig själv.' });
		const target = await db.select().from(members).where(eq(members.id, id)).get();
		if (!target) return fail(404, { error: 'Medlemmen finns inte.' });

		if (target.status === 'inactive') {
			// tillbaka till aspirant om grönt kort saknas, annars aktiv
			const status = target.greenCardIssuedAt ? 'active' : 'aspirant';
			await db.update(members).set({ status }).where(eq(members.id, id));
			return { activated: target.name };
		}
		await db.update(members).set({ status: 'inactive' }).where(eq(members.id, id));
		await db.delete(sessions).where(eq(sessions.memberId, id));
		return { deactivated: target.name };
	},

	// GDPR: oåterkallelig anonymisering. Spelhistoriken (rundor/coasters)
	// behålls som klubbstatistik men utan personuppgifter; bevismedia och
	// fadderns omdöme raderas.
	anonymize: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'admin');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (id === me.id) return fail(400, { error: 'Du kan inte anonymisera dig själv.' });
		const target = await db.select().from(members).where(eq(members.id, id)).get();
		if (!target) return fail(404, { error: 'Medlemmen finns inte.' });

		// Radera bevisfiler (bilder/video på personen) ur lagringen
		const cert = await db
			.select()
			.from(certifications)
			.where(eq(certifications.memberId, id))
			.get();
		if (cert) {
			const proofs = await db
				.select()
				.from(certificationProofs)
				.where(eq(certificationProofs.certificationId, cert.id))
				.all();
			for (const p of proofs) await storage.remove(p.storageKey);
			await db.delete(certificationProofs).where(eq(certificationProofs.certificationId, cert.id));
			await db
				.update(certifications)
				.set({ practicalComment: null })
				.where(eq(certifications.id, cert.id));
		}

		const anonName = target.memberNumber
			? `Avregistrerad medlem nr ${target.memberNumber}`
			: 'Avregistrerad medlem';
		await db
			.update(members)
			.set({
				name: anonName,
				email: `anonymiserad-${id.slice(0, 8)}@gdpr.local`,
				passwordHash: null,
				mustChangePassword: false,
				status: 'inactive'
			})
			.where(eq(members.id, id));
		await db.delete(sessions).where(eq(sessions.memberId, id));

		return { anonymized: anonName };
	}
};
