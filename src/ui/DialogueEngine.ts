import type { BranchReply, DialogueNode, MistakeReply, Scenario, VariantReply } from '../data/dialogues/types';
import type { ReplyInput } from './ReplyInput';
export interface DialogueSummary { spoken: number; mistakes: number; learned: number }
export interface DialogueHooks {
  node(node: DialogueNode): void;
  reply(reply: BranchReply | VariantReply, node: DialogueNode): void;
  mistake(reply: MistakeReply): void;
  complete(summary: DialogueSummary): void;
}
export class DialogueEngine {
  private version = 0;
  private spoken = 0;
  constructor(private readonly input: ReplyInput, private readonly hooks: DialogueHooks) {}
  start(scenario: Scenario): void {
    this.stop();
    this.spoken = 0;
    let mistakes = 0;
    const learned = new Set<string>();
    const version = this.version;
    const nodes = new Map(scenario.nodes.map(node => [node.id, node]));
    const show = (node: DialogueNode): void => {
      if (version !== this.version) return;
      this.hooks.node(node);
      request(node, new Set());
    };
    const request = (node: DialogueNode, selected: Set<MistakeReply>): void => {
      if (version !== this.version) return;
      const replies = node.replies.filter(reply => reply.type !== 'mistake' || !selected.has(reply));
      let accepted = false;
      this.input.request(replies, index => {
        if (accepted || version !== this.version) return;
        const reply = replies[index];
        if (!reply) return;
        accepted = true;
        if (reply.type === 'mistake') {
          mistakes++; learned.add(reply.correction); selected.add(reply);
          this.hooks.mistake(reply); request(node, selected); return;
        }
        this.spoken++;
        if (reply.type === 'variant') for (const option of node.replies) if (option.type === 'variant') learned.add(option.en);
        this.hooks.reply(reply, node);
        if (version !== this.version) return;
        if (reply.next === null) { this.input.cancel(); this.hooks.complete({ spoken: this.spoken, mistakes, learned: learned.size }); }
        else {
          const next = nodes.get(reply.next);
          if (!next) throw new Error(`Missing dialogue node: ${reply.next}`);
          show(next);
        }
      });
    };
    const first = scenario.nodes[0];
    if (!first) throw new Error(`Empty scenario: ${scenario.id}`);
    show(first);
  }
  stop(): void { this.version++; this.input.cancel(); }
}
