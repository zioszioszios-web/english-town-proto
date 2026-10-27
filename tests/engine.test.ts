import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DialogueEngine, type DialogueSummary } from '../src/ui/DialogueEngine';
import type { ReplyInput } from '../src/ui/ReplyInput';
import type { Reply, ReplyType, Scenario } from '../src/data/dialogues/types';
import { DIALOGUES } from '../src/data/dialogues';
class Input implements ReplyInput {
  callback: (index: number) => void = () => {};
  replies: readonly Reply[] = [];
  requests: (readonly Reply[])[] = [];
  request(replies: readonly Reply[], callback: (index: number) => void): void { this.replies = replies; this.requests.push(replies); this.callback = callback; }
  cancel(): void { this.callback = () => {}; }
  choose(type: ReplyType, occurrence = 0): void {
    const reply = this.replies.filter(reply => reply.type === type)[occurrence];
    assert.ok(reply, `missing ${type} option`); this.callback(this.replies.indexOf(reply));
  }
  advance(): void { this.choose(this.replies.some(reply => reply.type === 'branch') ? 'branch' : 'variant'); }
}
function session(scenario: Scenario = DIALOGUES.Cafe.scenarios[0]) {
  const input = new Input(), lines: string[] = [], mistakes: Reply[] = [], spoken: Reply[] = [];
  const summaries: DialogueSummary[] = [];
  const engine = new DialogueEngine(input, { node: node => lines.push(node.npc), reply: (reply, node) => { assert.ok(node.replies.includes(reply)); spoken.push(reply); }, mistake: reply => mistakes.push(reply), complete: summary => summaries.push(summary) });
  engine.start(scenario);
  const finish = (): DialogueSummary => {
    for (let i = 0; i < 12 && !summaries.length; i++) input.advance();
    assert.equal(summaries.length, 1); return summaries[0];
  };
  return { input, engine, lines, mistakes, spoken, summaries, finish };
}

test('the engine uses its input abstraction and different branches produce different NPC lines', () => {
  const play = (branch: number): string[] => {
    const s = session(); s.input.choose('branch'); s.input.choose('branch', branch);
    assert.deepEqual(s.finish(), { spoken: 7, mistakes: 0, learned: 2 }); return s.lines;
  };
  assert.notDeepEqual(play(0), play(1));
});
test('mistakes trigger feedback and a filtered retry without repeating the node or adding spoken', () => {
  const s = session(), before = s.input.requests[0], stale = s.input.callback;
  const mistake = before.find(reply => reply.type === 'mistake')!;
  s.input.choose('mistake');
  assert.deepEqual(s.mistakes, [mistake]); assert.equal(s.lines.length, 1); assert.equal(s.spoken.length, 0);
  assert.equal(s.input.requests.length, 2); assert.deepEqual(s.input.replies, before.filter(reply => reply !== mistake));
  stale(before.indexOf(mistake)); assert.equal(s.mistakes.length, 1);
  assert.deepEqual(s.finish(), { spoken: 7, mistakes: 1, learned: 3 });
});
test('a variant teaches every variant at that node, including unselected alternatives', () => {
  const s = session(DIALOGUES.Cafe.scenarios[2]);
  s.input.choose('variant', 1); s.input.choose('variant');
  assert.deepEqual(s.finish(), { spoken: 7, mistakes: 0, learned: 8 });
});
test('mistake corrections and variant phrases share a deduplicated learned set', () => {
  const scenario = structuredClone(DIALOGUES.Cafe.scenarios[0]);
  const mistake = scenario.nodes[0].replies.find(reply => reply.type === 'mistake')!;
  const variants = scenario.nodes.find(node => node.id === 'pay')!.replies;
  mistake.correction = variants[0].en;
  const s = session(scenario); s.input.choose('mistake');
  assert.deepEqual(s.finish(), { spoken: 7, mistakes: 1, learned: 2 });
});
test('successive mistakes are removed cumulatively and counted once each', () => {
  const scenario = structuredClone(DIALOGUES.Cafe.scenarios[0]);
  const mistake = scenario.nodes[0].replies.find(reply => reply.type === 'mistake')!;
  scenario.nodes[0].replies.push({ ...mistake, en: 'Another error.', correction: 'A different correction.' });
  const s = session(scenario); s.input.choose('mistake'); s.input.choose('mistake');
  assert.ok(s.input.replies.every(reply => reply.type !== 'mistake'));
  assert.equal(s.lines.length, 1); assert.deepEqual(s.finish(), { spoken: 7, mistakes: 2, learned: 4 });
});
test('a stale input callback after stop cannot advance a new or abandoned session', () => {
  const s = session(), stale = s.input.callback;
  const index = s.input.replies.findIndex(reply => reply.type === 'branch');
  s.engine.stop(); stale(index); assert.equal(s.lines.length, 1); assert.equal(s.spoken.length, 0);
  s.engine.start(DIALOGUES.Cafe.scenarios[0]); stale(index); assert.equal(s.lines.length, 2); assert.equal(s.spoken.length, 0);
});
test('a retry callback becomes invalid after stop and a new session resets counts', () => {
  const s = session(); s.input.choose('mistake');
  const stale = s.input.callback, index = s.input.replies.findIndex(reply => reply.type === 'branch');
  s.engine.stop(); stale(index); assert.equal(s.lines.length, 1); assert.equal(s.spoken.length, 0);
  s.engine.start(DIALOGUES.Cafe.scenarios[0]); stale(index); assert.equal(s.lines.length, 2);
  assert.deepEqual(s.finish(), { spoken: 7, mistakes: 0, learned: 2 });
});
test('invalid indices leave the current request available and accepted callbacks run once', () => {
  const s = session(), stale = s.input.callback;
  stale(-1); assert.equal(s.lines.length, 1);
  const index = s.input.replies.findIndex(reply => reply.type === 'branch');
  stale(index); stale(index); assert.equal(s.lines.length, 2); assert.equal(s.spoken.length, 1);
  s.finish();
});
