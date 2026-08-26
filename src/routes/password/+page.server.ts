import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Gammal adress — lösenordsbytet bor under Inställningar.
export const load: PageServerLoad = () => {
	throw redirect(301, '/settings');
};
