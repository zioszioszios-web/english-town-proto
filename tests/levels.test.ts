import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlockedLevels } from '../src/data/levels';
import { ALL_SCENARIOS } from '../src/data/dialogues';
import { availableBuildings, BUILDINGS, nearbyEntrance, ENTRY_DISTANCE } from '../src/data/town';

test('progression stays locked below the configured completion ratio', () => {
  const first = ALL_SCENARIOS.filter(s => s.level === 1);
  assert.equal(first.length, 4);
  assert.deepEqual(unlockedLevels('progression', new Set(first.slice(0, 3).map(s => s.id)), ALL_SCENARIOS), [1]);
});
test('meeting the ratio unlocks the next level, without skipping incomplete levels', () => {
  const completed = new Set(ALL_SCENARIOS.filter(s => s.level === 1).map(s => s.id));
  assert.deepEqual(unlockedLevels('progression', completed, ALL_SCENARIOS), [1, 2]);
  assert.deepEqual(unlockedLevels('progression', new Set(ALL_SCENARIOS.filter(s => s.level <= 2).map(s => s.id)), ALL_SCENARIOS), [1, 2, 3]);
  assert.deepEqual(unlockedLevels('progression', new Set(ALL_SCENARIOS.filter(s => s.level < 4).map(s => s.id)), ALL_SCENARIOS), [1, 2, 3, 4]);
  assert.deepEqual(unlockedLevels('progression', new Set(ALL_SCENARIOS.filter(s => s.level === 1).slice(0, 2).map(s => s.id)), ALL_SCENARIOS, .5), [1, 2]);
});
test('direct mode unlocks all four levels immediately', () => assert.deepEqual(unlockedLevels('direct', new Set(), ALL_SCENARIOS), [1, 2, 3, 4]));
test('empty or invalid thresholds do not silently unlock levels', () => {
  assert.deepEqual(unlockedLevels('progression', new Set(), []), [1]);
  assert.throws(() => unlockedLevels('progression', new Set(), ALL_SCENARIOS, 0));
  assert.throws(() => unlockedLevels('progression', new Set(), ALL_SCENARIOS, 1.1));
});
test('school and office follow level availability, including entrance range', () => {
  assert.ok(availableBuildings(1).some(b => b.name === 'School'));
  assert.ok(!availableBuildings(1).some(b => b.name === 'Office'));
  assert.ok(!availableBuildings(3).some(b => b.name === 'School'));
  assert.ok(availableBuildings(4).some(b => b.name === 'Office'));
  assert.ok(!availableBuildings(4).some(b => b.name === 'School'));
  const office = BUILDINGS.find(b => b.name === 'Office')!;
  assert.equal(nearbyEntrance(office.door, 1), undefined);
  assert.equal(nearbyEntrance(office.door, 4)?.name, 'Office');
  assert.equal(nearbyEntrance({ x: office.door.x, y: office.door.y + ENTRY_DISTANCE + 1 }, 4), undefined);
});
