// Beer Golf handikapp-modell.
//
// Lågt score = bra (spelaren vill ta så få poäng/slag som möjligt).
// Ny medlem startar på HCP 36 och justeras runda för runda mot sitt
// faktiska spel — ett självkorrigerande system likt riktig golf men
// enklare, anpassat för låga volymer.

export const MIN_HCP = 0;
export const MAX_HCP = 54;
export const ADJUST_FACTOR = 0.2; // hur snabbt hcp rör sig mot formen

export function round1(n: number): number {
	return Math.round(n * 10) / 10;
}

export function clampHcp(hcp: number): number {
	return Math.min(MAX_HCP, Math.max(MIN_HCP, round1(hcp)));
}

export function netScore(gross: number, hcp: number): number {
	return round1(gross - hcp);
}

/**
 * Räkna ut nytt handikapp efter en runda.
 * `par` är banans totala par (ex 35 för en 9-håls coaster). Spelade spelaren
 * bättre än sitt handikapp (net under par) sänks hcp, annars höjs det något.
 */
export function nextHcp(hcpBefore: number, gross: number, par: number): number {
	const net = gross - hcpBefore;
	const diff = net - par; // negativ = spelade bättre än handikapp
	// Bättre än handikapp (diff < 0) => sänk hcp. Sämre => höj.
	const adjust = diff * ADJUST_FACTOR;
	return clampHcp(hcpBefore + adjust);
}
