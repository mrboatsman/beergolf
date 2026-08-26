// Passkeys (WebAuthn) via @simplewebauthn. RP-id = värdnamnet i requesten
// (bakom proxy: ORIGIN styr url.origin). Challenge lagras i en kort httpOnly-
// cookie mellan options- och verify-anropet.
import type { RequestEvent } from '@sveltejs/kit';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransportFuture,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { members, passkeys } from './db/schema';

const RP_NAME = 'Tablers Beer Golf Society';
const CHALLENGE_COOKIE = 'pk_challenge';
const CHALLENGE_TTL = 5 * 60; // sekunder

function rp(event: RequestEvent) {
	return { rpID: event.url.hostname, origin: event.url.origin };
}

function setChallenge(event: RequestEvent, challenge: string) {
	event.cookies.set(CHALLENGE_COOKIE, challenge, {
		path: '/api/passkey',
		httpOnly: true,
		sameSite: 'strict',
		secure: event.url.protocol === 'https:',
		maxAge: CHALLENGE_TTL
	});
}

function takeChallenge(event: RequestEvent): string | null {
	const c = event.cookies.get(CHALLENGE_COOKIE) ?? null;
	event.cookies.delete(CHALLENGE_COOKIE, { path: '/api/passkey' });
	return c;
}

const toB64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const fromB64url = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

export function listPasskeys(memberId: string) {
	return db
		.select({
			id: passkeys.id,
			name: passkeys.name,
			deviceType: passkeys.deviceType,
			backedUp: passkeys.backedUp,
			createdAt: passkeys.createdAt,
			lastUsedAt: passkeys.lastUsedAt
		})
		.from(passkeys)
		.where(eq(passkeys.memberId, memberId))
		.all();
}

// --- Registrering (inloggad) ---------------------------------------------
export async function registrationOptions(
	event: RequestEvent,
	member: { id: string; email: string; name: string }
) {
	const existing = db.select().from(passkeys).where(eq(passkeys.memberId, member.id)).all();
	const options = await generateRegistrationOptions({
		rpName: RP_NAME,
		rpID: rp(event).rpID,
		userName: member.email,
		userDisplayName: member.name,
		attestationType: 'none',
		excludeCredentials: existing.map((p) => ({
			id: p.id,
			transports: p.transports as AuthenticatorTransportFuture[] | undefined
		})),
		authenticatorSelection: {
			residentKey: 'required', // discoverable: logga in utan att skriva e-post
			userVerification: 'preferred'
		}
	});
	setChallenge(event, options.challenge);
	return options;
}

export async function verifyRegistration(
	event: RequestEvent,
	memberId: string,
	response: RegistrationResponseJSON,
	name: string
) {
	const expectedChallenge = takeChallenge(event);
	if (!expectedChallenge) throw new Error('Utmaningen har gått ut — försök igen.');
	const { rpID, origin } = rp(event);
	const { verified, registrationInfo } = await verifyRegistrationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin,
		expectedRPID: rpID,
		requireUserVerification: false
	});
	if (!verified || !registrationInfo) throw new Error('Passkeyn kunde inte verifieras.');
	const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
	await db.insert(passkeys).values({
		id: credential.id,
		memberId,
		publicKey: toB64url(credential.publicKey),
		counter: credential.counter,
		transports: credential.transports ?? null,
		deviceType: credentialDeviceType,
		backedUp: credentialBackedUp,
		name: name.trim().slice(0, 40) || 'Passkey'
	});
	return credential.id;
}

// --- Inloggning (utloggad) ------------------------------------------------
export async function authenticationOptions(event: RequestEvent) {
	const options = await generateAuthenticationOptions({
		rpID: rp(event).rpID,
		userVerification: 'preferred'
		// inga allowCredentials: discoverable credential väljs i enheten
	});
	setChallenge(event, options.challenge);
	return options;
}

/** Verifierar och returnerar medlemmen (kastar vid fel). */
export async function verifyAuthentication(
	event: RequestEvent,
	response: AuthenticationResponseJSON
) {
	const expectedChallenge = takeChallenge(event);
	if (!expectedChallenge) throw new Error('Utmaningen har gått ut — försök igen.');
	const pk = await db.select().from(passkeys).where(eq(passkeys.id, response.id)).get();
	if (!pk) throw new Error('Okänd passkey.');
	const { rpID, origin } = rp(event);
	const { verified, authenticationInfo } = await verifyAuthenticationResponse({
		response,
		expectedChallenge,
		expectedOrigin: origin,
		expectedRPID: rpID,
		requireUserVerification: false,
		credential: {
			id: pk.id,
			publicKey: fromB64url(pk.publicKey),
			counter: pk.counter,
			transports: pk.transports as AuthenticatorTransportFuture[] | undefined
		}
	});
	if (!verified) throw new Error('Passkeyn kunde inte verifieras.');
	await db
		.update(passkeys)
		.set({ counter: authenticationInfo.newCounter, lastUsedAt: new Date() })
		.where(eq(passkeys.id, pk.id));
	const member = await db.select().from(members).where(eq(members.id, pk.memberId)).get();
	if (!member) throw new Error('Medlemmen finns inte.');
	return member;
}
