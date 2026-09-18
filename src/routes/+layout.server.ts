import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications } from '$lib/server/db/schema';
import { avatarUrl } from '$lib/server/avatar';
import { getPendingAspirantsFor } from '$lib/server/certification';
import { getClub, myClubs, sweepInactiveClubs } from '$lib/server/clubs';
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
	// Lat städning av inaktiva klubbar (throttlad i clubs.ts)
	if (locals.member) sweepInactiveClubs();
	// Hemmaklubben ger menyns namn + logga. Inget globalt "aktivt" klubbläge —
	// klubb väljs på plats (flikar / formulärval) där det spelar roll.
	const homeClub = locals.member ? getClub(locals.member.homeClubId) : null;
	return {
		member: locals.member,
		homeClub: homeClub ? { id: homeClub.id, slug: homeClub.slug, name: homeClub.name } : null,
		homeLogoUrl: homeClub?.logoKey ? `/files/${homeClub.logoKey}` : null,
		clubCount: locals.member
			? myClubs(locals.member).filter((c) => c.status === 'active').length
			: 0,
		theoryPassed,
		avatarUrl: locals.member ? avatarUrl(locals.member) : null,
		pendingAspirants
	};
};
