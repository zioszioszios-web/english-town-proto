import type { WordEntry } from '../data/words/types';
import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import { shuffle } from './rules';
import { action, element } from '../ui/dom';
export class PharmacySort extends BaseGame {
  readonly id='pharmacy-sort';readonly name='整理藥櫃';readonly location='Pharmacy';readonly topics=['health_body'] as const;
  private remaining: WordEntry[]=[];
  private round=0; private deadline=0; private clock!:HTMLElement;
  start(context:MiniGameContext):void{
    this.begin(context);this.remaining=[...context.words];this.round=0;this.deadline=performance.now()+120000;this.question();
    const tick=():void=>{if(this.stopped)return;this.clock.textContent=`剩餘 ${Math.max(0,Math.ceil((this.deadline-performance.now())/1000))} 秒`;if(performance.now()>=this.deadline)this.context.finish();else this.timer(tick,100);};tick();
  }
  private question():void{
    if(this.round>=5){this.context.finish(Math.max(0,(this.deadline-performance.now())/1000));return;}
    const batch:WordEntry[]=[];
    const meanings=new Set<string>();
    for(const word of [...this.remaining,...this.context.words]){
      const label=word.zh.join('、');if(meanings.has(label))continue;
      meanings.add(label);batch.push(word);if(batch.length===3)break;
    }
    this.remaining=this.remaining.filter(word=>!batch.some(chosen=>chosen.id===word.id));
    if(batch.length<3){this.context.finish();return;}
    let selected:number|null=null, sorted=0, roundDone=false;
    const host=this.context.host, feedback=element('p','game-feedback','先點藥盒再點藥櫃，或把藥盒拖到藥櫃。');
    this.clock=element('p','game-timer');
    const boxes=element('div','medicine-boxes'),shelves=element('div','medicine-shelves');
    const buttons:HTMLButtonElement[]=[];
    const choose=(index:number):void=>{
      if(roundDone||buttons[index].disabled)return;selected=index;
      buttons.forEach((b,i)=>{b.classList.toggle('selected',i===index);b.setAttribute('aria-pressed',String(i===index));});
      this.context.speak(batch[index].word);
    };
    const sort=(target:number):void=>{
      if(selected===null||roundDone)return;
      const current=selected,word=batch[current],correct=current===target;
      this.context.answer(word,correct);
      if(correct){
        buttons[current].disabled=true;buttons[current].classList.remove('selected');buttons[current].textContent='✓ '+word.word;sorted++;selected=null;
        feedback.textContent=`放對了！本組 ${sorted}／3`;
        if(sorted===3){roundDone=true;
          if(this.round===4){this.round++;this.question();return;}
          const next=action('下一組 →',()=>{this.round++;this.question();});feedback.after(next);next.focus({preventScroll:true});
        }else{const next=buttons.find(b=>!b.disabled);if(next)next.focus({preventScroll:true});}
      }else{
        this.deadline-=5000;feedback.textContent='放錯藥櫃了，扣 5 秒，再試一次。';buttons[current].classList.remove('shake');void buttons[current].offsetWidth;buttons[current].classList.add('shake');
      }
    };
    batch.forEach((word,index)=>{
      let startX=0,startY=0,dragged=false,ignoreClick=false,pointer:number|null=null;
      const box=action(word.word,()=>{if(ignoreClick){ignoreClick=false;return;}choose(index);},'ui-button medicine-box');
      box.setAttribute('aria-pressed','false');
      box.addEventListener('pointerdown',event=>{
        if(box.disabled||(event.pointerType==='mouse'&&event.button!==0))return;
        pointer=event.pointerId;startX=event.clientX;startY=event.clientY;dragged=false;box.setPointerCapture(pointer);choose(index);
      });
      box.addEventListener('pointermove',event=>{
        if(pointer!==event.pointerId)return;
        const dx=event.clientX-startX,dy=event.clientY-startY;
        if(Math.hypot(dx,dy)>8)dragged=true;
        if(dragged){box.style.transform=`translate(${dx/box.offsetWidth*100}%,${dy/box.offsetHeight*100}%)`;box.classList.add('dragging');}
      });
      const reset=():void=>{box.style.transform='';box.classList.remove('dragging');pointer=null;};
      box.addEventListener('pointerup',event=>{
        if(pointer!==event.pointerId)return;
        if(dragged){ignoreClick=true;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-shelf]');if(target)sort(Number(target.dataset.shelf));}
        reset();if(box.hasPointerCapture(event.pointerId))box.releasePointerCapture(event.pointerId);
      });
      box.addEventListener('pointercancel',reset);box.addEventListener('lostpointercapture',reset);
      buttons.push(box);
    });
    for(const index of shuffle([0,1,2]))boxes.append(buttons[index]);
    batch.forEach((word,index)=>{const shelf=action(word.zh.join('、'),()=>{if(selected===null){feedback.textContent='請先選一個英文藥盒。';return;}sort(index);},'medicine-shelf');shelf.dataset.shelf=String(index);shelves.append(shelf);});
    host.replaceChildren(element('p','game-progress',`第 ${this.round+1}／5 組 · 每組 3 個單字`),this.clock,boxes,shelves,feedback);
    this.context.speak(batch[0].word);
  }
}
