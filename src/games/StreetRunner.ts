import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { runnerDirection, runnerReward, shuffle } from './rules';
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
    this.player=element('span','road-player','●');this.road.append(this.lines,this.player);
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
    this.move(0);const speech=this.question();this.last=performance.now();this.frame(now=>this.tick(now));if(speech)this.context.speak(speech);
  }
  private measure():void{this.travel=Math.max(0,this.player.offsetTop-this.gates.offsetHeight);}
  private move(delta:number):void{
    if(this.stopped)return;this.lane=Math.max(0,Math.min(2,this.lane+delta));this.player.style.insetInlineStart=((this.lane+.5)*100/3)+'%';this.player.setAttribute('aria-label','目前第 '+(this.lane+1)+' 條跑道');
  }
  private question():string|undefined{
    const words=this.context.words,target=words[this.round%words.length];this.direction=runnerDirection(this.context.level);
    const used=new Set([target.zh[0]]);
    const others=shuffle(words.filter(w=>w.id!==target.id&&w.zh[0]!==target.zh[0])).filter(w=>{
      if(this.direction==='zh-en')return true;if(used.has(w.zh[0]))return false;used.add(w.zh[0]);return true;
    }).slice(0,2);
    const choices=shuffle([target,...others]);
    this.correctLane=choices.findIndex(w=>w.id===target.id);this.prompt.textContent=this.direction==='zh-en'?target.zh.join('、'):target.word;this.prompt.lang=this.direction==='zh-en'?'zh-Hant':'en';
    this.hint.textContent=this.direction==='zh-en'?'看中文，跑進英文跑道':'看英文，跑進中文跑道';
    this.gates=element('div','road-gates');this.gates.append(...choices.map(word=>{const node=element('span','road-word',this.direction==='zh-en'?word.word:word.zh[0]);node.lang=this.direction==='zh-en'?'en':'zh-Hant';return node;}));
    this.road.insertBefore(this.gates,this.player);this.gates.style.transform='translate3d(0, 0px, 0)';this.measure();
    this.started=performance.now();this.duration=Math.max(1800,6500-this.round*140);return this.direction==='en-zh'?target.word:undefined;
  }
  private jump(name:string):void{
    this.player.classList.remove('jump-over','jump-over-huge','crash');void this.player.offsetWidth;this.player.classList.add(name);
  }
  private shatter(gate:HTMLElement):void{
    const rect=gate.getBoundingClientRect(),road=this.road.getBoundingClientRect(),background=getComputedStyle(gate).backgroundColor;
    for(let i=0;i<4;i++){
      const shard=element('span','shard');shard.setAttribute('aria-hidden','true');
      shard.style.left=(rect.left-road.left-this.road.clientLeft+(i%2)*rect.width/2)+'px';shard.style.top=(rect.top-road.top-this.road.clientTop+Math.floor(i/2)*rect.height/2)+'px';
      shard.style.width=rect.width/2+'px';shard.style.height=rect.height/2+'px';shard.style.backgroundColor=background;
      shard.style.setProperty('--shard-x',i%2?'2rem':'-2rem');shard.style.setProperty('--shard-y',i<2?'-2.5rem':'1.5rem');shard.style.setProperty('--shard-turn',i%2?'50deg':'-50deg');
      this.road.append(shard);this.timer(()=>shard.remove(),600);
    }
    gate.style.visibility='hidden';
  }
  private pass(gates:HTMLElement):void{
    void gates.offsetWidth;gates.classList.add('passing');gates.style.transform='translate3d(0, '+(this.road.clientHeight+20)+'px, 0)';
    gates.addEventListener('transitionend',()=>gates.remove(),{once:true});this.timer(()=>gates.remove(),600);
  }
  private pop(text:string,correct:boolean):void{
    const node=element('span','road-pop '+(correct?'correct':'wrong'),text);node.style.insetInlineStart=((this.lane+.5)*100/3)+'%';this.road.append(node);this.timer(()=>node.remove(),900);
  }
  private tick(now:number):void{
    if(this.stopped)return;
    const elapsed=Math.min((now-this.last)/1000,.05);this.last=now;this.speed=Math.min(20,this.speed+elapsed*.025);this.distance+=this.speed*elapsed;
    const progress=Math.min(1,(now-this.started)/this.duration);this.gates.style.transform='translate3d(0, '+(progress*this.travel)+'px, 0)';
    const speech:string[]=[];
    if(progress>=1){
      const word=this.context.words[this.round%this.context.words.length],correct=this.lane===this.correctLane;this.context.answer(word,correct);
      if(this.direction==='zh-en')speech.push(word.word);
      const gates=this.gates,gate=gates.children[this.lane] as HTMLElement;
      if(correct){
        this.streak++;const bonus=runnerReward(this.streak);this.distance+=bonus;this.speed=Math.min(20,this.speed+.8);
        this.player.style.setProperty('--jump',(gate.offsetHeight+16)+'px');gate.classList.add('cleared');
        this.jump(this.streak>=3?'jump-over-huge':'jump-over');this.pop('+'+bonus+' 公尺',true);this.feedback.textContent='跳過去了！'+word.word+' · +'+bonus+' 公尺';
      }else{
        this.streak=0;this.speed=Math.max(4,this.speed-1.5);this.hearts--;this.shatter(gate);gates.children[this.correctLane].classList.add('reveal');this.jump('crash');this.pop('撞破了！',false);
        this.road.classList.remove('shake');void this.road.offsetWidth;this.road.classList.add('shake');this.feedback.textContent='正確跑道是 '+word.word+'（'+word.zh.join('、')+'）';
      }
      this.pass(gates);
      this.context.sfx(correct?'correct':'wrong');
      if(this.hearts<=0){for(const text of speech)this.context.speak(text);this.context.finish(Math.floor(this.distance/10));return;}this.round++;const nextSpeech=this.question();if(nextSpeech)speech.push(nextSpeech);
    }
    const status='♥'.repeat(this.hearts)+' · '+Math.floor(this.distance)+' 公尺 · 速度 '+this.speed.toFixed(1);
    if(status!==this.statusText){this.statusText=status;this.status.textContent=status;}
    this.lines.style.transform=this.reducedMotion.matches?'none':'translate3d(0, '+((this.distance*24)%48)+'px, 0)';
    this.frame(time=>this.tick(time));
    for(const text of speech)this.context.speak(text);
  }
}
