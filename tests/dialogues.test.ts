import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIALOGUES, ALL_SCENARIOS } from '../src/data/dialogues';
import { validateDialogue } from '../src/data/dialogues/validate';
import type { DialogueFile, Reply, Scenario } from '../src/data/dialogues/types';

const node = (file: DialogueFile, id: string, scenario = 0) => file.scenarios[scenario].nodes.find(n => n.id === id)!;
const moving = (replies: Reply[]) => replies.filter(reply => reply.type !== 'mistake');
const invalid = (name: string, change: (file: DialogueFile) => void, message: RegExp): void => {
  test(name, () => { const file = structuredClone(DIALOGUES.Cafe); change(file); assert.throws(() => validateDialogue(file), message); });
};

test('all five JSON files and eight scenarios pass validation', () => {
  assert.equal(Object.keys(DIALOGUES).length, 5);
  assert.equal(ALL_SCENARIOS.length, 8);
  for (const file of Object.values(DIALOGUES)) assert.doesNotThrow(() => validateDialogue(file));
});

invalid('a missing next target is reported with its node ID', file => {
  moving(node(file, 'hello').replies)[0].next = 'missing-node';
}, /next points to missing node "missing-node"/);

test('an invalid location-level combination is rejected', () => {
  const file = structuredClone(DIALOGUES.School); file.scenarios[0].level = 4;
  assert.throws(() => validateDialogue(file), /location\/level mismatch/);
  const wrongLocation = structuredClone(DIALOGUES.Cafe); wrongLocation.scenarios[0].location = 'Hotel';
  assert.throws(() => validateDialogue(wrongLocation), /location\/level mismatch/);
});

invalid('a scenario with no ending is rejected before type rules', file => {
  for (const n of file.scenarios[0].nodes) for (const reply of moving(n.replies)) if (reply.next === null) reply.next = 'hello';
}, /no reachable ending/);
invalid('a trapped branch alongside a valid ending is rejected before type rules', file => {
  moving(node(file, 'large').replies)[0].next = 'large';
}, /no reachable ending/);
invalid('an unreachable node is rejected', file => {
  file.scenarios[0].nodes.push({ id: 'unused', npc: 'Hello.', npcZh: '你好。', replies: [{ type: 'branch', en: 'Goodbye.', zh: '再見。', next: null }] });
}, /unreachable node/);

function paths(scenario: Scenario): string[][] {
  const nodes = new Map(scenario.nodes.map(n => [n.id, n]));
  const results: string[][] = [];
  const walk = (id: string, visited: string[]): void => {
    assert.ok(!visited.includes(id), `${scenario.id}: unexpected loop`);
    const path = [...visited, id];
    for (const reply of moving(nodes.get(id)!.replies)) {
      if (reply.next === null) results.push(path);
      else walk(reply.next, path);
    }
  };
  walk(scenario.nodes[0].id, []); return results;
}

test('every playable path has 5–8 rounds, excluding mistakes', () => {
  for (const scenario of ALL_SCENARIOS) {
    const lengths = paths(scenario).map(path => path.length);
    assert.ok(lengths.every(length => length >= 5 && length <= 8), `${scenario.id}: ${lengths}`);
  }
});
test('every scenario has at least two distinct ending node sequences', () => {
  for (const scenario of ALL_SCENARIOS) assert.ok(new Set(paths(scenario).map(path => path.join('/'))).size >= 2, scenario.id);
});

