import { BaseGame } from './BaseGame';
import type { MiniGameContext } from './types';
import type { WordEntry } from '../data/words/types';
import { shuffle } from './rules';
import { screenKeyboard, physicalKey } from './keyboard';
import { action, element } from '../ui/dom';
export function clozeExample(word: Pick<WordEntry,'word'|'example'>): {before:string;after:string} {
  const key=word.word.toLowerCase(),example=word.example.toLowerCase();
  let index=example.indexOf(key);
  while(index>=0){
    const before=example[index-1]??'',after=example[index+key.length]??'';
    if(!/[a-z]/.test(before)&&!/[a-z]/.test(after))return{before:word.example.slice(0,index),after:word.example.slice(index+key.length)};
    index=example.indexOf(key,index+1);
  }throw new Error('Example does not contain '+word.word);
}
export class OfficeEmail extends BaseGame {
  readonly id='office-email';readonly name='郵件填空';readonly location='Office';readonly topics=['work_business'] as const;
  private mail=0;private offset=0;private started=0;private values:string[]=[];private active=0;private submitted=false;
  private outputs:HTMLButtonElement[]=[];private batch:WordEntry[]=[];private feedback!:HTMLElement;
  start(context:MiniGameContext):void {
    this.begin(context);this.mail=0;this.offset=0;this.started=performance.now();
    this.listen(window,'keydown',event=>{
      if(context.level<3||this.submitted||(event.target instanceof Element&&event.target.closest('.game-toolbar, .email-submit')))return;
      const key=physicalKey(event);if(key)this.key(key);
    });this.question();
  }
  private question():void {
    if(this.mail>=3){this.context.finish(Math.max(0,180-(performance.now()-this.started)/1000));return;}
    const count=3+this.mail%2;this.batch=this.context.words.slice(this.offset,this.offset+count);this.offset+=count;
    this.values=this.batch.map(()=>'');this.outputs=[];this.active=0;this.submitted=false;
    const email=element('article','email-paper');email.append(element('p','email-subject','Subject: A quick update'),element('p','','Hi team,'));
    this.feedback=element('p','game-feedback','填完所有空格後，按「送出郵件」一起檢查。');const rows:HTMLElement[]=[];
    this.batch.forEach((word,index)=>{
      const row=element('section','email-row'),sentence=element('p'),parts=clozeExample(word);
      sentence.append(document.createTextNode(parts.before));
      const gap=action('空格 '+(index+1)+'：____',()=>{this.active=index;this.refresh();},'email-gap');
      sentence.append(gap,document.createTextNode(parts.after));this.outputs.push(gap);row.append(sentence,element('p','muted',word.zh.join('、')+' · '+word.pos));
      if(this.context.level<=2){
        const choices=element('div','email-options');
        for(const choice of shuffle([word,...shuffle(this.context.words.filter(w=>w.id!==word.id)).slice(0,3)])){
          const button=action(choice.word,()=>{
            if(this.submitted)return;this.values[index]=choice.word;this.active=index;this.context.speak(choice.word);
            choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));this.refresh();
          },'ui-button');button.setAttribute('aria-pressed','false');choices.append(button);
        }row.append(choices);
      }rows.push(row);email.append(row);
    });
    email.append(element('p','','Thanks,'),element('p','','Your teammate'));
    const submit=action('送出郵件',()=>{
      if(this.submitted)return;
      if(this.values.some(value=>!value.trim())){this.feedback.textContent='還有空格沒填，請先完成所有空格。';return;}
      this.submitted=true;submit.disabled=true;
      this.batch.forEach((word,index)=>{
        const correct=this.values[index].trim().toLowerCase()===word.word.toLowerCase();this.context.answer(word,correct);
        rows[index].classList.add(correct?'answer-correct':'answer-wrong');
        if(!correct)rows[index].append(element('p','answer-correction','正確答案：'+word.word+' · '+word.zh.join('、')));
        rows[index].querySelectorAll('button').forEach(b=>{b.disabled=true;});
      });
      this.context.speak(this.batch.map(word=>word.word).join(', '));this.feedback.textContent='郵件已檢查，看看標示的正確答案。';
      const next=action(this.mail===2?'查看結算':'下一封郵件 →',()=>{this.mail++;this.question();});this.feedback.after(next);next.focus({preventScroll:true});
    },'ui-button primary email-submit');
    this.context.host.replaceChildren(element('p','game-progress','第 '+(this.mail+1)+'／3 封郵件 · '+count+' 個空格'),email,this.feedback);
    if(this.context.level>=3)this.context.host.append(screenKeyboard(key=>this.key(key)));
    this.context.host.append(submit);this.refresh();
  }
  private refresh():void{this.outputs.forEach((gap,index)=>{gap.textContent='空格 '+(index+1)+'：'+(this.values[index]||'____');gap.classList.toggle('active',index===this.active);});}
  private key(key:string):void{
    if(this.stopped||this.submitted)return;
    if(key==='Enter'){this.active=(this.active+1)%this.values.length;this.refresh();return;}
    const previous=this.values[this.active];this.values[this.active]=key==='Backspace'?previous.slice(0,-1):previous.length<this.batch[this.active].word.length+3?previous+key.toLowerCase():previous;this.refresh();
  }
}
