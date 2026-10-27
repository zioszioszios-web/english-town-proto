import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { runnerDirection, shuffle } from './rules';
import { action, element } from '../ui/dom';
export class StreetRunner extends BaseGame {
  readonly id='runner';readonly name='選道路跑酷';readonly location='Street';readonly topics=['transport_city'] as const;
  private lane=1;private round=0;private hearts=3;private distance=0;private speed=5;private streak=0;
  private player!:HTMLElement;private status!:HTMLElement;private prompt!:HTMLElement;private gates!:HTMLElement;private feedback!:HTMLElement;
  private road!:HTMLElement;private lines!:HTMLElement;private hint!:HTMLElement;private travel=0;private statusText='';
  private direction:'zh-en'|'en-zh'='zh-en';private reducedMotion!:MediaQueryList;
  private started=0;private last=0;private duration=6500;private correctLane=0;
  start(context:MiniGameContext):void{
    this.begin(context);this.lane=1;this.round=0;this.hearts=3;this.distance=0;this.speed=5;this.streak=0;this.statusText='';
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.status=element('p','game-progress');this.prompt=element('h2','game-question');this.hint=element('p','muted');
    this.road=element('div','runner-road');this.road.setAttribute('aria-label','三條跑道，點選跑道或左右滑動切換');
    this.lines=element('div','road-lines');this.lines.setAttribute('aria-hidden','true');
    this.player=element('span','road-player','●');this.gates=element('div','road-gates');this.road.append(this.lines,this.gates,this.player);
    this.feedback=element('p','game-feedback');
    const controls=element('div','lane-controls');controls.append(action('← 左移',()=>this.move(-1)),action('右移 →',()=>this.move(1)));
    let down:number|null=null;
    this.road.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;down=event.clientX;this.road.setPointerCapture(event.pointerId);});
    this.road.addEventListener('pointerup',event=>{
      if(down!==null){
        if(Math.abs(event.clientX-down)>24)this.move(event.clientX>down?1:-1);
        else{const rect=this.road.getBoundingClientRect();if(rect.width>0)this.move(Math.floor((event.clientX-rect.left)/rect.width*3)-this.lane);}
      }down=null;
    });
    this.road.addEventListener('pointercancel',()=>{down=null;});
    this.listen(window,'keydown',event=>{
      if(event.target instanceof Element&&event.target.closest('.game-toolbar'))return;
      const key=(event as KeyboardEvent).key;if(key==='ArrowLeft'||key==='ArrowRight'){event.preventDefault();this.move(key==='ArrowLeft'?-1:1);}
    });
    this.listen(window,'resize',()=>this.measure());
    context.host.replaceChildren(this.status,this.hint,this.prompt,this.road,this.feedback,controls);
    this.move(0);this.question();this.last=performance.now();this.frame(now=>this.tick(now));
  }
  private measure():void{this.travel=Math.max(0,this.player.offsetTop-this.gates.offsetHeight);}
  private move(delta:number):void{
    if(this.stopped)return;this.lane=Math.max(0,Math.min(2,this.lane+delta));this.player.style.insetInlineStart=((this.lane+.5)*100/3)+'%';this.player.setAttribute('aria-label','目前第 '+(this.lane+1)+' 條跑道');
  }
  private question():void{
    const words=this.context.words,target=words[this.round%words.length];this.direction=runnerDirection(this.context.level);
    const used=new Set([target.zh[0]]);
    const others=shuffle(words.filter(w=>w.id!==target.id&&w.zh[0]!==target.zh[0])).filter(w=>{
      if(this.direction==='zh-en')return true;if(used.has(w.zh[0]))return false;used.add(w.zh[0]);return true;
    }).slice(0,2);
    const choices=shuffle([target,...others]);
    this.correctLane=choices.findIndex(w=>w.id===target.id);this.prompt.textContent=this.direction==='zh-en'?target.zh.join('、'):target.word;this.prompt.lang=this.direction==='zh-en'?'zh-Hant':'en';
    this.hint.textContent=this.direction==='zh-en'?'看中文，跑進英文跑道':'看英文，跑進中文跑道';
    this.gates.replaceChildren(...choices.map(word=>{const node=element('span','road-word',this.direction==='zh-en'?word.word:word.zh[0]);node.lang=this.direction==='zh-en'?'en':'zh-Hant';return node;}));
    this.gates.style.transform='translateY(0px)';this.measure();
    this.started=performance.now();this.duration=Math.max(1800,6500-this.round*140);if(this.direction==='en-zh')this.context.speak(target.word);
  }
  private jump(name:string):void{
    this.player.classList.remove('jump-big','jump-huge','jump-small');void this.player.offsetWidth;this.player.classList.add(name);
  }
  private pop(text:string,correct:boolean):void{
    const node=element('span','road-pop '+(correct?'correct':'wrong'),text);node.style.insetInlineStart=((this.lane+.5)*100/3)+'%';this.road.append(node);this.timer(()=>node.remove(),900);
  }
  private tick(now:number):void{
    if(this.stopped)return;
    const elapsed=(now-this.last)/1000;this.last=now;this.speed=Math.min(20,this.speed+elapsed*.025);this.distance+=this.speed*elapsed;
    const progress=Math.min(1,(now-this.started)/this.duration);this.gates.style.transform='translateY('+(progress*this.travel)+'px)';
    if(progress>=1){
      const word=this.context.words[this.round%this.context.words.length],correct=this.lane===this.correctLane;this.context.answer(word,correct);
      if(this.direction==='zh-en')this.context.speak(word.word);
      if(correct){
        this.streak++;const bonus=20+5*Math.min(4,this.streak-1);this.distance+=bonus;this.speed=Math.min(20,this.speed+.8);
        this.jump(this.streak>=3?'jump-huge':'jump-big');this.pop('+'+bonus+' 公尺',true);this.feedback.textContent='跳過去了！'+word.word+' · +'+bonus+' 公尺';
      }else{
        this.streak=0;this.speed=Math.max(4,this.speed-1.5);this.hearts--;this.jump('jump-small');this.pop('絆倒了！',false);
        this.road.classList.remove('shake');void this.road.offsetWidth;this.road.classList.add('shake');this.feedback.textContent='正確跑道是 '+word.word+'（'+word.zh.join('、')+'）';
      }
      if(this.hearts<=0){this.context.finish(Math.floor(this.distance/10));return;}this.round++;this.question();
    }
    const status='♥'.repeat(this.hearts)+' · '+Math.floor(this.distance)+' 公尺 · 速度 '+this.speed.toFixed(1);
    if(status!==this.statusText){this.statusText=status;this.status.textContent=status;}
    this.lines.style.backgroundPositionY=this.reducedMotion.matches?'0px':((this.distance*24)%48)+'px';
    this.frame(time=>this.tick(time));
  }
}
