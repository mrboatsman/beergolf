import { randomBytes, randomUUID } from 'node:crypto';

export function newId(): string {
	return randomUUID();
}

// Kort, läsbar invite-kod (utan lättförväxlade tecken).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newInviteCode(len = 8): string {
	const bytes = randomBytes(len);
	let out = '';
	for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
	return out;
}
