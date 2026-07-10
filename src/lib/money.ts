// Pengar lagras som heltal ören i databasen. Ren modul — delas server/klient.

const kr = new Intl.NumberFormat('sv-SE', {
	style: 'currency',
	currency: 'SEK',
	minimumFractionDigits: 0,
	maximumFractionDigits: 2
});

export function formatKr(ore: number): string {
	return kr.format(ore / 100);
}

// "150", "150,50", "150.50", "1 250 kr" → ören. null vid ogiltig inmatning.
export function parseKr(input: string): number | null {
	const cleaned = input.replace(/kr/gi, '').replace(/\s/g, '').replace(',', '.').trim();
	if (cleaned === '') return null;
	const value = Number(cleaned);
	if (!Number.isFinite(value) || value < 0) return null;
	return Math.round(value * 100);
}
