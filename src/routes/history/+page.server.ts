import { requireMember } from '$lib/server/guard';
import { pickClub } from '$lib/server/clubs';
import { currentSeason, getSeasonArchive, listEndedSeasons } from '$lib/server/seasons';
import { fmtSeasonRange } from '$lib/season';
import type { PageServerLoad } from './$types';

// Historik: avslutade säsonger med vinnare, nyast först.
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireMember(locals.member);
	const { club, clubs } = pickClub(me, url);
	const clubId = club.id;
	const cur = currentSeason(clubId);
	const seasons = listEndedSeasons(clubId).map((s) => {
		const a = getSeasonArchive(clubId, s.label);
		return {
			label: s.label,
			range: fmtSeasonRange(s),
			winners: a?.winners ?? [],
			rounds: a?.totals.rounds ?? 0,
			players: a?.totals.players ?? 0
		};
	});
	return {
		seasons,
		current: { label: cur.label, range: fmtSeasonRange(cur) },
		clubName: club.name,
		clubSlug: club.slug,
		clubId: club.id,
		clubs
	};
};
