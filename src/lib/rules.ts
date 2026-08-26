// Beer Golf™ - spelregler som visas på Score Coastern (och kan återanvändas
// på andra ställen). En källa: ändra här, inte i vyerna.
export type RuleSection = { title: string; rules: string[] };

export const RULES: RuleSection[] = [
	{
		title: 'Spelet',
		rules: [
			'En runda är nio hål. Varje hål är ett glas fyllt en bra bit över 50 cl-strecket: strecket är pinnen.',
			'Ett slag är en kontrollerad klunk. Målet är att landa ölens yta pin high, exakt på strecket, på så få slag som möjligt.',
			'Ditt resultat på hålet är antalet slag som krävdes. Hamnar ytan under strecket är hålet klart, men slagen räknas ändå.',
			'Hamnar slaget out of bounds, eller inte på något numrerat område, räknas hålet som 2 × par. Skriv 0 (visas som x) på coastern. Tomma hål räknas också som x när du signerar.',
			'Par står på coastern (standard 4-4-3-4-5-3-4-3-5 = 35). Lägre än par är bra, lägre totalt är bättre.',
			'Du behöver inte spela alla nio hål på en gång. Spara coastern och spela klart en annan kväll.'
		]
	},
	{
		title: 'Räkning & signatur',
		rules: [
			'Hederssystemet gäller: du räknar dina egna slag. Vid tvekan dömer du till din egen nackdel.',
			'Fyll i alla nio hål och signera när rundan är klar. Signaturen låser raden, bokför rundan och justerar ditt handikapp.',
			'Man spelar inte ensam: minst två spelare på coastern innan någon kan signera. Max sex spelare per coaster.',
			'Fel i efterhand? Kontakta admin, som kan rätta poäng och räkna om handikappet.'
		]
	},
	{
		title: 'Etikett & hänsyn',
		rules: [
			'Play Slow. Lugnt tempo, inga stressade hål.',
			'Tystnad och stillhet när en medspelare står i sitt utslag.',
			'Känn din gräns, håll vätskebalansen och ha hemresan löst innan första utslaget. Drink responsibly.'
		]
	},
	{
		title: 'Tips',
		rules: [
			'Räkna hålet så fort du ställt ner glaset. Vänta inte på att skummet lägger sig och ytan stiger.'
		]
	}
];
