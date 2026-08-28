import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications } from '$lib/server/db/schema';
import { avatarUrl } from '$lib/server/avatar';
import { getPendingAspirantsFor } from '$lib/server/certification';
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
	// Fadder-att-göra: aspiranter som väntar på mig (badge i menyn)
	const pendingAspirants =
		locals.member && locals.member.status !== 'aspirant'
			? getPendingAspirantsFor(locals.member.id).length
			: 0;
	return {
		member: locals.member,
		theoryPassed,
		avatarUrl: locals.member ? avatarUrl(locals.member) : null,
		pendingAspirants
	};
};
