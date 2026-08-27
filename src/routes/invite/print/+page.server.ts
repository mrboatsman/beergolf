import { error } from '@sveltejs/kit';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db } from '$lib/server/db';
import { invites, members } from '$lib/server/db/schema';
import { hasRole, requireRole } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

const MAX_CARDS = 40; // 10 ark

// Utskrift av invalskort (85×55 mm, 4 per A4, speglad baksida med QR).
// ?codes=A,B,C väljer koder; utan param: alla egna öppna koder.
// Bara egna koder (captain+ får skriva ut allas). Använda/utgångna koder ignoreras.
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireRole(locals.member, 'member');
	const staff = hasRole(me, 'captain');
	const wanted = (url.searchParams.get('codes') ?? '')
		.split(',')
		.map((c) => c.trim().toUpperCase())
		.filter(Boolean)
		.slice(0, MAX_CARDS);

	const rows = db
		.select({
			code: invites.code,
			createdBy: invites.createdBy,
			expiresAt: invites.expiresAt,
			creatorName: members.name
		})
		.from(invites)
		.leftJoin(members, eq(invites.createdBy, members.id))
		.where(
			and(
				isNull(invites.usedBy),
				wanted.length ? inArray(invites.code, wanted) : eq(invites.createdBy, me.id)
			)
		)
		.all()
		.filter((r) => !r.expiresAt || r.expiresAt.getTime() > Date.now())
		.filter((r) => staff || r.createdBy === me.id)
		.slice(0, MAX_CARDS);

	if (wanted.length && rows.length === 0) throw error(404, 'Inga giltiga koder att skriva ut.');

	const base = `${url.origin}/join?code=`;
	const cards = await Promise.all(
		rows.map(async (r) => {
			const link = base + r.code;
			const qrSvg = await QRCode.toString(link, {
				type: 'svg',
				errorCorrectionLevel: 'M',
				margin: 1,
				color: { dark: '#17382b', light: '#ffffff' }
			});
			return { code: r.code, url: link, qrSvg, creatorName: r.creatorName };
		})
	);

	return { cards, host: url.host, joinUrl: `${url.host}/join` };
};
