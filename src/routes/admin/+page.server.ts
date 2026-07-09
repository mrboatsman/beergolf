import { fail } from '@sveltejs/kit';
import { asc, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications, invites, members, quizQuestions, type Role } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { newId, newInviteCode } from '$lib/server/ids';
import { requireRole } from '$lib/server/guard';
import { buildFadderTree } from '$lib/fadder-tree';
import type { Actions, PageServerLoad } from './$types';

const ROLES: Role[] = ['aspirant', 'member', 'fadder', 'captain', 'admin'];

export const load: PageServerLoad = async () => {
	const [memberList, inviteList, questionList, relations] = await Promise.all([
		db.select().from(members).orderBy(desc(members.createdAt)).all(),
		db.select().from(invites).orderBy(desc(invites.createdAt)).all(),
		db.select().from(quizQuestions).orderBy(asc(quizQuestions.question)).all(),
		db
			.select({ memberId: certifications.memberId, fadderId: certifications.fadderId })
			.from(certifications)
			.where(isNotNull(certifications.fadderId))
			.all()
	]);
	const fadderTree = buildFadderTree(
		memberList.map((m) => ({ id: m.id, name: m.name, role: m.role, status: m.status })),
		relations.filter((r): r is { memberId: string; fadderId: string } => r.fadderId !== null)
	);
	return {
		members: memberList.map(({ passwordHash: _drop, ...m }) => m),
		invites: inviteList,
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
	}
};
