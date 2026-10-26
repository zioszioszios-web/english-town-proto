import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
export class StreetRunner extends BaseGame {
  readonly id='runner';readonly name='選道路跑酷';readonly location='Street';readonly topics=['transport_city'] as const;
  private lane=1;private round=0;private hearts=3;private distance=0;private speed=5;
  private player!:HTMLElement;private status!:HTMLElement;private prompt!:HTMLElement;private gates!:HTMLElement;private feedback!:HTMLElement;
  private started=0;private last=0;private duration=6500;private correctLane=0;
  start(context:MiniGameContext):void{
    this.begin(context);this.lane=1;this.round=0;this.hearts=3;this.distance=0;this.speed=5;
    this.status=element('p','game-progress');this.prompt=element('h2','game-question');
    const road=element('div','runner-road');road.setAttribute('aria-label','三條跑道，左右滑動切換');
    this.player=element('span','road-player','●');this.gates=element('div','road-gates');road.append(this.gates,this.player);
    this.feedback=element('p','game-feedback','看中文，跑進正確的英文跑道。');
    const controls=element('div','lane-controls');controls.append(action('← 左移',()=>this.move(-1)),action('右移 →',()=>this.move(1)));
    let down:number|null=null;
    road.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;down=event.clientX;road.setPointerCapture(event.pointerId);});
    road.addEventListener('pointerup',event=>{if(down!==null&&Math.abs(event.clientX-down)>24)this.move(event.clientX>down?1:-1);down=null;});
    road.addEventListener('pointercancel',()=>{down=null;});
    this.listen(window,'keydown',event=>{
      if(event.target instanceof Element&&event.target.closest('.game-toolbar'))return;
      const key=(event as KeyboardEvent).key;if(key==='ArrowLeft'||key==='ArrowRight'){event.preventDefault();this.move(key==='ArrowLeft'?-1:1);}
    });
    context.host.replaceChildren(this.status,this.prompt,road,this.feedback,controls);
    this.move(0);this.question();this.last=performance.now();this.tick();
  }
  private move(delta:number):void{
    if(this.stopped)return;this.lane=Math.max(0,Math.min(2,this.lane+delta));this.player.style.insetInlineStart=((this.lane+.5)*100/3)+'%';this.player.setAttribute('aria-label','目前第 '+(this.lane+1)+' 條跑道');
  }
  private question():void{
    const words=this.context.words,target=words[this.round%words.length];
    const choices=shuffle([target,...shuffle(words.filter(w=>w.id!==target.id&&w.zh[0]!==target.zh[0])).slice(0,2)]);
    this.correctLane=choices.findIndex(w=>w.id===target.id);this.prompt.textContent=target.zh.join('、');
    this.gates.replaceChildren(...choices.map(word=>{const node=element('span','road-word',word.word);node.lang='en';return node;}));
    this.started=performance.now();this.duration=Math.max(1800,6500-this.round*140);this.context.speak(choices.map(word=>word.word).join(', '));
  }
  private tick():void{
    if(this.stopped)return;
    const now=performance.now(),elapsed=(now-this.last)/1000;this.last=now;this.speed=Math.min(20,this.speed+elapsed*.025);this.distance+=this.speed*elapsed;
    this.status.textContent='♥'.repeat(this.hearts)+' · '+Math.floor(this.distance)+' 公尺 · 速度 '+this.speed.toFixed(1);
    const progress=Math.min(1,(now-this.started)/this.duration);this.gates.style.insetBlockStart=(progress*65)+'%';
    if(progress>=1){
      const word=this.context.words[this.round%this.context.words.length],correct=this.lane===this.correctLane;this.context.answer(word,correct);
      if(correct){this.speed=Math.min(20,this.speed+.35);this.feedback.textContent='選對了！'+word.word+' · 加速！';}
      else{this.hearts--;this.feedback.textContent='正確跑道是 '+word.word+'（'+word.zh.join('、')+'）';}
      if(this.hearts<=0){this.context.finish(Math.floor(this.distance/10));return;}this.round++;this.question();
    }this.timer(()=>this.tick(),80);
  }
}
