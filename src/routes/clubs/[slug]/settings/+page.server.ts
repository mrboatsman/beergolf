import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clubs } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { storage } from '$lib/server/storage';
import { newId } from '$lib/server/ids';
import {
	MAX_CLUB_NAME,
	PRIMARY_CLUB_ID,
	archiveClub,
	getClubBySlug,
	requireClubCaptain
} from '$lib/server/clubs';
import { currentSeason, getSeasonConfig, setSeasonConfig } from '$lib/server/seasons';
import type { Actions, PageServerLoad } from './$types';

// Klubbinställningar — egen sida bakom kugghjulet på klubbsidan. Bara captain
// (eller admin). Namn/beskrivning, logga, säsongsstart, arkivering.
function loadClub(slug: string) {
	const club = getClubBySlug(slug);
	if (!club) throw error(404, 'Klubben finns inte.');
	return club;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = requireMember(locals.member);
	const club = loadClub(params.slug);
	requireClubCaptain(me, club.id);
	if (club.status !== 'active') throw redirect(303, `/clubs/${club.slug}`);
	return {
		club,
		logoUrl: club.logoKey ? `/files/${club.logoKey}` : null,
		isPrimary: club.id === PRIMARY_CLUB_ID,
		season: { ...getSeasonConfig(club.id), label: currentSeason(club.id).label },
		maxName: MAX_CLUB_NAME
	};
};

export const actions: Actions = {
	rename: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const name = String(form.get('name') ?? '')
			.trim()
			.replace(/\s+/g, ' ');
		const description = String(form.get('description') ?? '').trim() || null;
		if (name.length < 3 || name.length > MAX_CLUB_NAME) {
			return fail(400, { error: `Namnet måste vara 3–${MAX_CLUB_NAME} tecken.` });
		}
		db.update(clubs).set({ name, description }).where(eq(clubs.id, club.id)).run();
		return { renamed: true };
	},

	// Klubblogga: beskuren JPEG från klienten (AvatarCropper) → storage, som profilbild
	uploadLogo: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const file = form.get('image');
		if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Ingen bild.' });
		if (file.type !== 'image/jpeg') return fail(400, { error: 'Bilden måste vara JPEG.' });
		if (file.size > 2 * 1024 * 1024) return fail(400, { error: 'Bilden är för stor (max 2 MB).' });
		const key = `clubs/${club.id}/logo-${newId()}.jpg`;
		await storage.put(key, new Uint8Array(await file.arrayBuffer()), 'image/jpeg');
		db.update(clubs).set({ logoKey: key }).where(eq(clubs.id, club.id)).run();
		if (club.logoKey) await storage.remove(club.logoKey).catch(() => {});
		return { logoSaved: true };
	},

	removeLogo: async ({ locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		if (club.logoKey) await storage.remove(club.logoKey).catch(() => {});
		db.update(clubs).set({ logoKey: null }).where(eq(clubs.id, club.id)).run();
		return { logoRemoved: true };
	},

	// Säsongsstart per klubb (månad/dag). Ändring kastar klubbens cachade arkiv.
	setSeason: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const startMonth = Number(form.get('startMonth'));
		const startDay = Number(form.get('startDay'));
		if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12)
			return fail(400, { error: 'Ogiltig månad.' });
		if (!Number.isInteger(startDay) || startDay < 1 || startDay > 28)
			return fail(400, { error: 'Dag 1–28.' });
		setSeasonConfig(club.id, { startMonth, startDay });
		return { seasonSaved: currentSeason(club.id).label };
	},

	// Arkivera: hemmamedlemmar flyttas till huvudklubben. Tillbaka till klubbsidan.
	archive: async ({ locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		if (club.id === PRIMARY_CLUB_ID)
			return fail(400, { error: 'Huvudklubben kan inte arkiveras.' });
		archiveClub(club.id);
		throw redirect(303, `/clubs/${club.slug}`);
	}
};
