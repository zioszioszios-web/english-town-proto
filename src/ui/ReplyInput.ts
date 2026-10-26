import type { Reply } from '../data/dialogues/types';
/** Future microphone input can return an index after matching a recognized sentence. */
export interface ReplyInput {
  request(replies: readonly Reply[], onReply: (index: number) => void): void;
  cancel(): void;
}
