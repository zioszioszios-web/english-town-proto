import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressStore, SAVE_KEY, SAVE_VERSION, type ProgressStorage } from '../src/ui/ProgressStore';
import { ALL_SCENARIOS } from '../src/data/dialogues';
function memory(): ProgressStorage {
  const values = new Map<string, string>();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
test('mode, selected level, unlocked levels and completion counts survive a reload', () => {
  const storage = memory(); const store = new ProgressStore(ALL_SCENARIOS, () => storage);
  assert.equal(store.mode, null); store.chooseMode('progression');
  for (const s of ALL_SCENARIOS.filter(s => s.level === 1)) store.complete(s.id);
  store.complete(ALL_SCENARIOS[0].id);
  assert.equal(store.switchLevel(2), true); assert.equal(store.switchLevel(4), false);
  const saved = JSON.parse(storage.getItem(SAVE_KEY)!);
  assert.equal(saved.version, SAVE_VERSION); assert.deepEqual(saved.unlockedLevels, [1, 2]);
  const loaded = new ProgressStore(ALL_SCENARIOS, () => storage);
  assert.equal(loaded.mode, 'progression'); assert.equal(loaded.currentLevel, 2); assert.equal(loaded.get(ALL_SCENARIOS[0].id).count, 2);
  loaded.reset(); const reset = new ProgressStore(ALL_SCENARIOS, () => storage);
  assert.equal(reset.mode, null); assert.equal(reset.get(ALL_SCENARIOS[0].id).count, 0);
});
test('direct mode starts at level four and preserves its mode', () => {
  const storage = memory(); const store = new ProgressStore(ALL_SCENARIOS, () => storage); store.chooseMode('direct');
  assert.equal(store.currentLevel, 4); assert.deepEqual(store.unlocked, [1, 2, 3, 4]);
  assert.equal(new ProgressStore(ALL_SCENARIOS, () => storage).mode, 'direct');
});
test('blocked reads and failed writes keep the in-memory game usable', () => {
  const store = new ProgressStore(ALL_SCENARIOS, () => { throw new Error('denied'); });
  store.chooseMode('progression'); store.complete(ALL_SCENARIOS[0].id);
  assert.equal(store.get(ALL_SCENARIOS[0].id).count, 1); assert.equal(store.isPersistent, false);
  const quota = new ProgressStore(ALL_SCENARIOS, () => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } }));
  quota.chooseMode('direct'); assert.equal(quota.currentLevel, 4); assert.equal(quota.isPersistent, false);
});
test('corrupt or unknown-version saves fall back without crashing', () => {
  for (const raw of ['{broken', '{"version":999}', '{"version":1,"mode":"bad","scenarios":{"bad":{"completed":true,"count":-2}}}']) {
    const store = new ProgressStore(ALL_SCENARIOS, () => ({ getItem: () => raw, setItem: () => {} }));
    assert.equal(store.mode, null); assert.equal(store.currentLevel, 1);
  }
});
