/** "Anders Båtsman" → "Anders B." — för smala kolumner på mobil. */
export function shortName(name: string): string {
	const parts = name.trim().split(/\s+/);
	return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}
