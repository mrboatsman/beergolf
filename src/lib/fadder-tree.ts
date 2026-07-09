// Fadderträdet: vem har godkänt vilka. Rekursiv struktur — en fadder kan
// ha hur många skyddslingar som helst, och skyddslingarna kan i sin tur
// bli faddrar. Ren modul: används både server-side (bygga trädet) och
// client-side (fokusera/söka i d3-visualiseringen).

export type FadderNode = {
	id: string;
	name: string;
	role: string;
	status: string;
	children: FadderNode[];
};

export function buildFadderTree(
	all: Array<{ id: string; name: string; role: string; status: string }>,
	relations: Array<{ memberId: string; fadderId: string }>
): FadderNode[] {
	const childrenBy = new Map<string, string[]>();
	const hasFadder = new Set<string>();
	for (const r of relations) {
		hasFadder.add(r.memberId);
		childrenBy.set(r.fadderId, [...(childrenBy.get(r.fadderId) ?? []), r.memberId]);
	}
	const byId = new Map(all.map((m) => [m.id, m]));
	const visited = new Set<string>();

	function node(id: string): FadderNode | null {
		const m = byId.get(id);
		if (!m || visited.has(id)) return null;
		visited.add(id);
		return {
			id: m.id,
			name: m.name,
			role: m.role,
			status: m.status,
			children: (childrenBy.get(id) ?? []).map(node).filter((n): n is FadderNode => n !== null)
		};
	}

	return all
		.filter((m) => !hasFadder.has(m.id))
		.map((m) => node(m.id))
		.filter((n): n is FadderNode => n !== null);
}

/** Alla noder i skogen, platt. */
export function flattenForest(forest: FadderNode[]): FadderNode[] {
	const out: FadderNode[] = [];
	const walk = (n: FadderNode) => {
		out.push(n);
		n.children.forEach(walk);
	};
	forest.forEach(walk);
	return out;
}

/**
 * En medlems "relaterade träd": fadder-kedjan upp till roten (som enkel
 * kedja) + medlemmens alla skyddslingar neråt.
 */
export function focusForest(forest: FadderNode[], id: string): FadderNode[] {
	function findPath(n: FadderNode, path: FadderNode[]): FadderNode[] | null {
		const next = [...path, n];
		if (n.id === id) return next;
		for (const c of n.children) {
			const hit = findPath(c, next);
			if (hit) return hit;
		}
		return null;
	}

	for (const root of forest) {
		const path = findPath(root, []);
		if (!path) continue;
		// Behåll målnodens hela underträd, förfäderna blir en enkel kedja.
		let current = path[path.length - 1];
		for (let i = path.length - 2; i >= 0; i--) {
			current = { ...path[i], children: [current] };
		}
		return [current];
	}
	return forest;
}
