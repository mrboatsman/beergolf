// Svelte-action för poängfält på coastern: bara en siffra (1–9), numeriskt
// tangentbord, och fokus hoppar automatiskt till nästa hål när siffran är
// ifylld. Backspace i tomt fält går tillbaka till föregående hål.
export const MAX_HOLE_SCORE = 9;

export function scoreInput(el: HTMLInputElement) {
	el.type = 'text';
	el.inputMode = 'numeric';
	el.maxLength = 1;
	el.pattern = '[1-9]';
	el.autocomplete = 'off';

	function siblings(): HTMLInputElement[] {
		// form.elements täcker även fält kopplade via form="…"-attributet
		const list = el.form ? [...el.form.elements] : [...document.querySelectorAll('input')];
		return list.filter(
			(e): e is HTMLInputElement => e instanceof HTMLInputElement && 'scoreInput' in e.dataset
		);
	}
	function move(delta: number) {
		const all = siblings();
		const next = all[all.indexOf(el) + delta];
		if (next) {
			next.focus();
			next.select();
		}
	}
	function onInput() {
		// Behåll bara sista siffran 1–9 (0 och bokstäver ignoreras)
		const digit = el.value.replace(/[^1-9]/g, '').slice(-1);
		el.value = digit;
		if (digit) move(1);
	}
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Backspace' && el.value === '') {
			e.preventDefault();
			move(-1);
		} else if (e.key === 'ArrowRight') move(1);
		else if (e.key === 'ArrowLeft') move(-1);
	}
	function onFocus() {
		el.select();
	}

	el.dataset.scoreInput = '';
	el.addEventListener('input', onInput);
	el.addEventListener('keydown', onKeydown);
	el.addEventListener('focus', onFocus);
	return {
		destroy() {
			el.removeEventListener('input', onInput);
			el.removeEventListener('keydown', onKeydown);
			el.removeEventListener('focus', onFocus);
		}
	};
}
