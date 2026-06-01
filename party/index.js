// @ts-check
/// <reference types="partykit/server" />

const MESSAGE_LIMIT = 48 * 1024;
const PRESENCE_KEYS = new Set(['id', 'name', 'color', 'cursor', 'selection', 'tool', 'ts']);
const OP_KEYS = new Set(['id', 'kind', 'x', 'z', 'cell', 'ts']);

// Generous finite ghost-board bound. The world.schema.json $defs/coord caps
// home/import cells at +/-1024, but sparse user-edited ghost-board cells and
// island-derived world coords (boardX * GRID + local) can legitimately reach
// further, so we do NOT clamp to the home grid. This cap only rejects clearly
// crafted coordinates (e.g. 9999999) that would grow world[x][z] without bound.
const MAX_CELL_COORD = 100000;

// Schema enums mirrored from world.schema.json $defs/terrain (line 89) and
// $defs/kind (line 94). The server cannot import the client schema, so these
// are hardcoded; keep them in sync if the schema changes.
const TERRAIN_ENUM = new Set(['grass', 'path', 'dirt', 'water', 'stone', 'lava', 'sand', 'snow']);
const KIND_ENUM = new Set([
  'house', 'tree', 'fence', 'rock', 'bridge', 'crop', 'corn', 'wheat', 'pumpkin',
  'carrot', 'sunflower', 'tuft', 'flower', 'bush', 'cow', 'sheep', 'lamp-post',
  'spotlight', 'voxel-build', 'model-stamp',
]);

// Mirror of MAX_FLOORS = 8 from engine/world/10-world-data.js:246 (the server
// cannot import it). Both floors and terrainFloors are capped at 8 in the
// schema (cellObject), so clamp both to block a 1e7-floor skyscraper DoS.
const MAX_FLOORS = 8;

// Explicit allowlist of cell fields the renderer actually consumes, taken from
// the live cell shape written in engine/world/29-persistence-api.js:388-402.
// Anything outside this set (including attacker-supplied flags like userEdited)
// is dropped. Custom objects ride in via kind:'voxel-build' + appearance, not
// raw customParts, so they replicate without being listed here.
const CELL_FIELDS = new Set([
  'terrain', 'kind', 'floors', 'terrainFloors', 'buildingType', 'fenceSide',
  'extras', 'rotationY', 'offsetX', 'offsetY', 'offsetZ', 'appearance', 'waterFlow',
]);

function clampFloors(value) {
  const n = Math.round(cleanNumber(value, 1));
  if (n < 1) return 1;
  if (n > MAX_FLOORS) return MAX_FLOORS;
  return n;
}

// Per-connection token buckets. Presence is throttled tighter (client maxes
// ~11/sec); cell.set is generous so a fast drag-paint burst is never dropped.
// refill = sustained tokens per second; burst = bucket capacity.
const RATE_LIMITS = {
  presence: { refill: 25, burst: 40 },
  'cell.set': { refill: 40, burst: 80 },
};

function takeToken(buckets, type, now) {
  const cfg = RATE_LIMITS[type];
  if (!cfg) return true;
  let bucket = buckets.get(type);
  if (!bucket) {
    bucket = { tokens: cfg.burst, last: now };
    buckets.set(type, bucket);
  }
  const elapsed = Math.max(0, now - bucket.last) / 1000;
  bucket.tokens = Math.min(cfg.burst, bucket.tokens + elapsed * cfg.refill);
  bucket.last = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function safeJson(message) {
  if (typeof message !== 'string' || message.length > MESSAGE_LIMIT) return null;
  try {
    return JSON.parse(message);
  } catch (_) {
    return null;
  }
}

function cleanText(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function cleanNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanCursor(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    x: cleanNumber(value.x),
    z: cleanNumber(value.z),
    y: cleanNumber(value.y),
  };
}

function cleanSelection(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 64).map(cell => {
    if (!cell || typeof cell !== 'object') return null;
    return {
      x: Math.round(cleanNumber(cell.x)),
      z: Math.round(cleanNumber(cell.z)),
    };
  }).filter(Boolean);
}

