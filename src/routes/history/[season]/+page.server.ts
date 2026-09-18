import { error } from '@sveltejs/kit';
import { requireMember } from '$lib/server/guard';
import { pickClub } from '$lib/server/clubs';
import { getSeasonArchive, getSeasonConfig } from '$lib/server/seasons';
import { fmtSeasonRange, seasonFromLabel } from '$lib/season';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const me = requireMember(locals.member);
	const { club, clubs } = pickClub(me, url);
	const clubId = club.id;
	const season = seasonFromLabel(params.season, getSeasonConfig(clubId));
	const stats = season ? getSeasonArchive(clubId, season.label) : null;
	if (!season || !stats) throw error(404, 'Säsongen finns inte eller är inte avslutad än.');
	return {
		stats,
		range: fmtSeasonRange(season),
		clubName: club.name,
		backHref: clubs.length > 1 ? `/history?club=${club.slug}` : '/history'
	};
};
