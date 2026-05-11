// Tiny World Builder — SSE relay edge function.
//
// GET  /api/relay  — opens a Server-Sent Events stream the browser
//                    subscribes to. Token comes via ?token=… (EventSource
//                    can't set headers).
// POST /api/relay  — pushes a JSON command to every subscriber whose
//                    token matches the request's Authorization: Bearer.
//                    Body: { op: 'place' | 'clear' | 'reset', x?, z?, kind?, … }
//
// LIMITATION: the subscriber map lives in module-global state, which
// only persists within a single edge-instance. Across multiple regions /
// cold starts you'll need a shared bus (Netlify Blobs, Redis, etc.). For
// a single-user developer setup this is fine.

import type { Context, Config } from '@netlify/edge-functions';

type Subscriber = {
  token: string;
  send: (data: string) => void;
  close: () => void;
};

// deno-lint-ignore no-explicit-any
const g = globalThis as any;
const subs: Set<Subscriber> = g.__twbSubs || (g.__twbSubs = new Set());

function unauthorized() {
  return new Response('Unauthorized', { status: 401 });
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const url = new URL(req.url);
  const q = url.searchParams.get('token');
  return q ? q.trim() : null;
}

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    });
  }

  const token = extractToken(req);
  if (!token) return unauthorized();

  if (req.method === 'GET') {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (data: string) => {
          try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); } catch (_) {}
        };
        const close = () => {
          try { controller.close(); } catch (_) {}
          subs.delete(sub);
        };
        const sub: Subscriber = { token, send, close };
        subs.add(sub);
        send(JSON.stringify({ op: 'hello' }));
      },
      cancel() {
        // Stream cancelled by the browser — drop matching subs.
        for (const s of subs) if (s.token === token) subs.delete(s);
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (req.method === 'POST') {
    let body: unknown = null;
    try { body = await req.json(); } catch (_) {
      return new Response('Bad JSON', { status: 400 });
    }
    const payload = JSON.stringify(body);
    let delivered = 0;
    for (const s of subs) {
      if (s.token !== token) continue;
      s.send(payload);
      delivered++;
    }
    return Response.json({ ok: true, delivered }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = { path: '/api/relay' };
