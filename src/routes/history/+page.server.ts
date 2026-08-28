import { requireMember } from '$lib/server/guard';
import { currentSeason, getSeasonArchive, listEndedSeasons } from '$lib/server/seasons';
import { fmtSeasonRange } from '$lib/season';
import type { PageServerLoad } from './$types';

// Historik: avslutade säsonger med vinnare, nyast först.
export const load: PageServerLoad = async ({ locals }) => {
	requireMember(locals.member);
	const cur = currentSeason();
	const seasons = listEndedSeasons().map((s) => {
		const a = getSeasonArchive(s.label);
		return {
			label: s.label,
			range: fmtSeasonRange(s),
			winners: a?.winners ?? [],
			rounds: a?.totals.rounds ?? 0,
			players: a?.totals.players ?? 0
		};
	});
	return { seasons, current: { label: cur.label, range: fmtSeasonRange(cur) } };
};
