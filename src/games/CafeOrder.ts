import type { Level } from '../data/levels';
import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import type { WordEntry } from '../data/words/types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
export function cafeOrderText(targets: readonly WordEntry[], level: Level): string {
  if (!targets[0] || (level >= 3 && !targets[1])) throw new Error('Order needs enough items for its level');
  if (level === 1) return targets[0].word;
  if (level === 2) return `Can I get the ${targets[0].word}, please?`;
  return `Can I get the ${targets[0].word} and the ${targets[1].word}, please?`;
}
export class CafeOrder extends BaseGame {
  readonly id = 'cafe-order'; readonly name = '聽單點餐'; readonly location = 'Cafe'; readonly topics = ['food_drink'] as const;
  // Items must be nouns; quantity/grammar words tagged for ordering are not menu items.
  eligible(word: WordEntry): boolean { return /^n\./.test(word.pos) && !["appetite", "amount", "bag", "bakery", "basket", "bill", "bottle", "bowl", "breakfast", "lunch", "dinner", "supper", "meal", "taste", "price", "sale", "order", "service", "restaurant", "cafe", "cafeteria", "menu", "tip", "check", "customer", "waiter", "waitress", "shopkeeper", "sample", "piece", "loaf", "pair", "kind", "size", "half", "total", "noise", "card", "cash", "change", "cup", "diet", "dish", "dozen", "farm", "fork", "freezer", "glass", "gram", "hen", "hunger", "jazz", "kitchen", "knife", "lid", "liter", "machine", "magazine", "market", "microwave", "napkin", "oven", "pan", "party", "picnic", "plate", "pot", "production", "refrigerator", "saucer", "sink", "slice", "spoon", "steam", "stove", "straw", "supermarket", "table", "teapot", "tradition", "wok", "chopsticks", "convenience store", "credit card", "dining room"].includes(word.word.toLowerCase()); }
  private customer = 0;
  start(context: MiniGameContext): void { this.begin(context); this.customer = 0; this.question(); }
  private question(): void {
    const {words,host,level} = this.context;
    if (this.customer >= 10) { this.context.finish(); return; }
    const primary = words[this.customer % words.length];
    const others = shuffle(words.filter(w=>w.id!==primary.id)).slice(0,5);
    const items = shuffle([primary,...others]);
    const targets = level >= 3 ? [primary,others[0]] : [primary];
    const order = cafeOrderText(targets,level);
    let replays = 0, index = 0, done = false, revealed = false; const started = performance.now();
    const feedback = element('p','game-feedback','請依聽到的順序，點選英文品項。');
    const replay = action('再聽一次（還有 2 次）',()=>{
      if (replays>=2 || done) return; replays++; this.context.speak(order); replay.textContent = `再聽一次（還有 ${2-replays} 次）`; replay.disabled = replays>=2;
    });
    const cards = element('div','game-choices order-cards');
    const end = (correct:boolean): void => {
      done = true; replay.disabled = true; cards.querySelectorAll('button').forEach(b=>{b.disabled=true;});
      feedback.textContent = `${correct ? '訂單完成！' : '這次訂單是：'}${targets.map(w=>w.word+'（'+w.zh.join('、')+'）').join(' → ')}`;
      const next = action(this.customer===9?'查看結算':'下一位客人 →',()=>{this.customer++;this.question();});
      feedback.after(next);next.focus({preventScroll:true});
    };
    for (const item of items) cards.append(action(item.word,()=>{
      if(done)return;
      const target=targets[index],correct=item.id===target.id;
      if (!revealed) this.context.answer(target,correct,Math.max(0,10-(performance.now()-started)/1000));
      if(!correct){end(false);return;}
      index++; feedback.textContent=`已完成 ${index}／${targets.length} 樣`;
      if(index===targets.length)end(true);
    },'ui-button order-item'));
    const transcript=element('p','order-transcript');transcript.hidden=true;
    const help=action('語音無法播放？查看文字（本題不計分）',()=>{
      if(revealed||done)return;revealed=true;this.context.answer(targets[index],false);transcript.hidden=false;transcript.textContent=order;help.disabled=true;
    },'ui-button quiet');
    host.replaceChildren(element('p','game-progress',`第 ${this.customer+1}／10 位客人 · ${targets.length} 樣品項`),
      element('div','customer-avatar','●'),element('h2','game-question','聽聽客人想點什麼'),replay,cards,feedback,help,transcript);
    this.context.speak(order);
  }
}
