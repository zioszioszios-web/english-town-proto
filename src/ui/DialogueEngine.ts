import type { DialogueNode, Reply, Scenario } from '../data/dialogues/types';
import type { ReplyInput } from './ReplyInput';
export interface DialogueHooks {
  node(node: DialogueNode): void;
  reply(reply: Reply): void;
  complete(spoken: number): void;
}
export class DialogueEngine {
  private version = 0;
  private spoken = 0;
  constructor(private readonly input: ReplyInput, private readonly hooks: DialogueHooks) {}
  start(scenario: Scenario): void {
    this.stop();
    this.spoken = 0;
    const version = this.version;
    const nodes = new Map(scenario.nodes.map(node => [node.id, node]));
    const show = (node: DialogueNode): void => {
      if (version !== this.version) return;
      this.hooks.node(node);
      let accepted = false;
      this.input.request(node.replies, index => {
        if (accepted || version !== this.version) return;
        const reply = node.replies[index];
        if (!reply) return;
        accepted = true;
        this.spoken++;
        this.hooks.reply(reply);
        if (reply.next === null) { this.input.cancel(); this.hooks.complete(this.spoken); }
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
