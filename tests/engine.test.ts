import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DialogueEngine } from '../src/ui/DialogueEngine';
import type { ReplyInput } from '../src/ui/ReplyInput';
import { DIALOGUES } from '../src/data/dialogues';
class Input implements ReplyInput {
  callback: (index: number) => void = () => {};
  request(_replies: readonly unknown[], callback: (index: number) => void): void { this.callback = callback; }
  cancel(): void { this.callback = () => {}; }
}
test('the engine uses its input abstraction and produces different branch dialogue', () => {
  const play = (branch: number): string[] => {
    const input = new Input(); const lines: string[] = []; let count = 0;
    const engine = new DialogueEngine(input, { node: node => lines.push(node.npc), reply: () => {}, complete: spoken => { count = spoken; } });
    engine.start(DIALOGUES.Cafe.scenarios[0]); input.callback(0); input.callback(branch);
    for (let i = 0; i < 5; i++) input.callback(0);
    assert.equal(count, 7); return lines;
  };
  assert.notDeepEqual(play(0), play(1));
});
test('a stale input callback after stop cannot advance a new or abandoned session', () => {
  const input = new Input(); let nodes = 0;
  const engine = new DialogueEngine(input, { node: () => { nodes++; }, reply: () => {}, complete: () => {} });
  engine.start(DIALOGUES.Cafe.scenarios[0]); const stale = input.callback; engine.stop(); stale(0); assert.equal(nodes, 1);
  engine.start(DIALOGUES.Cafe.scenarios[0]); stale(0); assert.equal(nodes, 2);
});
