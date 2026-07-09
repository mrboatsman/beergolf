import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Avklarat teoriprov plockar bort Teoriprov ur menyn.
	let theoryPassed = false;
	if (locals.member) {
		const cert = await db
			.select({ passed: certifications.theoryPassed })
			.from(certifications)
			.where(eq(certifications.memberId, locals.member.id))
			.get();
		theoryPassed = cert?.passed ?? false;
	}
	return { member: locals.member, theoryPassed };
};