invalid('an invalid reply type is rejected', file => {
  node(file, 'hello').replies.push(Object.assign({}, node(file, 'hello').replies[0], { type: 'unknown' }) as Reply);
}, /invalid reply type/);
invalid('a variant without a note is rejected', file => {
  Reflect.deleteProperty(node(file, 'pay').replies[0], 'note');
}, /note: expected non-empty string/);
invalid('a variant with a blank note is rejected', file => {
  Object.assign(node(file, 'pay').replies[0], { note: ' ' });
}, /note: expected non-empty string/);
invalid('variants with different next targets are rejected', file => {
  moving(node(file, 'pay').replies)[0].next = null;
}, /variant next must match/);
invalid('a mistake without correction is rejected', file => {
  Reflect.deleteProperty(node(file, 'hello').replies.find(reply => reply.type === 'mistake')!, 'correction');
}, /correction: expected non-empty string/);
invalid('a mistake with next is rejected without treating next as an edge', file => {
  Object.assign(node(file, 'hello').replies.find(reply => reply.type === 'mistake')!, { next: 'missing-node' });
}, /mistake must not have next/);
for (const field of ['en', 'zh']) invalid(`a mistake without reaction.${field} is rejected`, file => {
  const reply = node(file, 'hello').replies.find(reply => reply.type === 'mistake')!;
  Reflect.deleteProperty(reply.reaction, field);
}, new RegExp(`reaction.${field}: expected non-empty string`));
invalid('a mistake without explain is rejected', file => {
  Reflect.deleteProperty(node(file, 'hello').replies.find(reply => reply.type === 'mistake')!, 'explain');
}, /explain: expected non-empty string/);
invalid('branch and variant options cannot mix', file => {
  Object.assign(node(file, 'size').replies[0], { type: 'variant', note: '說明' });
}, /branch and variant must not mix/);
invalid('branch targets cannot duplicate', file => {
  node(file, 'size').replies.push({ ...node(file, 'size').replies[0] });
}, /no exclusive node/);
invalid('branch targets cannot reach one another', file => {
  node(file, 'size').replies.push({ type: 'branch', next: 'place', en: "I'd like to choose a seat now.", zh: '我想先選座位。' });
}, /no exclusive node/);
invalid('multiple branch options cannot end immediately', file => {
  node(file, 'size').replies.push({ type: 'branch', next: null, en: "Actually, I need to leave right now.", zh: '其實我現在得走了。' });
}, /branch targets must be non-null/);
invalid('options differing by fewer than three words are rejected', file => {
  node(file, 'size').replies[1].en = 'A large one is fine.';
}, /options too similar/);
invalid('word comparison ignores case and punctuation', file => {
  node(file, 'size').replies[1].en = 'A SMALL one is fine!!!';
}, /options too similar/);
invalid('a lone variant is rejected', file => { node(file, 'pay').replies.pop(); }, /needs at least 2 variant options/);
invalid('a node with only mistakes is rejected after graph checks', file => {
  node(file, 'bye').replies = [{ type: 'mistake', en: 'Give me tea.', zh: '給我茶。', reaction: { en: 'Please?', zh: '請？' }, correction: 'Tea, please.', explain: '加上 please。' }];
}, /no reachable ending/);
for (const index of [0, 1]) invalid(`Lv${index + 1} requires a mistake`, file => {
  for (const n of file.scenarios[index].nodes) n.replies = moving(n.replies);
}, new RegExp(`${DIALOGUES.Cafe.scenarios[index].id}: needs at least 1 mistake option`));
for (const index of [2, 3]) invalid(`Lv${index + 1} requires at least two variant nodes`, file => {
  let kept = false;
  for (const n of file.scenarios[index].nodes) if (n.replies[0].type === 'variant') {
    if (!kept) { kept = true; continue; }
    const reply = moving(n.replies)[0]; n.replies = [{ type: 'branch', en: reply.en, zh: reply.zh, next: reply.next }];
  }
}, new RegExp(`${DIALOGUES.Cafe.scenarios[index].id}: needs at least 2 variant nodes`));
invalid('every scenario requires at least two branch nodes', file => {
  const scenario = file.scenarios[0];
  scenario.nodes = [
    { id: 'hello', npc: 'Hello.', npcZh: '你好。', replies: [{ type: 'branch', en: 'Thank you.', zh: '謝謝。', next: null }, node(file, 'hello').replies.find(reply => reply.type === 'mistake')!] },
  ];
}, /cafe-lv1-drink: needs at least 2 branch nodes/);
