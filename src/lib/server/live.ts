// Live-uppdateringar av coasters: in-memory pub/sub (en process — kör en replika).
// Mutationer anropar notifyCoaster(id); SSE-endpoints prenumererar per coaster.
import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function notifyCoaster(coasterId: string) {
	emitter.emit(`coaster:${coasterId}`, Date.now());
}

export function subscribeCoaster(coasterId: string, fn: (at: number) => void) {
	emitter.on(`coaster:${coasterId}`, fn);
	return () => emitter.off(`coaster:${coasterId}`, fn);
}

/** SSE-svar som skickar en händelse per notifyCoaster + heartbeat var 25 s. */
export function coasterEventStream(coasterIds: string[], signal: AbortSignal): Response {
	const enc = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			const send = (s: string) => {
				try {
					controller.enqueue(enc.encode(s));
				} catch {
					/* stängd */
				}
			};
			send('retry: 3000\n\n');
			const unsubs = coasterIds.map((id) =>
				subscribeCoaster(id, (at) => send(`event: change\ndata: ${JSON.stringify({ id, at })}\n\n`))
			);
			const hb = setInterval(() => send(': hb\n\n'), 25_000);
			signal.addEventListener('abort', () => {
				clearInterval(hb);
				unsubs.forEach((u) => u());
				try {
					controller.close();
				} catch {
					/* redan stängd */
				}
			});
		}
	});
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
