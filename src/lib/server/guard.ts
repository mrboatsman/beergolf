import { error, redirect } from '@sveltejs/kit';
import type { Role } from './db/schema';
import type { SafeMember } from './auth';

// Rollhierarki — högre tal = mer behörighet.
const RANK: Record<Role, number> = {
	aspirant: 0,
	member: 1,
	fadder: 2,
	captain: 3,
	admin: 4
};

export function hasRole(member: SafeMember | null, min: Role): boolean {
	return !!member && RANK[member.role] >= RANK[min];
}

/** Kräver inloggning. Redirectar till /login annars. */
export function requireMember(member: SafeMember | null, redirectTo = '/login'): SafeMember {
	if (!member) throw redirect(302, redirectTo);
	return member;
}

/** Kräver minst given roll. 403 om otillräcklig. */
export function requireRole(member: SafeMember | null, min: Role): SafeMember {
	const m = requireMember(member);
	if (!hasRole(m, min)) throw error(403, 'Otillräcklig behörighet');
	return m;
}
