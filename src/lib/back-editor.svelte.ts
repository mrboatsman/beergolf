// Delat redigeringsläge för coasterns baksida: kortet (CoasterBack) och
// verktygsraden (CoasterBackToolbar) läser/skriver samma instans.
export const BACK_W = 1200; // logisk bredd
export const BACK_H = 900; // logisk höjd (4:3)
export const IMAGE_BASE_W = 600; // scale 1 = 600 logiska px bred

export const COLORS = ['#1d3b2e', '#c9a227', '#b3261e', '#1f4fa3', '#ffffff', '#111111'];

export type BackImage = {
	id: string;
	storageKey: string;
	width: number;
	height: number;
	x: number;
	y: number;
	scale: number;
	rotation: number;
	z: number;
};

export type Mode = 'draw' | 'images';

export class BackEditor {
	mode = $state<Mode>('draw');
	color = $state(COLORS[0]);
	size = $state(6);
	selectedId = $state<string | null>(null);
	status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	// Lokala kopior av bilderna (uppdateras optimistiskt under drag/pinch)
	images = $state<BackImage[]>([]);
	// Kopplas av kortkomponenten
	clearDrawing: () => void = () => {};
	nudge: (
		patch: Partial<Pick<BackImage, 'scale' | 'rotation'>>,
		delta?: { ds?: number; dr?: number }
	) => void = () => {};
	remove: (id: string) => void = () => {};
	upload: (files: FileList) => void = () => {};
}
