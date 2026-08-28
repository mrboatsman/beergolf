import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { getDashboard } from '$lib/server/dashboard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.member) return { dashboard: null };
	return { dashboard: await getDashboard(locals.member.id) };
};

export const actions: Actions = {
	// Välkomstmodalen efter grönt kort: visa aldrig igen
	dismissWelcome: async ({ locals }) => {
		const me = requireMember(locals.member);
		await db.update(members).set({ welcomeSeenAt: new Date() }).where(eq(members.id, me.id));
		return { welcomeDismissed: true };
	}
};
