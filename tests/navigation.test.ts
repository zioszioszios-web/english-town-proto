import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canStand, findPath } from '../src/data/navigation';
import { BUILDINGS, START, TILE, PLAYER_RADIUS, WORLD_WIDTH, WORLD_HEIGHT } from '../src/data/town';

test('all entrances and return positions are reachable without crossing walls', () => {
  const starts = [START, ...BUILDINGS.map(b => ({ x: b.door.x, y: b.door.y + 42 }))];
  for (const from of starts) for (const building of BUILDINGS) {
    const path = findPath(from, building.door);
    assert.ok(path.length > 0);
    assert.deepEqual(path.at(-1), building.door);
    let previous = from;
    for (const next of path) {
      const steps = Math.max(1, Math.ceil(Math.hypot(next.x - previous.x, next.y - previous.y)));
      for (let i = 0; i <= steps; i++) assert.ok(canStand(previous.x + (next.x - previous.x) * i / steps, previous.y + (next.y - previous.y) * i / steps));
      previous = next;
    }
  }
});
test('building interiors and world edges are blocked', () => {
  for (const b of BUILDINGS) {
    assert.equal(canStand(b.x + TILE, b.y + TILE), false);
    assert.deepEqual(findPath(START, { x: b.x + TILE, y: b.y + TILE }), []);
    assert.ok(canStand(b.door.x, b.door.y + 42));
    assert.ok(Math.hypot(42) > 12);
  }
  for (const p of [{ x: PLAYER_RADIUS - 1, y: 40 }, { x: 40, y: -1 }, { x: WORLD_WIDTH, y: 40 }, { x: 40, y: WORLD_HEIGHT }]) assert.equal(canStand(p.x, p.y), false);
  assert.deepEqual(findPath(START, { x: -32, y: 0 }), []);
});
