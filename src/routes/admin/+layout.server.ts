import { requireRole } from '$lib/server/guard';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Klubbmästare (captain) och admin får hantera medlemmar & invites.
	requireRole(locals.member, 'captain');
	return { member: locals.member };
};
