import type { ReplyInput } from './ReplyInput';
import type { Reply } from '../data/dialogues/types';
export class TapReplyInput implements ReplyInput {
  constructor(private readonly host: HTMLElement) {}
  request(replies: readonly Reply[], onReply: (index: number) => void): void {
    this.cancel();
    let accepted = false;
    replies.forEach((reply, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reply-option';
      const en = document.createElement('span'); en.lang = 'en'; en.textContent = reply.en;
      const zh = document.createElement('span'); zh.className = 'reply-hint'; zh.textContent = reply.zh;
      button.append(en, zh);
      button.addEventListener('click', () => {
        if (accepted) return;
        accepted = true;
        this.cancel();
        onReply(index);
      });
      this.host.append(button);
    });
  }
  cancel(): void { this.host.replaceChildren(); }
}
