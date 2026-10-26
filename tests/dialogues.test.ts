import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIALOGUES, ALL_SCENARIOS } from '../src/data/dialogues';
import { validateDialogue } from '../src/data/dialogues/validate';
import type { DialogueFile } from '../src/data/dialogues/types';

test('all five JSON files pass shape, links, location-level and ending validation', () => {
  assert.equal(Object.keys(DIALOGUES).length, 5);
  assert.equal(ALL_SCENARIOS.length, 8);
  for (const file of Object.values(DIALOGUES)) assert.doesNotThrow(() => validateDialogue(file));
});
test('a missing next target is reported with its node ID', () => {
  const file: DialogueFile = structuredClone(DIALOGUES.Cafe);
  file.scenarios[0].nodes[0].replies[0].next = 'missing-node';
  assert.throws(() => validateDialogue(file), /next points to missing node "missing-node"/);
});
test('an invalid location-level combination is rejected', () => {
  const file = structuredClone(DIALOGUES.School); file.scenarios[0].level = 4;
  assert.throws(() => validateDialogue(file), /location\/level mismatch/);
  const wrongLocation = structuredClone(DIALOGUES.Cafe); wrongLocation.scenarios[0].location = 'Hotel';
  assert.throws(() => validateDialogue(wrongLocation), /location\/level mismatch/);
});
test('a scenario with no ending, and a trapped branch alongside a valid ending, are rejected', () => {
  const file = structuredClone(DIALOGUES.Cafe);
  const nodes = file.scenarios[0].nodes;
  for (const node of nodes) for (const reply of node.replies) if (reply.next === null) reply.next = nodes[0].id;
  assert.throws(() => validateDialogue(file), /no reachable ending/);
  const trapped = structuredClone(DIALOGUES.Cafe);
  const branch = trapped.scenarios[0].nodes.find(n => n.id === 'large')!;
  branch.replies[0].next = 'large';
  assert.throws(() => validateDialogue(trapped), /no reachable ending/);
});
test('every playable branch has 5–8 rounds and every scenario has distinct next targets', () => {
  for (const scenario of ALL_SCENARIOS) {
    const nodes = new Map(scenario.nodes.map(n => [n.id, n]));
    assert.ok(scenario.nodes.some(n => new Set(n.replies.map(r => r.next)).size > 1), scenario.id);
    const lengths: number[] = [];
    const walk = (id: string, depth: number, visited: Set<string>): void => {
      assert.ok(!visited.has(id), `${scenario.id}: unexpected loop`);
      const nextVisited = new Set(visited).add(id);
      for (const reply of nodes.get(id)!.replies) {
        if (reply.next === null) lengths.push(depth + 1);
        else walk(reply.next, depth + 1, nextVisited);
      }
    };
    walk(scenario.nodes[0].id, 0, new Set());
    assert.ok(lengths.length > 1);
    assert.ok(lengths.every(length => length >= 5 && length <= 8), `${scenario.id}: ${lengths}`);
  }
});
