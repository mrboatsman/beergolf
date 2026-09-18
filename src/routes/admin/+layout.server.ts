import { requireRole } from '$lib/server/guard';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Sajtadmin. Klubbmästare (captain) sköter sin klubb på /clubs/[slug].
	requireRole(locals.member, 'admin');
	return { member: locals.member };
};
