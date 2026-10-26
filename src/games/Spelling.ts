import { normalizeWord } from '../data/words/types';
import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import type { WordEntry } from '../data/words/types';
import { spellingHint } from './rules';
import { screenKeyboard, physicalKey } from './keyboard';
import { action, element } from '../ui/dom';
export class Spelling extends BaseGame {
  readonly id = 'spelling'; readonly name = '拼字跑步'; readonly location = 'School'; readonly topics = ['school_sports'] as const;
  private queue: WordEntry[] = []; private steps = 0; private input = ''; private revealed = false;
  private output!: HTMLOutputElement; private feedback!: HTMLElement; private started = 0;
  start(context: MiniGameContext): void {
    this.begin(context); this.steps = 0; this.queue = [...context.words]; this.started = performance.now();
    this.listen(window, 'keydown', event => { if (this.revealed || (event.target instanceof Element && event.target.closest('.game-toolbar'))) return; const key = physicalKey(event); if (key) this.key(key); }); this.question();
  }
  private question(): void {
    if (this.steps >= 10) { this.context.finish(Math.max(0, 120 - Math.floor((performance.now() - this.started) / 1000))); return; }
    const word = this.queue[0]; if (!word) { this.context.finish(); return; }
    this.input = ''; this.revealed = false; this.context.speak(word.word);
    const track = element('div', 'running-track'); const runner = element('span', 'runner', '●');
    runner.style.insetInlineStart = `${this.steps * 9}%`; track.append(runner, element('span', 'finish-line', '⚑'));
    this.output = element('output', 'spelling-output', '請用下方鍵盤拼字'); this.output.setAttribute('aria-live','polite');
    this.feedback = element('p', 'game-feedback', '拼對往前跑一步，目標 10 步。');
    this.context.host.replaceChildren(element('p', 'game-progress', `已跑 ${this.steps}／10 步`), track,
      element('h2', 'game-question', word.zh.join('、')), element('p', 'muted', word.pos),
      element('p', 'spelling-hint', spellingHint(word.word)), this.output, this.feedback,
      screenKeyboard(key => this.key(key)),
      action('看答案（計一次答錯）', () => {
        if (this.revealed) return; this.revealed = true; this.context.answer(word, false); this.context.speak(word.word);
        this.feedback.textContent = `正確拼法：${word.word}。這個字稍後會再出現。`;
        this.queue.shift(); this.queue.splice(Math.min(2,this.queue.length),0,word);
        const next = action('繼續練習', () => this.question()); this.feedback.after(next); next.focus({preventScroll:true});
      }, 'ui-button quiet'));
  }
  private key(key: string): void {
    if (this.stopped || this.revealed) return;
    const word = this.queue[0]; if (!word) return;
    if (key === 'Enter') {
      if (!this.input.trim()) return;
      const correct = normalizeWord(this.input) === normalizeWord(word.word);
      this.context.answer(word, correct);
      if (correct) { this.steps++; this.queue.shift(); this.context.speak(word.word); this.question(); }
      else { this.feedback.textContent = '再試一次，或點「看答案」。'; this.output.classList.remove('shake'); void this.output.offsetWidth; this.output.classList.add('shake'); this.input = ''; this.output.textContent = '再試一次'; }
    } else {
      this.input = key === 'Backspace' ? this.input.slice(0,-1) : this.input.length < word.word.length + 3 ? this.input + key.toLowerCase() : this.input;
      this.output.textContent = this.input || '請輸入拼字';
    }
  }
}
