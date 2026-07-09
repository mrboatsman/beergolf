import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications, quizAttempts, quizQuestions } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

// Godkänt vid minst 80 % rätt (se klubbens regler för grönt kort)
const PASS_THRESHOLD = 0.8;

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);

	const questions = await db
		.select({
			id: quizQuestions.id,
			question: quizQuestions.question,
			options: quizQuestions.options,
			category: quizQuestions.category
		})
		.from(quizQuestions)
		.where(eq(quizQuestions.active, true))
		.all();

	// Slumpad ordning per visning — facit lämnar aldrig servern.
	questions.sort(() => Math.random() - 0.5);

	const attempts = await db
		.select({
			id: quizAttempts.id,
			score: quizAttempts.score,
			passed: quizAttempts.passed,
			takenAt: quizAttempts.takenAt
		})
		.from(quizAttempts)
		.where(eq(quizAttempts.memberId, me.id))
		.orderBy(desc(quizAttempts.takenAt))
		.all();

	const cert = await db
		.select()
		.from(certifications)
		.where(eq(certifications.memberId, me.id))
		.get();

	return {
		questions,
		attempts,
		theory: {
			passed: cert?.theoryPassed ?? false,
			score: cert?.theoryScore ?? null,
			at: cert?.theoryAt ?? null
		},
		passThreshold: PASS_THRESHOLD
	};
};

export const actions: Actions = {
	submit: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const questions = await db
			.select()
			.from(quizQuestions)
			.where(eq(quizQuestions.active, true))
			.all();
		if (questions.length === 0) return fail(400, { error: 'Inga aktiva frågor.' });

		const form = await request.formData();
		const answers: Record<string, number> = {};
		for (const q of questions) {
			const raw = form.get(`q_${q.id}`);
			if (raw === null) return fail(400, { error: 'Svara på alla frågor innan du lämnar in.' });
			const idx = Number(raw);
			if (!Number.isInteger(idx) || idx < 0 || idx >= q.options.length) {
				return fail(400, { error: 'Ogiltigt svar.' });
			}
			answers[q.id] = idx;
		}

		const wrongIds = questions.filter((q) => answers[q.id] !== q.correctIndex).map((q) => q.id);
		const correctCount = questions.length - wrongIds.length;
		const score = Math.round((correctCount / questions.length) * 100) / 100;
		const passed = score >= PASS_THRESHOLD;

		await db.insert(quizAttempts).values({ id: newId(), memberId: me.id, score, passed, answers });

		// Godkänt teoriprov bokförs på certifieringen (första gången).
		if (passed) {
			const cert = await db
				.select()
				.from(certifications)
				.where(eq(certifications.memberId, me.id))
				.get();
			if (!cert) {
				await db.insert(certifications).values({
					id: newId(),
					memberId: me.id,
					theoryPassed: true,
					theoryScore: score,
					theoryAt: new Date()
				});
			} else if (!cert.theoryPassed) {
				await db
					.update(certifications)
					.set({ theoryPassed: true, theoryScore: score, theoryAt: new Date() })
					.where(eq(certifications.id, cert.id));
			}
		}

		return {
			result: { score, passed, correctCount, total: questions.length, wrongIds }
		};
	}
};
