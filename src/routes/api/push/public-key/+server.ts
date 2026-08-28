import { json } from '@sveltejs/kit';
import { isPushEnabled, publicKey } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json({ enabled: isPushEnabled(), publicKey: publicKey() });
