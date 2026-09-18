// Klubbar: hemmaklubb + dubbelmedlemskap (modell som svensk golf).
//
// - Varje medlem har EXAKT en hemmaklubb (members.homeClubId): där bokförs
//   leaderboard, säsongsstatistik och turneringsrepresentation.
// - Dubbelmedlemskap = fler rader i club_members. Dubbelmedlemmar kan spela
//   klubbens coasters och se galleriet, men rankas inte där.
// - HCP och grönt kort är globala (följer personen).
// - Huvudklubben (PRIMARY_CLUB_ID) är alla med grönt kort automatiskt med i.
// - Klubbar utan aktivitet i CLUB_INACTIVITY_MS arkiveras; hemmamedlemmar
//   flyttas till huvudklubben.
import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import { db } from './db';
import {
	PRIMARY_CLUB_ID,
	clubMembers,
	clubs,
	members,
	type Club,
	type ClubMember,
	type ClubRole
} from './db/schema';
import { newId } from './ids';
import type { SafeMember } from './auth';

export { PRIMARY_CLUB_ID };
// Ett år utan coaster/signatur/turnering ⇒ klubben arkiveras
export const CLUB_INACTIVITY_MS = 365 * 24 * 60 * 60 * 1000;
export const MAX_CLUB_NAME = 60;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

// --- Läsning ----------------------------------------------------------------
export function getClub(id: string): Club | undefined {
	return db.select().from(clubs).where(eq(clubs.id, id)).get();
}

export function getClubBySlug(slug: string): Club | undefined {
	return db.select().from(clubs).where(eq(clubs.slug, slug)).get();
}

export function requireClub(id: string): Club {
	const c = getClub(id);
	if (!c) throw error(404, 'Klubben finns inte.');
	return c;
}

export function getMembership(clubId: string, memberId: string): ClubMember | undefined {
	return db
		.select()
		.from(clubMembers)
		.where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)))
		.get();
}

export function isActiveMember(clubId: string, memberId: string): boolean {
	return getMembership(clubId, memberId)?.status === 'active';
}

/** Sajtadmin eller klubbmästare i klubben. */
export function isClubCaptain(member: SafeMember | null, clubId: string): boolean {
	if (!member) return false;
	if (member.role === 'admin') return true;
	const m = getMembership(clubId, member.id);
	return m?.status === 'active' && m.role === 'captain';
}

export function requireClubCaptain(member: SafeMember | null, clubId: string): SafeMember {
	if (!member) throw error(401, 'Logga in.');
	if (!isClubCaptain(member, clubId)) throw error(403, 'Bara klubbmästare (captain) får göra det.');
	return member;
}

export type MyClub = {
	id: string;
	slug: string;
	name: string;
	role: ClubRole;
	status: 'pending' | 'active';
	isHome: boolean;
	clubStatus: 'active' | 'archived';
};

/** Medlemmens klubbar (aktiva medlemskap + väntande ansökningar), hemmaklubb först. */
export function myClubs(member: Pick<SafeMember, 'id' | 'homeClubId'>): MyClub[] {
	return db
		.select({
			id: clubs.id,
			slug: clubs.slug,
			name: clubs.name,
			role: clubMembers.role,
			status: clubMembers.status,
			clubStatus: clubs.status
		})
		.from(clubMembers)
		.innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
		.where(eq(clubMembers.memberId, member.id))
		.orderBy(asc(clubs.name))
		.all()
		.map((c) => ({ ...c, isHome: c.id === member.homeClubId }))
		.sort((a, b) => Number(b.isHome) - Number(a.isHome));
}

/**
 * Klubbkontext för en sida — väljs PÅ PLATS, inget globalt läge:
 * `?club=<slug>` om medlemmen är aktiv medlem där (admin: valfri aktiv klubb),
 * annars hemmaklubben. `clubs` = medlemmens aktiva klubbar (för flikar/val).
 */
