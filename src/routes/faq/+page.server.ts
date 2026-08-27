import { requireMember } from '$lib/server/guard';
import { ADJUST_FACTOR, ENTRY_HCP, MAX_HCP, MIN_HCP, netScore, nextHcp } from '$lib/handicap';
import { DEFAULT_PAR, MAX_COASTER_PLAYERS, MIN_COASTER_PLAYERS } from '$lib/server/db/schema';
import { buildFaq, type FaqVars } from '$lib/faq';
import type { PageServerLoad } from './$types';

// FAQ: texten byggs av riktiga konstanter och ett räkneexempel via nextHcp()
// så den aldrig säger något annat än vad koden gör.
export const load: PageServerLoad = async ({ locals }) => {
	requireMember(locals.member);
	const parTotal = DEFAULT_PAR.reduce((a, b) => a + b, 0);
	const hcp = ENTRY_HCP;
	const gross = 40;
	const net = netScore(gross, hcp);
	const vars: FaqVars = {
		startHcp: ENTRY_HCP,
		factor: ADJUST_FACTOR,
		minHcp: MIN_HCP,
		maxHcp: MAX_HCP,
		minPlayers: MIN_COASTER_PLAYERS,
		maxPlayers: MAX_COASTER_PLAYERS,
		defaultPar: DEFAULT_PAR,
		parTotal,
		example: {
			hcp,
			gross,
			par: parTotal,
			net,
			diff: Math.round((net - parTotal) * 10) / 10,
			next: nextHcp(hcp, gross, parTotal)
		},
		quizPassPct: 80
	};
	return { sections: buildFaq(vars) };
};
