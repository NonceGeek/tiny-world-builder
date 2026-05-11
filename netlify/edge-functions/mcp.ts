// Tiny World Builder — Model Context Protocol (MCP) server over SSE.
//
// Exposes the world to AI agents as MCP tools (place_object, clear_world,
// reset_world). Tool calls are forwarded to the SSE relay so any browser
// subscribed to /api/relay with the same bearer token receives the command
// and applies it to its world.
//
// Endpoint layout (MCP SSE transport):
//   GET  /api/mcp/sse        — opens the SSE stream the agent listens on
//   POST /api/mcp/message    — agent posts JSON-RPC messages here
//
// LIMITATIONS: This is a minimal implementation suitable for a single
// developer. The session map lives in module-global state (same as
// relay.ts), so it only survives within one edge instance. For a
// production deployment back this with a persistent bus.

import type { Context, Config } from '@netlify/edge-functions';

type Send = (data: string) => void;
type Session = {
  id: string;
  token: string;
  send: Send;
};

// deno-lint-ignore no-explicit-any
const g = globalThis as any;
const sessions: Map<string, Session> = g.__twbMcpSessions || (g.__twbMcpSessions = new Map());

const PROTOCOL_VERSION = '2024-11-05';

const TOOLS = [
  {
    name: 'place_object',
    description: 'Place an object on a tile of the user\'s world. x/z are 0..7 grid coords.',
    inputSchema: {
      type: 'object',
      required: ['x', 'z', 'kind'],
      properties: {
        x: { type: 'integer', minimum: 0, maximum: 7 },
        z: { type: 'integer', minimum: 0, maximum: 7 },
        kind: { type: 'string', enum: ['tree', 'rock', 'fence', 'tuft', 'bridge', 'crop', 'corn', 'wheat', 'pumpkin', 'carrot', 'sunflower', 'house'] },
        terrain: { type: 'string', enum: ['grass', 'dirt', 'path', 'water'] },
        floors: { type: 'integer', minimum: 1, maximum: 8 },
        buildingType: { type: 'string', enum: ['cottage', 'manor', 'tower', 'turret', 'skyscraper'] },
        fenceSide: { type: 'string', enum: ['n', 's', 'e', 'w', 'center-x', 'center-z'] },
        rotationY: { type: 'number' },
        offsetX: { type: 'number' },
        offsetZ: { type: 'number' },
      },
    },
  },
  {
    name: 'clear_world',
    description: 'Wipe every tile back to grass. Drops all decorations.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'reset_world',
    description: 'Restore the starter village layout.',
    inputSchema: { type: 'object', properties: {} },
  },
];

function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const url = new URL(req.url);
  return url.searchParams.get('token');
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

function jsonRpcResult(id: number | string | null, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function jsonRpcError(id: number | string | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Forward a tool call to the SSE relay so the user's browser applies it.
async function pushToRelay(req: Request, token: string, body: unknown) {
  const origin = new URL(req.url).origin;
  await fetch(origin + '/api/relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  }).catch(() => { /* swallow — agents shouldn't crash on relay outage */ });
}

async function dispatchToolCall(req: Request, token: string, name: string, args: Record<string, unknown>) {
  if (name === 'place_object') {
    await pushToRelay(req, token, Object.assign({ op: 'place' }, args));
    return { content: [{ type: 'text', text: `Placed ${args.kind} at (${args.x}, ${args.z})` }] };
  }
  if (name === 'clear_world') {
    await pushToRelay(req, token, { op: 'clear' });
    return { content: [{ type: 'text', text: 'World cleared' }] };
  }
  if (name === 'reset_world') {
    await pushToRelay(req, token, { op: 'reset' });
    return { content: [{ type: 'text', text: 'World reset to starter village' }] };
  }
  throw new Error('Unknown tool: ' + name);
}

async function handleMessage(req: Request, token: string, message: any) {
  const id = message?.id ?? null;
  const method = message?.method;
  const params = message?.params || {};
  try {
    if (method === 'initialize') {
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: 'tiny-world-builder', version: '0.1.0' },
        capabilities: { tools: {} },
      });
    }
    if (method === 'tools/list') {
      return jsonRpcResult(id, { tools: TOOLS });
    }
    if (method === 'tools/call') {
      const result = await dispatchToolCall(req, token, params.name, params.arguments || {});
      return jsonRpcResult(id, result);
    }
    if (method === 'ping') {
      return jsonRpcResult(id, {});
    }
    return jsonRpcError(id, -32601, 'Method not found: ' + method);
  } catch (err) {
    return jsonRpcError(id, -32000, (err as Error).message || 'Tool call failed');
  }
}

export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, '');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const token = extractToken(req);
  if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders() });

  if (pathname === '/api/mcp/sse' && req.method === 'GET') {
    const sessionId = crypto.randomUUID();
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send: Send = (data: string) => {
          try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)); } catch (_) {}
        };
        sessions.set(sessionId, { id: sessionId, token, send });
        // Inform the client of its message endpoint.
        controller.enqueue(encoder.encode(`event: endpoint\ndata: /api/mcp/message?session=${sessionId}\n\n`));
      },
      cancel() { sessions.delete(sessionId); },
    });
    return new Response(stream, {
      headers: Object.assign(corsHeaders(), {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
      }),
    });
  }

  if (pathname === '/api/mcp/message' && req.method === 'POST') {
    const sessionId = url.searchParams.get('session');
    const session = sessionId ? sessions.get(sessionId) : null;
    if (!session || session.token !== token) return new Response('Unknown session', { status: 404, headers: corsHeaders() });
    let body: any = null;
    try { body = await req.json(); } catch (_) { return new Response('Bad JSON', { status: 400, headers: corsHeaders() }); }
    const response = await handleMessage(req, token, body);
    session.send(JSON.stringify(response));
    return Response.json({ ok: true }, { headers: corsHeaders() });
  }

  return new Response('Not found', { status: 404, headers: corsHeaders() });
};

export const config: Config = { path: ['/api/mcp/sse', '/api/mcp/message'] };
