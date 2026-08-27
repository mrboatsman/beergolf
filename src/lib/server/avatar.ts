// Profilbild-URL för en medlem. Egen bild > Gravatar (om påslaget) > null (initialer).
// Gravatar-hashen räknas här så e-posten aldrig behöver skickas till klienten.
import { createHash } from 'node:crypto';

export const GRAVATAR_SIZE = 160;

export function gravatarUrl(email: string, size = GRAVATAR_SIZE): string {
	const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
	// d=404 → 404 om ingen Gravatar finns; klienten faller då tillbaka på initialer
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

export function avatarUrl(m: {
	email: string;
	avatarKey?: string | null;
	gravatar?: boolean | null;
}): string | null {
	if (m.avatarKey) return `/files/${m.avatarKey}`;
	if (m.gravatar !== false) return gravatarUrl(m.email);
	return null;
}
