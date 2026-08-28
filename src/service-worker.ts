/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// PWA service worker (registreras automatiskt av SvelteKit).
// Strategi: byggda assets + static-filer cachas vid install (app-skalet).
// Sidor/HTML och API går alltid mot nätet (inloggning, poäng, HCP måste vara
// färska); offline visas en enkel offline-sida. Uppladdade filer (/files/)
// cachas aldrig.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `beergolf-${version}`;
const ASSETS = [...build, ...files.filter((f) => !f.startsWith('/.'))];

const OFFLINE_HTML = `<!doctype html><html lang="sv"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — Beer Golf</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#ede6d3;color:#122b21;font-family:Georgia,serif;text-align:center;padding:2rem}
h1{font-weight:600;font-size:2rem;margin:0 0 .5rem}p{opacity:.7}a{color:#17382b}</style></head>
<body><div><h1>Du är offline</h1><p>Beer Golf behöver nätverk för att hämta coasters och poäng.</p>
<p><a href="/">Försök igen</a></p></div></body></html>`;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	// App-skalet: cache först (innehållet är versionsstämplat)
	if (ASSETS.includes(url.pathname)) {
		event.respondWith(
			caches.open(CACHE).then(async (cache) => (await cache.match(request)) ?? fetch(request))
		);
		return;
	}

	// Navigeringar: nätet först, offline-sida som reserv
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(
				() =>
					new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
			)
		);
	}
	// Allt annat (data, /files/, api): rakt mot nätet, ingen cache
});

// --- Web Push -------------------------------------------------------------
// Payload: { title, body, url?, tag? } (se src/lib/server/push.ts)
sw.addEventListener('push', (event) => {
	let data: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		data = event.data?.json() ?? {};
	} catch {
		data = { body: event.data?.text() };
	}
	event.waitUntil(
		sw.registration.showNotification(data.title ?? 'Beer Golf', {
			body: data.body ?? '',
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			tag: data.tag,
			data: { url: data.url ?? '/' }
		})
	);
});

// Klick: fokusera öppet fönster och navigera, annars öppna nytt
sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL(event.notification.data?.url ?? '/', sw.location.origin).href;
	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (list) => {
			for (const c of list) {
				if ('focus' in c) {
					await c.focus();
					if ('navigate' in c) await c.navigate(url);
					return;
				}
			}
			await sw.clients.openWindow(url);
		})
	);
});
