import { error } from '@sveltejs/kit';
import { requireMember } from '$lib/server/guard';
import { getSeasonArchive, getSeasonConfig } from '$lib/server/seasons';
import { fmtSeasonRange, seasonFromLabel } from '$lib/season';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireMember(locals.member);
	const season = seasonFromLabel(params.season, getSeasonConfig());
	const stats = season ? getSeasonArchive(season.label) : null;
	if (!season || !stats) throw error(404, 'Säsongen finns inte eller är inte avslutad än.');
	return { stats, range: fmtSeasonRange(season) };
};
