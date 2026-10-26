import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
export class Memory extends BaseGame {
  readonly id = 'memory'; readonly name = '翻牌配對'; readonly location = 'Hotel'; readonly topics = ['travel_lodging'] as const;
  start(context: MiniGameContext): void {
    this.begin(context);
    const meanings = new Set<string>();
    const pairs = context.words.filter(word => { const label = word.zh.join('、'); if (meanings.has(label)) return false; meanings.add(label); return true; }).slice(0, context.level === 1 ? 4 : 6);
    const cards = shuffle(pairs.flatMap(word => [{word, english:true}, {word, english:false}]));
    const grid = element('div', 'memory-grid');
    const status = element('p', 'game-feedback', '翻開英文與對應的中文。');
    const movesLabel = element('p', 'game-progress');
    let open: number[] = [], locked = false, moves = 0, matches = 0;
    const started = performance.now();
    const buttons = cards.map((card,index) => {
      let matched = false;
      const button = action('？', () => {
        if (locked || matched || open.includes(index) || this.stopped) return;
        button.textContent = card.english ? card.word.word : card.word.zh.join('、'); button.classList.add('flipped');
        button.setAttribute('aria-label', button.textContent);
        if (card.english) context.speak(card.word.word);
        open.push(index);
        if (open.length === 2) {
          moves++; movesLabel.textContent = `翻牌 ${moves} 次 · 已配對 ${matches}／${pairs.length}`;
          const [a,b] = open, correct = cards[a].word.id === cards[b].word.id;
          if (correct) {
            matched = true; buttons[a].disabled = true; buttons[b].disabled = true; matches++;
            buttons[a].classList.add('matched'); buttons[b].classList.add('matched');
            context.answer(card.word, true); open = [];
            movesLabel.textContent = `翻牌 ${moves} 次 · 已配對 ${matches}／${pairs.length}`;
            status.textContent = '配對成功！';
            if (matches === pairs.length) {
              const done = action('查看結算', () => context.finish(Math.max(0, 120 - Math.floor((performance.now() - started) / 1000) - (moves - pairs.length) * 3)));
              grid.after(done); done.focus({preventScroll:true});
            }
          } else {
            context.answer(cards[a].word, false); context.answer(cards[b].word, false); locked = true;
            status.textContent = '再記一下，兩張卡片不相符。';
            this.timer(() => { for (const i of [a,b]) { buttons[i].textContent = '？'; buttons[i].classList.remove('flipped'); buttons[i].setAttribute('aria-label', `第 ${i+1} 張未翻開的卡片`); } open = []; locked = false; }, 900);
          }
        }
      }, 'memory-card');
      button.setAttribute('aria-label', `第 ${index+1} 張未翻開的卡片`); grid.append(button); return button;
    });
    movesLabel.textContent = `翻牌 0 次 · 已配對 0／${pairs.length}`;
    context.host.replaceChildren(movesLabel, status, grid);
  }
}
