import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
export class Fishing extends BaseGame {
  readonly id = 'fishing'; readonly name = '釣魚'; readonly location = 'Park'; readonly topics = [];
  private index = 0;
  start(context: MiniGameContext): void { this.begin(context); this.index = 0; this.question(); }
  private question(): void {
    const { words, host } = this.context;
    if (this.index >= Math.min(10, words.length)) { this.context.finish(); return; }
    const word = words[this.index]; let locked = false;
    const pond = element('div', 'fishing-pond cast'); pond.append(element('span', 'fishing-rod', '🎣'), element('span', 'fish', '▰'));
    const label = element('h2', 'game-word', word.word); label.lang = 'en';
    const clock = element('p', 'game-timer');
    const feedback = element('p', 'game-feedback', '魚上鉤了！選出正確意思。');
    const choices = element('div', 'game-choices');
    const others = shuffle(words.filter(w => w.id !== word.id && w.zh[0] !== word.zh[0]));
    const used = new Set([word.zh[0]]);
    const distinct = others.filter(w => { if (used.has(w.zh[0])) return false; used.add(w.zh[0]); return true; }).slice(0,3);
    const deadline = performance.now() + 8000;
    const answer = (correct: boolean, selected?: HTMLButtonElement): void => {
      if (locked || this.stopped) return; locked = true;
      const remaining = Math.max(0, deadline - performance.now());
      const accepted = correct && remaining > 0;
      this.context.answer(word, accepted, remaining / 1000);
      pond.className = accepted ? 'fishing-pond reel' : 'fishing-pond escaped';
      feedback.textContent = accepted ? '收竿成功！' : `魚跑掉了！${word.word}：${word.zh.join('、')}`;
      this.context.sfx(accepted ? 'correct' : 'wrong');
      choices.querySelectorAll('button').forEach(button => { button.disabled = true; if (button.dataset.correct === 'true') button.classList.add('choice-correct'); else if (button === selected) button.classList.add('choice-wrong'); });
      if (accepted) { this.timer(() => { this.index++; this.question(); }, 900); return; }
      const next = action(this.index === 9 ? '查看結算' : '下一條魚 →', () => { this.index++; this.question(); });
      feedback.after(next); next.focus({preventScroll:true});
    };
    for (const choice of shuffle([word, ...distinct])) {
      const button = action(choice.zh.join('、'), () => answer(choice.id === word.id, button));
      button.dataset.correct = String(choice.id === word.id); choices.append(button);
    }
    const replay = action('↻ 重播單字', () => this.context.speak(word.word));
    host.replaceChildren(element('p', 'game-progress', `第 ${this.index + 1}／10 題 · 每題 8 秒`), pond, label, clock, replay, choices, feedback);
    this.context.speak(word.word);
    const tick = (): void => {
      if (locked || this.stopped) return;
      clock.textContent = `剩下 ${Math.max(0, (deadline - performance.now()) / 1000).toFixed(1)} 秒`;
      if (performance.now() >= deadline) answer(false); else this.timer(tick,100);
    }; tick();
  }
}
