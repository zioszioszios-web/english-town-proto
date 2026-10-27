// Browser fixture only: Vite serves tests/games.html in development; no production entry.
import { element, action } from '../src/ui/dom';
import { MiniGameUI } from '../src/ui/MiniGameUI';
import { PracticeStore } from '../src/games/storage';
import { LocalScoreRepository } from '../src/games/scores';
import { GAME_FACTORIES } from '../src/games/registry';
import { Sfx } from '../src/games/sfx';
import { Speech } from '../src/ui/Speech';
import '../src/ui/ui.css';
const data = new Map<string,string>();
const storage = { getItem: (key:string) => data.get(key)??null, setItem:(key:string,value:string) => {data.set(key,value);} };
const practice = new PracticeStore(()=>storage), scores = new LocalScoreRepository(()=>storage);
const speech = new Speech();
const root = element('main','ui-overlay'), shell = element('div','ui-shell'), host = element('div','ui-body');
root.append(shell); shell.append(element('h1','ui-title','小遊戲互動測試頁'),host); document.body.append(root);
const ui = new MiniGameUI(host,practice,scores,speech,new Sfx(),()=>menu());
let level: 1|2|3|4 = 1;
function menu(): void {
  ui.stop(); const panel = element('div','menu-panel');
  panel.append(action('切換測試等級（目前 Lv'+level+'）',()=>{level=level===1?2:level===2?3:level===3?4:1;menu();}));
  for (const factory of GAME_FACTORIES) { const game = factory(); panel.append(action(game.name,()=>{void ui.open(game,level);})); }
  host.replaceChildren(panel);
}
menu();
