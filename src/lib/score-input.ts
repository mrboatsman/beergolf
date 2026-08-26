// Svelte-action för poängfält på coastern: ett tecken (1–9 = slag, 0/bokstav = x =
// dubbelt par), numeriskt tangentbord, och fokus hoppar automatiskt till nästa hål när siffran är
// ifylld. Backspace i tomt fält går tillbaka till föregående hål.
export { MAX_HOLE_SCORE } from './scoring';

export function scoreInput(el: HTMLInputElement) {
	el.type = 'text';
	el.inputMode = 'numeric'; // mobil: sifferknappsats; 0 = x
	el.maxLength = 1;
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
		// Sista tecknet: 1–9 = slag, allt annat (0, bokstav) = x (dubbelt par)
		const last = el.value.slice(-1);
		const v = last === '' ? '' : /[1-9]/.test(last) ? last : 'x';
		el.value = v;
		if (v) move(1);
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
