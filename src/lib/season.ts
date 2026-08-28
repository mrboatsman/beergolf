// Säsonger (ren logik, delad server/klient). Säsongen börjar på en konfigurerad
// månad/dag (default 1 jan) och varar ett år. Etikett: "2026" om start 1 jan,
// annars "2026/27" (startår/slutår).
export type SeasonConfig = { startMonth: number; startDay: number }; // 1–12, 1–31
export type Season = { label: string; start: Date; end: Date }; // end = exklusiv

export const DEFAULT_SEASON: SeasonConfig = { startMonth: 1, startDay: 1 };

export function seasonLabel(startYear: number, cfg: SeasonConfig): string {
	if (cfg.startMonth === 1 && cfg.startDay === 1) return String(startYear);
	return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}

function startOf(year: number, cfg: SeasonConfig): Date {
	return new Date(year, cfg.startMonth - 1, cfg.startDay, 0, 0, 0, 0);
}

/** Säsongen som en given tidpunkt tillhör. */
export function seasonAt(at: Date, cfg: SeasonConfig): Season {
	let year = at.getFullYear();
	if (at < startOf(year, cfg)) year -= 1;
	return seasonForStartYear(year, cfg);
}

export function seasonForStartYear(year: number, cfg: SeasonConfig): Season {
	return { label: seasonLabel(year, cfg), start: startOf(year, cfg), end: startOf(year + 1, cfg) };
}

/** Tolka en etikett ("2026" eller "2026/27") tillbaka till säsong. */
export function seasonFromLabel(label: string, cfg: SeasonConfig): Season | null {
	const m = /^(\d{4})(?:\/\d{2})?$/.exec(label.trim());
	if (!m) return null;
	const s = seasonForStartYear(Number(m[1]), cfg);
	return s.label === label ? s : null;
}

/** Alla avslutade säsonger mellan `from` och `now`, nyast först. */
export function endedSeasons(from: Date, now: Date, cfg: SeasonConfig): Season[] {
	const out: Season[] = [];
	let s = seasonAt(from, cfg);
	while (s.end <= now) {
		out.push(s);
		s = seasonForStartYear(s.start.getFullYear() + 1, cfg);
	}
	return out.reverse();
}

export const fmtSeasonRange = (s: Season) =>
	`${s.start.toLocaleDateString('sv-SE')} – ${new Date(s.end.getTime() - 1).toLocaleDateString('sv-SE')}`;
