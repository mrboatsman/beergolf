import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { hash, verify } from '@node-rs/argon2';
import { db } from './db';
import { members, sessions, type Member } from './db/schema';

const DAY = 1000 * 60 * 60 * 24;
export const SESSION_COOKIE = 'session';
const SESSION_TTL = 30 * DAY;

// --- Lösenord (argon2id) --------------------------------------------------
const ARGON = { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
	return hash(password, ARGON);
}
export function verifyPassword(digest: string, password: string): Promise<boolean> {
	return verify(digest, password, ARGON);
}

// --- Sessioner (token i cookie, sha256 lagras i db) -----------------------
export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	return encodeBase32LowerCaseNoPadding(bytes);
}

function tokenToId(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(token: string, memberId: string) {
	const id = tokenToId(token);
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(sessions).values({ id, memberId, expiresAt });
	return { id, memberId, expiresAt };
}

export async function validateSessionToken(token: string) {
	const id = tokenToId(token);
	const row = await db
		.select({ session: sessions, member: members })
		.from(sessions)
		.innerJoin(members, eq(sessions.memberId, members.id))
		.where(eq(sessions.id, id))
		.get();

	if (!row) return { session: null, member: null };
	const { session, member } = row;

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessions).where(eq(sessions.id, session.id));
		return { session: null, member: null };
	}
	// Förläng om mindre än halva TTL kvar
	if (Date.now() >= session.expiresAt.getTime() - SESSION_TTL / 2) {
		session.expiresAt = new Date(Date.now() + SESSION_TTL);
		await db
			.update(sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(sessions.id, session.id));
	}
	return { session, member };
}

export async function invalidateSession(id: string) {
	await db.delete(sessions).where(eq(sessions.id, id));
}

export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		secure: !import.meta.env.DEV
	});
}

export function deleteSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export type SafeMember = Omit<Member, 'passwordHash'>;
export function toSafeMember(m: Member): SafeMember {
	const { passwordHash: _drop, ...rest } = m;
	return rest;
}