function cleanPresence(input, fallbackId) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const key of PRESENCE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  out.id = cleanText(out.id || fallbackId, 64) || fallbackId;
  out.name = cleanText(out.name || 'Builder', 48) || 'Builder';
  out.color = /^#[0-9a-f]{6}$/i.test(String(out.color || '')) ? String(out.color) : '#3c82f7';
  out.cursor = cleanCursor(out.cursor);
  out.selection = cleanSelection(out.selection);
  out.tool = cleanText(out.tool, 48);
  out.ts = Date.now();
  return out;
}

function cleanCell(cell) {
  if (!cell || typeof cell !== 'object') return null;
  const out = {};
  // Copy only allowlisted fields, then deep-clone the survivors so we never
  // forward attacker-controlled prototype/extra keys downstream.
  for (const key of CELL_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(cell, key)) out[key] = cell[key];
  }
  let copy;
  try {
    copy = JSON.parse(JSON.stringify(out));
  } catch (_) {
    return null;
  }
  // Normalize terrain/kind against the schema enums; clamp the stack counts.
  copy.terrain = TERRAIN_ENUM.has(copy.terrain) ? copy.terrain : 'grass';
  if (copy.kind != null && !KIND_ENUM.has(copy.kind)) copy.kind = null;
  if (copy.floors != null) copy.floors = clampFloors(copy.floors);
  if (copy.terrainFloors != null) copy.terrainFloors = clampFloors(copy.terrainFloors);
  if (!Array.isArray(copy.extras)) copy.extras = [];
  return copy;
}

function cleanCellSet(input) {
  if (!input || typeof input !== 'object') return null;
  const out = {};
  for (const key of OP_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  }
  out.id = cleanText(out.id, 96) || String(Date.now());
  out.kind = 'cell.set';
  out.x = Math.round(cleanNumber(out.x));
  out.z = Math.round(cleanNumber(out.z));
  // Range-check coordinates so a crafted op (e.g. x/z = 9999999) cannot grow
  // every peer's world[x][z] without bound. Reject (drop) rather than clamp:
  // clamping to the home grid would break legitimate sparse ghost-board cells.
  if (!Number.isFinite(out.x) || !Number.isFinite(out.z)) return null;
  if (Math.abs(out.x) > MAX_CELL_COORD || Math.abs(out.z) > MAX_CELL_COORD) return null;
  out.cell = cleanCell(out.cell);
  out.ts = Date.now();
  if (!out.cell) return null;
  return out;
}

export default class TinyWorldParty {
  constructor(room) {
    this.room = room;
    this.presence = new Map();
    // sender.id -> Map(type -> token bucket). Per-connection rate limit state.
    this.rateLimits = new Map();
  }

  onConnect(conn) {
    conn.send(JSON.stringify({
      type: 'welcome',
      room: this.room.id,
      id: conn.id,
      peers: Array.from(this.presence.values()),
    }));
  }

  onMessage(message, sender) {
    const data = safeJson(message);
    if (!data || typeof data.type !== 'string') return;

    // Per-connection rate limit, separate buckets per message type. A hostile
    // client opening a raw socket ignores the client-side throttle, so drop
    // (return, no broadcast) once a connection exceeds its sustained rate.
    let buckets = this.rateLimits.get(sender.id);
    if (!buckets) {
      buckets = new Map();
      this.rateLimits.set(sender.id, buckets);
    }
    if (!takeToken(buckets, data.type, Date.now())) return;

    if (data.type === 'presence') {
      const presence = cleanPresence(data.presence, sender.id);
      if (!presence) return;
      presence.id = sender.id;
      this.presence.set(sender.id, presence);
      this.room.broadcast(JSON.stringify({ type: 'presence', presence }), [sender.id]);
      return;
    }

    if (data.type === 'cell.set') {
      const op = cleanCellSet(data.op);
      if (!op) return;
      op.userId = sender.id;
      this.room.broadcast(JSON.stringify({ type: 'cell.set', op }), [sender.id]);
    }
  }

  onClose(conn) {
    this.presence.delete(conn.id);
    this.rateLimits.delete(conn.id);
    this.room.broadcast(JSON.stringify({ type: 'leave', id: conn.id }));
  }

  onError(conn) {
    this.onClose(conn);
  }
}
