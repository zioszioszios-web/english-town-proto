import type { Level } from '../data/levels';
import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import type { WordEntry } from '../data/words/types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
const MENU_ITEMS = new Set(["appetizer", "cheeseburger", "entree", "almond", "apple", "bacon", "banana", "barbecue", "bass", "batter", "bean", "beef", "beer", "berry", "beverage", "biscuit", "bread", "broth", "brunch", "buffet", "bun", "burger", "butter", "cabbage", "cake", "candy", "carrot", "celery", "cereal", "champagne", "cheese", "cherry", "chestnut", "chicken", "chili", "chip", "chocolate", "clam", "cocktail", "cocoa", "coconut", "coffee", "cola", "cookie", "corn", "crab", "cracker", "cream", "cucumber", "curry", "dessert", "dough", "doughnut", "dressing", "drink", "duck", "dumpling", "egg", "fish", "flour", "food", "fowl", "fries", "fruit", "garlic", "ginger", "grain", "grape", "grapefruit", "guava", "gum", "ham", "hamburger", "herb", "honey", "hot dog", "ice", "ice cream", "jam", "jasmine", "jelly", "juice", "ketchup", "lamb", "lemon", "lemonade", "lettuce", "liquor", "liver", "lobster", "lollipop", "mango", "meat", "melon", "milk", "mint", "mushroom", "mustard", "noodle", "nut", "oatmeal", "octopus", "oil", "olive", "onion", "orange", "oyster", "pancake", "papaya", "pasta", "pastry", "pea", "peach", "peanut", "pear", "pepper", "pickle", "pie", "pineapple", "pizza", "plum", "popcorn", "pork", "potato", "poultry", "powder", "pudding", "pumpkin", "radish", "raisin", "rib", "rice", "salad", "salmon", "salt", "sandwich", "sauce", "sausage", "seafood", "shrimp", "snack", "soda", "soft drink", "soup", "soy-sauce", "soybean", "spaghetti", "spice", "spinach", "squash", "steak", "stew", "strawberry", "sugar", "syrup", "tangerine", "tea", "toast", "tofu", "tomato", "trifle", "trout", "tuna", "turkey", "vanilla", "vegetable", "vinegar", "walnut", "water", "watermelon", "wheat", "whiskey", "wine", "yam", "yogurt", "yolk"]);
export function cafeOrderText(targets: readonly WordEntry[], level: Level): string {
  if (!targets[0] || (level >= 3 && !targets[1])) throw new Error('Order needs enough items for its level');
  if (level === 1) return targets[0].word;
  if (level === 2) return `Can I get the ${targets[0].word}, please?`;
  return `Can I get the ${targets[0].word} and the ${targets[1].word}, please?`;
}
export class CafeOrder extends BaseGame {
  readonly id = 'cafe-order'; readonly name = '聽單點餐'; readonly location = 'Cafe'; readonly topics = ['food_drink'] as const;
  // Only curated food/drink headwords can appear on the menu.
  eligible(word: WordEntry): boolean { return MENU_ITEMS.has(word.word.toLowerCase()); }
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
      this.context.sfx(correct?'correct':'wrong');
      if(correct){this.timer(()=>{this.customer++;this.question();},900);return;}
      const next = action(this.customer===9?'查看結算':'下一位客人 →',()=>{this.customer++;this.question();});
      feedback.after(next);next.focus({preventScroll:true});
    };
    for (const item of items) { const button=action(item.word,()=>{
      if(done)return;
      const target=targets[index],correct=item.id===target.id;
      if (!revealed) this.context.answer(target,correct,Math.max(0,10-(performance.now()-started)/1000));
      if(!correct){button.classList.add('choice-wrong');cards.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{if(b.dataset.word===target.id)b.classList.add('choice-correct');});end(false);return;}
      button.classList.add('choice-correct');button.disabled=true;
      index++; feedback.textContent=`已完成 ${index}／${targets.length} 樣`;
      if(index===targets.length)end(true);
    },'ui-button order-item');button.dataset.word=item.id;cards.append(button); }
    const transcript=element('p','order-transcript');transcript.hidden=true;
    const help=action('語音無法播放？查看文字（本題不計分）',()=>{
      if(revealed||done)return;revealed=true;this.context.answer(targets[index],false);transcript.hidden=false;transcript.textContent=order;help.disabled=true;
    },'ui-button quiet');
    host.replaceChildren(element('p','game-progress',`第 ${this.customer+1}／10 位客人 · ${targets.length} 樣品項`),
      element('div','customer-avatar','●'),element('h2','game-question','聽聽客人想點什麼'),replay,cards,feedback,help,transcript);
    this.context.speak(order);
  }
}
