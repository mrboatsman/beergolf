import { asc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { certificationProofs, certifications, members, START_HCP } from './db/schema';

/** Certifieringsstatus för en medlem — de tre delarna av grönt kort. */
export async function getCertStatus(memberId: string) {
	const cert = await db
		.select()
		.from(certifications)
		.where(eq(certifications.memberId, memberId))
		.get();

	const fadder = cert?.fadderId
		? await db
				.select({ name: members.name })
				.from(members)
				.where(eq(members.id, cert.fadderId))
				.get()
		: null;

	const proofs = cert
		? await db
				.select({
					id: certificationProofs.id,
					storageKey: certificationProofs.storageKey,
					filename: certificationProofs.filename,
					contentType: certificationProofs.contentType
				})
				.from(certificationProofs)
				.where(eq(certificationProofs.certificationId, cert.id))
				.orderBy(asc(certificationProofs.createdAt))
				.all()
		: [];

	return {
		theory: {
			passed: cert?.theoryPassed ?? false,
			autoPassed: cert?.theoryAutoPassed ?? false,
			score: cert?.theoryScore ?? null,
			at: cert?.theoryAt ?? null
		},
		practical: {
			passed: cert?.practicalPassed ?? false,
			at: cert?.practicalAt ?? null,
			comment: cert?.practicalComment ?? null,
			proofs: proofs.map((p) => ({
				id: p.id,
				url: `/files/${p.storageKey}`,
				filename: p.filename,
				contentType: p.contentType
			}))
		},
		etiquette: { passed: cert?.etiquettePassed ?? false },
		fadderName: fadder?.name ?? null,
		certifiedAt: cert?.certifiedAt ?? null
	};
}

/**
 * Utfärda grönt kort om alla tre delar är godkända.
 * Ger nästa lediga medlemsnummer, aktiverar kontot och sätter ingångs-HCP.
 */
export async function maybeIssueGreenCard(memberId: string) {
	const member = await db.select().from(members).where(eq(members.id, memberId)).get();
	if (!member || member.status !== 'aspirant') return false;

	const cert = await db
		.select()
		.from(certifications)
		.where(eq(certifications.memberId, memberId))
		.get();
	if (!cert || !cert.theoryPassed || !cert.practicalPassed || !cert.etiquettePassed) return false;

	const now = new Date();
	db.transaction((tx) => {
		const next =
			(tx
				.select({ max: sql<number | null>`max(${members.memberNumber})` })
				.from(members)
				.get()?.max ?? 0) + 1;
		tx.update(members)
			.set({
				status: 'active',
				role: member.role === 'aspirant' ? 'member' : member.role,
				memberNumber: next,
				greenCardIssuedAt: now,
				hcp: START_HCP
			})
			.where(eq(members.id, memberId))
			.run();
		tx.update(certifications).set({ certifiedAt: now }).where(eq(certifications.id, cert.id)).run();
	});
	return true;
}
