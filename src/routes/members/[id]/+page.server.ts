import { error } from '@sveltejs/kit';
import { getDashboard } from '$lib/server/dashboard';
import { requireMember } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = requireMember(locals.member);
	const dashboard = await getDashboard(params.id);
	if (!dashboard) throw error(404, 'Medlemmen finns inte.');
	return { dashboard, isSelf: me.id === params.id };
};