export function pickClub(
	member: SafeMember,
	url: URL
): { club: Club; role: ClubRole | null; clubs: MyClub[] } {
	const clubs = myClubs(member).filter((c) => c.status === 'active' && c.clubStatus === 'active');
	const slug = url.searchParams.get('club');
	if (slug) {
		const mine = clubs.find((c) => c.slug === slug);
		if (mine) return { club: requireClub(mine.id), role: mine.role, clubs };
		if (member.role === 'admin') {
			const c = getClubBySlug(slug);
			if (c && c.status === 'active') return { club: c, role: 'captain', clubs };
		}
	}
	return pickClubById(member, member.homeClubId, clubs);
}

/** Klubb vald i ett formulär (clubId) — måste vara en av medlemmens klubbar (admin: valfri). */
export function pickClubById(
	member: SafeMember,
	clubId: string | null | undefined,
	clubs = myClubs(member).filter((c) => c.status === 'active' && c.clubStatus === 'active')
): { club: Club; role: ClubRole | null; clubs: MyClub[] } {
	const mine = clubId ? clubs.find((c) => c.id === clubId) : undefined;
	if (mine) return { club: requireClub(mine.id), role: mine.role, clubs };
	if (clubId && member.role === 'admin') {
		const c = getClub(clubId);
		if (c && c.status === 'active') return { club: c, role: 'captain', clubs };
	}
	const home = clubs.find((c) => c.id === member.homeClubId) ?? clubs[0];
	if (home) return { club: requireClub(home.id), role: home.role, clubs };
	return { club: requireClub(PRIMARY_CLUB_ID), role: null, clubs };
}

/** Alla aktiva klubbar (admin-formulär). */
export function listActiveClubs(): Pick<Club, 'id' | 'slug' | 'name'>[] {
	return db
		.select({ id: clubs.id, slug: clubs.slug, name: clubs.name })
		.from(clubs)
		.where(eq(clubs.status, 'active'))
		.orderBy(sql`${clubs.id} = ${PRIMARY_CLUB_ID} desc`, asc(clubs.name))
		.all();
}

// --- Skrivning --------------------------------------------------------------

/** Se till att medlemmen är aktiv medlem i klubben (uppgraderar pending, rör ej captain). */
export function ensureMembership(
	tx: Tx,
	clubId: string,
	memberId: string,
	role: ClubRole = 'member'
) {
	const existing = tx
		.select()
		.from(clubMembers)
		.where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)))
		.get();
	if (!existing) {
		tx.insert(clubMembers)
			.values({ id: newId(), clubId, memberId, role, status: 'active', joinedAt: new Date() })
			.run();
	} else if (existing.status !== 'active' || (role === 'captain' && existing.role !== 'captain')) {
		tx.update(clubMembers)
			.set({
				status: 'active',
				joinedAt: existing.joinedAt ?? new Date(),
				role: role === 'captain' ? 'captain' : existing.role
			})
			.where(eq(clubMembers.id, existing.id))
			.run();
	}
}

export function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/å|ä/g, 'a')
		.replace(/ö/g, 'o')
		.replace(/é/g, 'e')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
}

/** Skapa klubb — skaparen blir captain (och hemmamedlem om makeHome). */
export function createClub(
	name: string,
	description: string | null,
	creator: SafeMember,
	makeHome: boolean
): Club {
	const base = slugify(name) || 'klubb';
	let slug = base;
	for (let i = 2; getClubBySlug(slug); i++) slug = `${base}-${i}`;
	const id = newId();
	db.transaction((tx) => {
		tx.insert(clubs).values({ id, slug, name, description, createdBy: creator.id }).run();
		ensureMembership(tx, id, creator.id, 'captain');
		if (makeHome)
			tx.update(members).set({ homeClubId: id }).where(eq(members.id, creator.id)).run();
	});
	return requireClub(id);
}

/** Ansök om (dubbel)medlemskap — captain godkänner. */
export function applyToClub(clubId: string, memberId: string) {
	const existing = getMembership(clubId, memberId);
	if (existing) return existing.status;
	db.insert(clubMembers)
		.values({ id: newId(), clubId, memberId, role: 'member', status: 'pending' })
		.run();
	return 'pending' as const;
}

export function approveApplication(clubId: string, memberId: string) {
	db.transaction((tx) => ensureMembership(tx, clubId, memberId));
}

