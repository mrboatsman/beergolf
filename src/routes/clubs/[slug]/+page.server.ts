import { error, fail, redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clubMembers, clubs, members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { avatarUrl } from '$lib/server/avatar';
import { sendPush } from '$lib/server/push';
import {
	PRIMARY_CLUB_ID,
	applyToClub,
	approveApplication,
	clubCaptainIds,
	getClubBySlug,
	getMembership,
	isClubCaptain,
	reactivateClub,
	removeMembership,
	requireClubCaptain,
	setClubRole,
	setHomeClub
} from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

function loadClub(slug: string) {
	const club = getClubBySlug(slug);
	if (!club) throw error(404, 'Klubben finns inte.');
	return club;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = requireMember(locals.member);
	const club = loadClub(params.slug);
	const captain = isClubCaptain(me, club.id);
	const mine = getMembership(club.id, me.id) ?? null;

	const rows = db
		.select({
			id: members.id,
			name: members.name,
			email: members.email,
			avatarKey: members.avatarKey,
			gravatar: members.gravatar,
			hcp: members.hcp,
			memberNumber: members.memberNumber,
			status: members.status,
			homeClubId: members.homeClubId,
			clubRole: clubMembers.role,
			clubStatus: clubMembers.status,
			joinedAt: clubMembers.joinedAt,
			createdAt: clubMembers.createdAt
		})
		.from(clubMembers)
		.innerJoin(members, eq(clubMembers.memberId, members.id))
		.where(eq(clubMembers.clubId, club.id))
		.orderBy(asc(members.name))
		.all()
		.map(({ email, avatarKey, gravatar, ...m }) => ({
			...m,
			isHome: m.homeClubId === club.id,
			avatarUrl: avatarUrl({ email, avatarKey, gravatar })
		}));

	return {
		club,
		logoUrl: club.logoKey ? `/files/${club.logoKey}` : null,
		isPrimary: club.id === PRIMARY_CLUB_ID,
		isHome: me.homeClubId === club.id,
		isCaptain: captain,
		isAdmin: me.role === 'admin',
		membership: mine ? { role: mine.role, status: mine.status } : null,
		canJoin: !!me.greenCardIssuedAt,
		home: rows.filter((m) => m.clubStatus === 'active' && m.isHome),
		dual: rows.filter((m) => m.clubStatus === 'active' && !m.isHome),
		pending: captain ? rows.filter((m) => m.clubStatus === 'pending') : [],
		meId: me.id
	};
};

export const actions: Actions = {
	// Ansök om medlemskap (dubbelmedlemskap tills man byter hemmaklubb)
	apply: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const club = loadClub(params.slug);
		if (club.status !== 'active') return fail(400, { error: 'Klubben är arkiverad.' });
		if (!me.greenCardIssuedAt) return fail(403, { error: 'Grönt kort krävs.' });
		const status = applyToClub(club.id, me.id);
		if (status === 'active') return fail(400, { error: 'Du är redan medlem.' });
		void sendPush(clubCaptainIds(club.id), {
			title: `Ansökan till ${club.name}`,
			body: `${me.name} vill bli medlem. Godkänn på klubbsidan.`,
			url: `/clubs/${club.slug}`,
			tag: `club-apply-${club.id}`
		});
		return { applied: true };
	},

	// Dra tillbaka ansökan eller lämna klubben (ej hemmaklubb, ej huvudklubb)
	leave: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const club = loadClub(params.slug);
		if (club.id === PRIMARY_CLUB_ID) return fail(400, { error: 'Huvudklubben lämnar man inte.' });
		if (me.homeClubId === club.id) {
			return fail(400, { error: 'Byt hemmaklubb först — du kan inte lämna din hemmaklubb.' });
		}
		removeMembership(club.id, me.id);
		return { left: true };
	},

	// Gör klubben till min hemmaklubb (kräver aktivt medlemskap)
	setHome: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const club = loadClub(params.slug);
		const err = setHomeClub(me.id, club.id);
		if (err) return fail(400, { error: err });
		return { homeSet: true };
	},

	// --- Captain ------------------------------------------------------------
	approve: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		const m = getMembership(club.id, memberId);
		if (!m || m.status !== 'pending') return fail(404, { error: 'Ansökan finns inte.' });
		approveApplication(club.id, memberId);
		void sendPush(memberId, {
			title: `Välkommen till ${club.name}`,
			body: 'Din ansökan är godkänd. Nu kan du spela klubbens coasters.',
			url: `/clubs/${club.slug}`,
			tag: `club-approved-${club.id}`
		});
		return { approved: true };
	},

	reject: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		const m = getMembership(club.id, memberId);
		if (!m || m.status !== 'pending') return fail(404, { error: 'Ansökan finns inte.' });
		removeMembership(club.id, memberId);
		return { rejected: true };
	},

	// Ta bort medlem (ej hemmamedlem — de måste byta hemmaklubb först)
	removeMember: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		const me = requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		if (memberId === me.id) return fail(400, { error: 'Använd "Lämna klubben" för dig själv.' });
		const target = db.select().from(members).where(eq(members.id, memberId)).get();
		if (!target) return fail(404, { error: 'Medlemmen finns inte.' });
		if (target.homeClubId === club.id) {
			return fail(400, {
				error: `${target.name} har klubben som hemmaklubb och kan inte tas bort.`
			});
		}
		removeMembership(club.id, memberId);
		return { removed: target.name };
	},

	setRole: async ({ request, locals, params }) => {
		const club = loadClub(params.slug);
		const me = requireClubCaptain(locals.member, club.id);
		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		const role = String(form.get('role') ?? '');
		if (role !== 'member' && role !== 'captain') return fail(400, { error: 'Ogiltig roll.' });
		const m = getMembership(club.id, memberId);
		if (!m || m.status !== 'active') return fail(404, { error: 'Medlemmen finns inte i klubben.' });
		if (role === 'member' && memberId === me.id && me.role !== 'admin') {
			const captains = clubCaptainIds(club.id);
			if (captains.length <= 1) {
				return fail(400, { error: 'Klubben behöver minst en captain — utse någon annan först.' });
			}
		}
		setClubRole(club.id, memberId, role);
		return { roleSet: true };
	},

	// Bara sajtadmin återaktiverar
	reactivate: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		if (me.role !== 'admin') throw error(403, 'Bara admin.');
		const club = loadClub(params.slug);
		reactivateClub(club.id);
		return { reactivated: true };
	}
};
