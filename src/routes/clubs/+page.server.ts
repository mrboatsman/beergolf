import { fail, redirect } from '@sveltejs/kit';
import { asc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clubs } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { MAX_CLUB_NAME, PRIMARY_CLUB_ID, createClub } from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

// Klubbar: alla aktiva klubbar med medlemsantal + min status i var och en.
// Vem som helst med grönt kort kan skapa en klubb (blir captain).
export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	const list = db
		.select({
			id: clubs.id,
			slug: clubs.slug,
			name: clubs.name,
			description: clubs.description,
			logoKey: clubs.logoKey,
			status: clubs.status,
			createdAt: clubs.createdAt,
			members: sql<number>`(
				select count(*) from club_members cm where cm.club_id = clubs.id and cm.status = 'active'
			)`,
			homeMembers: sql<number>`(select count(*) from members m where m.home_club_id = clubs.id)`,
			myStatus: sql<string | null>`(
				select cm.status from club_members cm where cm.club_id = clubs.id and cm.member_id = ${me.id}
			)`,
			myRole: sql<string | null>`(
				select cm.role from club_members cm where cm.club_id = clubs.id and cm.member_id = ${me.id}
			)`,
			captains: sql<string>`coalesce((
				select group_concat(m.name, ', ') from club_members cm join members m on m.id = cm.member_id
				where cm.club_id = clubs.id and cm.role = 'captain' and cm.status = 'active'
			), '')`
		})
		.from(clubs)
		.orderBy(sql`${clubs.id} = ${PRIMARY_CLUB_ID} desc`, asc(clubs.name))
		.all()
		.map(({ logoKey, ...c }) => ({
			...c,
			logoUrl: logoKey ? `/files/${logoKey}` : null,
			isHome: c.id === me.homeClubId,
			isPrimary: c.id === PRIMARY_CLUB_ID
		}));
	return {
		clubs: list.filter((c) => c.status === 'active'),
		archived: list.filter((c) => c.status === 'archived'),
		canCreate: !!me.greenCardIssuedAt,
		maxName: MAX_CLUB_NAME
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		if (!me.greenCardIssuedAt) return fail(403, { error: 'Grönt kort krävs för att skapa klubb.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '')
			.trim()
			.replace(/\s+/g, ' ');
		const description = String(form.get('description') ?? '').trim() || null;
		const makeHome = form.get('makeHome') === '1';
		if (name.length < 3)
			return fail(400, { error: 'Klubbnamnet måste vara minst 3 tecken.', name });
		if (name.length > MAX_CLUB_NAME) {
			return fail(400, { error: `Max ${MAX_CLUB_NAME} tecken.`, name });
		}
		const taken = db
			.select({ id: clubs.id })
			.from(clubs)
			.where(sql`lower(${clubs.name}) = lower(${name})`)
			.get();
		if (taken) return fail(400, { error: 'Det finns redan en klubb med det namnet.', name });

		const club = createClub(name, description, me, makeHome);
		throw redirect(303, `/clubs/${club.slug}`);
	}
};