export function removeMembership(clubId: string, memberId: string) {
	db.delete(clubMembers)
		.where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.memberId, memberId)))
		.run();
}

export function setClubRole(clubId: string, memberId: string, role: ClubRole) {
	db.update(clubMembers)
		.set({ role })
		.where(
			and(
				eq(clubMembers.clubId, clubId),
				eq(clubMembers.memberId, memberId),
				eq(clubMembers.status, 'active')
			)
		)
		.run();
}

/** Byt hemmaklubb — kräver aktivt medlemskap i klubben. */
export function setHomeClub(memberId: string, clubId: string): string | null {
	const club = getClub(clubId);
	if (!club || club.status !== 'active') return 'Klubben finns inte eller är arkiverad.';
	if (!isActiveMember(clubId, memberId)) return 'Du måste vara medlem i klubben först.';
	db.update(members).set({ homeClubId: clubId }).where(eq(members.id, memberId)).run();
	return null;
}

/** Captains i klubben (för notiser). */
export function clubCaptainIds(clubId: string): string[] {
	return db
		.select({ id: clubMembers.memberId })
		.from(clubMembers)
		.where(
			and(
				eq(clubMembers.clubId, clubId),
				eq(clubMembers.role, 'captain'),
				eq(clubMembers.status, 'active')
			)
		)
		.all()
		.map((r) => r.id);
}

/** Stämpla aktivitet (coaster skapad/signerad, turnering) — håller klubben levande. */
export function touchClub(clubId: string) {
	db.update(clubs).set({ lastActivityAt: new Date() }).where(eq(clubs.id, clubId)).run();
}

/** Arkivera: hemmamedlemmar flyttas till huvudklubben. Medlemskapen behålls. */
export function archiveClub(clubId: string) {
	if (clubId === PRIMARY_CLUB_ID) return;
	db.transaction((tx) => {
		const homies = tx
			.select({ id: members.id })
			.from(members)
			.where(eq(members.homeClubId, clubId))
			.all();
		for (const m of homies) ensureMembership(tx, PRIMARY_CLUB_ID, m.id);
		tx.update(members)
			.set({ homeClubId: PRIMARY_CLUB_ID })
			.where(eq(members.homeClubId, clubId))
			.run();
		tx.update(clubs)
			.set({ status: 'archived', archivedAt: new Date() })
			.where(eq(clubs.id, clubId))
			.run();
	});
}

export function reactivateClub(clubId: string) {
	db.update(clubs)
		.set({ status: 'active', archivedAt: null, lastActivityAt: new Date() })
		.where(eq(clubs.id, clubId))
		.run();
}

// Lat städning: körs från root-layoutens load, högst en gång i timmen per process.
let lastSweep = 0;
export function sweepInactiveClubs(now = Date.now()) {
	if (now - lastSweep < 60 * 60 * 1000) return;
	lastSweep = now;
	const stale = db
		.select({ id: clubs.id })
		.from(clubs)
		.where(
			and(
				eq(clubs.status, 'active'),
				ne(clubs.id, PRIMARY_CLUB_ID),
				lt(clubs.lastActivityAt, new Date(now - CLUB_INACTIVITY_MS))
			)
		)
		.all();
	for (const c of stale) archiveClub(c.id);
}

/** Medlems-id:n för aktiva medlemmar i klubben (för notiser/filter). */
export function activeMemberIds(clubId: string): string[] {
	return db
		.select({ id: clubMembers.memberId })
		.from(clubMembers)
		.where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.status, 'active')))
		.all()
		.map((r) => r.id);
}

/** Antal aktiva medlemmar per klubb. */
export function memberCounts(clubIds: string[]): Map<string, number> {
	if (!clubIds.length) return new Map();
	const rows = db
		.select({ clubId: clubMembers.clubId, n: sql<number>`count(*)` })
		.from(clubMembers)
		.where(and(inArray(clubMembers.clubId, clubIds), eq(clubMembers.status, 'active')))
		.groupBy(clubMembers.clubId)
		.all();
	return new Map(rows.map((r) => [r.clubId, r.n]));
}
