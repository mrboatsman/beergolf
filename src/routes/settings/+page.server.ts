import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members, passkeys, sessions } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { requireMember } from '$lib/server/guard';
import { listPasskeys } from '$lib/server/passkeys';
import { avatarUrl, gravatarUrl } from '$lib/server/avatar';
import { storage } from '$lib/server/storage';
import { newId } from '$lib/server/ids';
import { isPushEnabled, listSubscriptions, sendPush } from '$lib/server/push';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	return {
		forced: me.mustChangePassword,
		passkeys: listPasskeys(me.id),
		push: { enabled: isPushEnabled(), devices: listSubscriptions(me.id) },
		avatar: {
			url: avatarUrl(me),
			hasCustom: !!me.avatarKey,
			gravatar: me.gravatar,
			gravatarUrl: gravatarUrl(me.email)
		}
	};
};

export const actions: Actions = {
	password: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (password.length < 8) return fail(400, { error: 'Minst 8 tecken.' });
		if (password !== confirm) return fail(400, { error: 'Lösenorden matchar inte.' });

		await db
			.update(members)
			.set({ passwordHash: await hashPassword(password), mustChangePassword: false })
			.where(eq(members.id, me.id));

		// Logga ut alla andra sessioner (engångslösenordet kan vara spritt)
		if (locals.session) {
			await db
				.delete(sessions)
				.where(and(eq(sessions.memberId, me.id), ne(sessions.id, locals.session.id)));
		}
		return { changed: true };
	},

	// --- Profilbild ---------------------------------------------------------
	setGravatar: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const on = form.get('gravatar') === '1';
		await db.update(members).set({ gravatar: on }).where(eq(members.id, me.id));
		return { avatarSaved: on ? 'Gravatar påslaget.' : 'Gravatar avstängt.' };
	},

	// Beskuren bild från klienten (JPEG, kvadratisk) → storage
	uploadAvatar: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const file = form.get('image');
		if (!(file instanceof File) || file.size === 0) return fail(400, { error: 'Ingen bild.' });
		if (file.type !== 'image/jpeg') return fail(400, { error: 'Bilden måste vara JPEG.' });
		if (file.size > 2 * 1024 * 1024) return fail(400, { error: 'Bilden är för stor (max 2 MB).' });
		const key = `avatars/${me.id}/${newId()}.jpg`;
		await storage.put(key, new Uint8Array(await file.arrayBuffer()), 'image/jpeg');
		await db.update(members).set({ avatarKey: key }).where(eq(members.id, me.id));
		if (me.avatarKey) await storage.remove(me.avatarKey).catch(() => {});
		return { avatarSaved: 'Profilbilden är sparad.' };
	},

	removeAvatar: async ({ locals }) => {
		const me = requireMember(locals.member);
		if (me.avatarKey) await storage.remove(me.avatarKey).catch(() => {});
		await db.update(members).set({ avatarKey: null }).where(eq(members.id, me.id));
		return { avatarSaved: 'Egen bild borttagen.' };
	},

	testPush: async ({ locals }) => {
		const me = requireMember(locals.member);
		await sendPush(me.id, {
			title: 'Beer Golf',
			body: 'Notiserna fungerar. Färre slag. Fler skål.',
			url: '/settings',
			tag: 'test'
		});
		return { pushTested: true };
	},

	deletePasskey: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const pk = await db.select().from(passkeys).where(eq(passkeys.id, id)).get();
		if (!pk || pk.memberId !== me.id) return fail(404, { error: 'Passkeyn finns inte.' });
		await db.delete(passkeys).where(eq(passkeys.id, id));
		return { passkeyDeleted: pk.name };
	}
};
