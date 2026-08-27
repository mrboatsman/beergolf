// Beer Golf™ - spelregler som visas på Score Coastern (och kan återanvändas
// på andra ställen). En källa: ändra här, inte i vyerna.
export type RuleSection = { title: string; rules: string[] };

export const RULES: RuleSection[] = [
	{
		title: 'Spelet',
		rules: [
			'Spelas i ett Beer Golf-glas med tryckta markeringar: två tee-linjer (övre och mellersta), numrerade poängområden med pinne för varje hål och hazards. En runda är nio hål, dvs nio slag.',
			'Fyll upp: på udda hål fylls glaset (eller dricks ner) till den övre tee-linjen, på jämna hål dricks det ner till den mellersta tee-linjen.',
			'Utslag: ett enda slag per hål, alltså en klunk. Målet är att ölens yta (där drycken möter skummet eller kanten) landar så nära hålets pinne som möjligt.',
			'Poäng: läs av siffran på området där ytan landade. Det är dina slag på hålet. Lägre är bättre, och de tryckta hazarderna vill man undvika.',
			'Hamnar ytan out of bounds, eller inte på något numrerat område, räknas hålet som 2 × par. Skriv 0 (visas som x) på coastern. Tomma hål räknas också som x när du signerar.',
			'Par står på coastern (standard 4-4-3-4-5-3-4-3-5 = 35). Lägst totalt efter nio hål vinner, med handikappet inräknat (netto).',
			'Du behöver inte spela alla nio hål på en gång. Spara coastern och spela klart en annan kväll.',
			'Det behöver inte vara öl. Beer Golf kan spelas med vilken dryck som helst.'
		]
	},
	{
		title: 'Räkning & signatur',
		rules: [
			'Hederssystemet gäller: du räknar dina egna slag. Är poängen tveksam mellan två områden tar du det högre (sämre) av dem.',
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
			'Räkna hålet så fort du ställt ner glaset. Vänta inte på att skummet lägger sig och ytan stiger.',
			'Många föredrar att ta nästa hål från där förra slaget landade i stället för att fylla på till tee-linjen.'
		]
	}
];
