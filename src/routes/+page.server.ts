import { getDashboard } from '$lib/server/dashboard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.member) return { dashboard: null };
	return { dashboard: await getDashboard(locals.member.id) };
};
