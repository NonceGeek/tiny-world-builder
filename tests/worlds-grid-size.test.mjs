import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveTerrainCounts,
  effectiveWorldGridSize,
  normalizeWorldSelectionGateData,
  worldDto,
} from '../netlify/functions/lib/worlds.mjs';

test('effectiveWorldGridSize prefers saved payload gridSize over stale row metadata', () => {
  const data = { v: 4, gridSize: 8, cells: [[0, 0, 'water']] };
  assert.equal(effectiveWorldGridSize(data, 20), 8);

  const dto = worldDto({
    id: 7,
    slug: 'stale-size',
    kind: 'starter',
    status: 'published',
    name: 'Stale Size',
    tax_percent: 5,
    price_usdc: '0',
    grid_size: 20,
    tile_count: 400,
    active_players: 0,
    data,
    published_at: null,
  }, { includeData: true });

  assert.equal(dto.gridSize, 8);
  assert.equal(dto.data.gridSize, 8);
  assert.equal(dto.resourceStats.spawnable, 64);
});

test('terrain counts price the actual payload size, not stale metadata', () => {
  const counts = deriveTerrainCounts({ v: 4, gridSize: 8, cells: [[0, 0, 'water']] }, 20);
  assert.equal(counts.tileCount, 64);
  assert.equal(counts.water, 1);
  assert.equal(counts.grass, 63);
});

test('normalizing selection gate keeps payload size when metadata is larger', () => {
  const normalized = normalizeWorldSelectionGateData({ v: 4, gridSize: 8, cells: [] }, 20);
  assert.equal(normalized.gridSize, 8);
  assert.deepEqual(normalized.cells.at(-1), { x: 4, z: 4, terrain: 'grass', kind: 'stargate', dest: '__world-picker' });
});
