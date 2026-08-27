// FAQ-innehåll. Siffror som kan ändras i koden (HCP-start, faktor, gränser, par,
// min/max spelare) skickas in från servern via `vars` så texten alltid stämmer.
// Reglerna finns INTE här — sektionen "rules" renderar CoasterRules-komponenten.
export type FaqVars = {
	startHcp: number;
	factor: number;
	minHcp: number;
	maxHcp: number;
	minPlayers: number;
	maxPlayers: number;
	defaultPar: number[];
	parTotal: number;
	example: { hcp: number; gross: number; par: number; net: number; diff: number; next: number };
	quizPassPct: number;
};

export type FaqItem = { q: string; a: string[] }; // a = stycken
export type FaqSection = { id: string; title: string; items: FaqItem[] };

export function buildFaq(v: FaqVars): FaqSection[] {
	const par = v.defaultPar.join('-');
	const ex = v.example;
	return [
		{
			id: 'leaderboard',
			title: 'Leaderboard',
			items: [
				{
					q: 'Hur rankas leaderboarden?',
					a: [
						'På handikapp: lägst HCP ligger överst. Rankingen är global för hela klubben, även när listan är filtrerad eller uppdelad på sidor.',
						'Har flera samma HCP delar de plats — placeringen är antalet medlemmar med lägre HCP plus ett. Förstaplatsen (även delad) får en 🏆.'
					]
				},
				{
					q: 'Vad betyder kolumnerna?',
					a: [
						'Grönt Kort = ditt kortnummer (i den ordning korten utfärdats). Rundor = antal signerade rundor i år. Bästa brutto = lägsta bruttoresultat i år. Säsongen är kalenderåret.',
						'På mobil döljs Grönt Kort och Bästa brutto och namn förkortas ("Anders B.") så tabellen får plats.'
					]
				},
				{
					q: 'Varför syns aspiranter i listan?',
					a: [
						'Alla konton är med, men aspiranter har inget kortnummer och startar på samma HCP som alla andra. De kan inte spela coasters förrän grönt kort är utfärdat.'
					]
				}
			]
		},
		{
			id: 'handikapp',
			title: 'Handikapp (HCP)',
			items: [
				{
					q: 'Vad betyder HCP?',
					a: [
						'HCP är förkortningen för handikapp (från engelskans handicap). Det är talet som visas bredvid ditt namn på leaderboarden, i sidomenyn och på coastern — ju lägre, desto bättre spelar du.'
					]
				},
				{
					q: 'Var börjar jag?',
					a: [
						`Alla får HCP ${v.startHcp} när grönt kort utfärdas. Handikappet är självjusterande och rör sig efter varje signerad runda — lägre är bättre.`
					]
				},
				{
					q: 'Hur räknas nytt handikapp efter en runda?',
					a: [
						'Netto = brutto − ditt HCP före rundan. Skillnad = netto − coasterns par. Nytt HCP = HCP + skillnad × ' +
							v.factor +
							`, avrundat till en decimal och begränsat till ${v.minHcp}–${v.maxHcp}.`,
						`Exempel: HCP ${ex.hcp}, brutto ${ex.gross} på en coaster med par ${ex.par}. Netto = ${ex.gross} − ${ex.hcp} = ${ex.net}. Skillnad = ${ex.net} − ${ex.par} = ${ex.diff}. Nytt HCP = ${ex.hcp} ${ex.diff < 0 ? '−' : '+'} ${Math.abs(ex.diff)} × ${v.factor} = ${ex.next}.`,
						'Spelar du bättre än ditt handikapp (negativ skillnad) sänks det; sämre höjs det. Faktorn gör att ett enstaka dåligt varv inte slår igenom fullt ut.'
					]
				},
				{
					q: 'Vad är netto och varför används det?',
					a: [
						'Netto är brutto minus handikapp. Det jämnar ut spelarnas nivå så att en nybörjare på 36 kan mäta sig med en rutinerad spelare på 12 — därför avgörs vinnaren på en coaster på lägst netto.'
					]
				},
				{
					q: 'Kan jag registrera en runda utan coaster?',
					a: [
						'Nej. Score Coastern är enda sättet att bokföra en runda — det är signeringen där som skapar rundan och justerar HCP. "Rundor" i menyn är ren historik.'
					]
				},
				{
					q: 'Jag skrev fel — kan det rättas i efterhand?',
					a: [
						'Ja, be admin. Admin kan rätta poäng, häva en signatur eller ta bort en rad; ditt handikapp räknas då om från början i rätt ordning så att allt stämmer igen.'
					]
				}
			]
		},
		{
			id: 'regler',
			title: 'Regler',
			items: [
				{
					q: 'Vad betyder x på coastern?',
					a: [
						'x = out of bounds / missat hål och räknas som 2 × par för det hålet. Skriv 0 (eller en bokstav) i rutan så visas x. Hål som är tomma när du signerar räknas också som x — du får en fråga om det innan signeringen går igenom.'
					]
				},
				{
					q: 'Vad är par?',
					a: [
						`Coasterns par-rad. Standard är ${par} = ${v.parTotal}, men den som skapar coastern kan ange egen par-rad. Brutto räknas alltid mot coasterns par.`
					]
				}
			]
		},
		{
			id: 'coaster',
			title: 'Score Coaster & signering',
			items: [
				{
					q: 'Vem kan skapa en coaster och lägga till spelare?',
					a: [
						`Alla med grönt kort. Den som skapar blir spelare 1 och lägger till medspelare via namnsök (bara medlemmar med grönt kort). Max ${v.maxPlayers} spelare per coaster; alla på coastern kan ta bort en spelare som inte signerat.`
					]
				},
				{
					q: 'Måste jag trycka spara?',
					a: [
						'Nej. Poängen sparas automatiskt när du fyller i, och alla som tittar på coastern ser ändringarna direkt. Skriv en siffra per hål så hoppar markören vidare; tryck var som helst på pappret för att hamna i första tomma hålet.'
					]
				},
				{
					q: 'Vad händer när jag signerar?',
					a: [
						`Din rad låses, rundan bokförs och ditt HCP justeras. Det krävs minst ${v.minPlayers} spelare på coastern — man spelar inte ensam. Du behöver inte spela alla nio hål på en gång, men vid signering räknas tomma hål som x.`
					]
				},
				{
					q: 'Vem vinner?',
					a: [
						'När alla på coastern signerat räknas lägst netto som vinnare och ett guldmärke klistras på coastern. Lika netto ger delad seger.'
					]
				}
			]
		},
		{
			id: 'gront-kort',
			title: 'Grönt kort & fadder',
			items: [
				{
					q: 'Vad krävs för grönt kort?',
					a: [
						`Tre delar: teoriprovet (godkänt vid minst ${v.quizPassPct} %), praktiskt prov på provslingan som en fadder godkänner med bild eller film som bevis, samt etikett & hänsyn som faddern bedömer. När alla tre är klara utfärdas kortet automatiskt med nästa lediga nummer och HCP ${v.startHcp}.`,
						'Blir teoriprovet underkänt ser du facit. Du kan sedan godkänna teorin på heder ("Jag har lärt mig läxan") — försöken finns kvar i historiken.'
					]
				},
				{
					q: 'Vem får examinera?',
					a: [
						'Alla certifierade medlemmar kan godkänna praktiskt prov och etikett under Grönt Kort. Den som godkänner en aspirant blir dess fadder (rollen uppgraderas från medlem till fadder).'
					]
				},
				{
					q: 'Hur bjuder jag in någon?',
					a: [
						'Under Bjud in skapar du en invalskod (gäller 30 dagar) och delar länken, eller skriver ut kodkort med QR. När personen skapar sitt konto blir du automatiskt fadder och syns i fadderträdet under Admin.'
					]
				}
			]
		},
		{
			id: 'galleri',
			title: 'Galleri & baksidan',
			items: [
				{
					q: 'Vad är baksidan på en coaster?',
					a: [
						'När alla signerat kan du trycka på coastern så vänds den. Deltagarna kan ladda upp bilder (flytta, skala, rotera) och rita ovanpå — ett minne från kvällen. Andra kan titta men inte ändra.',
						'Baksidan låses två dagar efter sista signaturen så inget ändras av misstag i efterhand.'
					]
				},
				{
					q: 'Var hittar jag gamla coasters?',
					a: [
						'I Galleriet ligger alla färdigspelade coasters med baksidan framåt. Tryck på en för att se den stort, vänd för score och deltagare, svep för nästa.'
					]
				}
			]
		},
		{
			id: 'konto',
			title: 'Konto, app & inloggning',
			items: [
				{
					q: 'Kan jag installera Beer Golf som app?',
					a: [
						'Ja. iPhone: öppna sidan i Safari, tryck Dela → "Lägg till på hemskärmen". Android/Chrome: menyn → "Installera app". Då får du bottennavet och sidan öppnas utan webbläsarram.'
					]
				},
				{
					q: 'Kan jag logga in utan lösenord?',
					a: [
						'Ja, med passkey (Face ID, Touch ID eller enhetens lås). Lägg till en under Inställningar → Passkeys; på inloggningssidan väljer du sedan "Logga in med passkey".'
					]
				},
				{
					q: 'Hur ändrar jag profilbild?',
					a: [
						'Inställningar → Profilbild. Som standard används Gravatar (bilden kopplad till din e-post på gravatar.com); du kan stänga av det eller ladda upp en egen bild och beskära den i cirkeln.'
					]
				},
				{
					q: 'Jag har glömt mitt lösenord.',
					a: [
						'Kontakta admin som återställer det och ger dig ett engångslösenord — du tvingas byta till ett eget vid nästa inloggning. Byter du lösenord loggas dina andra enheter ut.'
					]
				}
			]
		}
	];
}
