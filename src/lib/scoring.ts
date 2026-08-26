// Poängmodell för ett hål:
//   null  = ej spelat än
//   0     = "x" — out of bounds / missat: räknas som dubbelt par
//   1–9   = antal slag
// Brutto måste därför alltid räknas mot coasterns par-rad.
export const X = 0;
export const MAX_HOLE_SCORE = 9;

export type HoleScore = number | null;

/** Slag för ett hål givet par (x ⇒ 2 × par). */
export function holeStrokes(score: number, par: number): number {
	return score === X ? 2 * par : score;
}

/** Brutto för ifyllda hål; null om inget är ifyllt. */
export function grossTotal(scores: HoleScore[], par: number[]): number | null {
	let sum = 0;
	let any = false;
	scores.forEach((s, i) => {
		if (s === null) return;
		any = true;
		sum += holeStrokes(s, par[i] ?? 4);
	});
	return any ? sum : null;
}

/** Brutto för en komplett rad (tomma hål räknas som x). */
export function grossTotalComplete(scores: HoleScore[], par: number[]): number {
	return par.reduce((sum, p, i) => sum + holeStrokes(scores[i] ?? X, p), 0);
}

/** Tomma hål → x (används vid signering). */
export function fillMissingWithX(scores: HoleScore[], holes = 9): number[] {
	return Array.from({ length: holes }, (_, i) => scores[i] ?? X);
}

/** Visning: x / '' / siffra. */
export function fmtScore(s: HoleScore): string {
	if (s === null) return '';
	return s === X ? 'x' : String(s);
}

/** Tolka inmatning: '' → null, 1–9 → siffra, allt annat (0, x, bokstav) → x. */
export function parseScore(raw: string): HoleScore {
	const t = raw.trim();
	if (t === '') return null;
	if (/^[1-9]$/.test(t)) return Number(t);
	return X;
}

/** Admin-rättning: tillåter även 10–30 (historik/rättelser). */
export function parseScoreAdmin(raw: string): HoleScore | 'invalid' {
	const t = raw.trim();
	if (t === '') return null;
	if (/^x$/i.test(t) || t === '0') return X;
	const v = Number(t);
	if (!Number.isInteger(v) || v < 1 || v > 30) return 'invalid';
	return v;
}
