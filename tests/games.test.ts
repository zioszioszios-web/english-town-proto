import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicPool, selectQuestions, ScoreCounter, correctPoints, spellingHint } from '../src/games/rules';
import { LocalScoreRepository } from '../src/games/scores';
import { PracticeStore } from '../src/games/storage';
import type { WordEntry, WordTopic } from '../src/data/words/types';
import { ACTIVITIES, LAKE, START, nearbyTownEntrance, TILE } from '../src/data/town';
import { canStand, findPath } from '../src/data/navigation';
const word = (id: number, topic: WordTopic): WordEntry => ({id: String(id), word:'word'+id,pos:'n.',zh:['字'+id],example:'example',exampleZh:'例句',level:1,topics:[topic],source:'test',review:false});
function memoryStorage() { const data = new Map<string,string>(); return {getItem:(key:string) => data.get(key)??null,setItem:(key:string,value:string) => {data.set(key,value);}}; }
test('question pools filter topics and supplement daily life only below twenty', () => {
  const words = [...Array.from({length:20},(_,i)=>word(i,'food_drink')),word(20,'daily_life'),word(21,'other')];
  assert.equal(topicPool(words,['food_drink']).length,20);
  assert.deepEqual(topicPool(words,['health_body']).map(w=>w.id),['20']);
  assert.equal(topicPool(words,[]).length,words.length);
  const short = [word(0,'food_drink'),word(1,'daily_life'),word(2,'other')];
  assert.deepEqual(topicPool(short,['food_drink']).map(w=>w.id),['0','1']);
});
test('thirty percent of questions prioritize previous wrong words with no duplicates', () => {
  const pool = Array.from({length:40},(_,i)=>word(i,'daily_life'));
  const stats = Object.fromEntries(pool.slice(0,3).map(w=>[w.id,{correct:0,wrong:1,lastPracticed:''}]));
  const selected = selectQuestions(pool,10,stats,()=>.5);
  assert.equal(selected.length,10); assert.equal(new Set(selected.map(w=>w.id)).size,10);
  for (const id of ['0','1','2']) assert.ok(selected.some(w=>w.id===id));
  assert.equal(selectQuestions(pool.slice(0,2),10,stats).length,2);
});
test('scoring rewards streaks to a ten-point bonus and resets on a mistake', () => {
  assert.equal(correctPoints(1),10); assert.equal(correctPoints(2),12); assert.equal(correctPoints(100,3.9),23);
  const score = new ScoreCounter(); score.answer(true);score.answer(true);score.answer(false);score.answer(true,2);
  assert.deepEqual([score.score,score.correct,score.wrong,score.maxStreak,score.streak],[34,3,1,2,1]);
});
test('spelling hints support all three modes, short words and phrase separators', () => {
  assert.equal(spellingHint('walk'),'w _ _ k'); assert.equal(spellingHint('walk','first_only'),'w _ _ _'); assert.equal(spellingHint('walk','length_only'),'_ _ _ _');
  assert.equal(spellingHint('a'),'a'); assert.equal(spellingHint('ice cream'),'i _ _ / _ _ _ _ m');
});
test('local scores retain sorted top ten, separate games and levels, and survive reload', async () => {
  const storage = memoryStorage(); const scores = new LocalScoreRepository(()=>storage);
  for (let i=0;i<15;i++) await scores.submit({id:String(i),gameId:'fishing',level:1,nickname:'Test',score:i,playedAt:'2026-10-26'});
  const board = await scores.list('fishing',1); assert.equal(board.length,10); assert.deepEqual(board.map(e=>e.score),[14,13,12,11,10,9,8,7,6,5]);
  const low = await scores.submit({id:'low',gameId:'fishing',level:1,nickname:'Test',score:0,playedAt:'2026-10-27'}); assert.equal(low.rank,11);
  await scores.submit({id:'level2',gameId:'fishing',level:2,nickname:'Test',score:999,playedAt:''});
  await scores.submit({id:'memory',gameId:'memory',level:1,nickname:'Test',score:500,playedAt:''});
  const reloaded = new LocalScoreRepository(()=>storage);
  assert.equal((await reloaded.list('fishing',1))[0].score,14); assert.equal((await reloaded.list('fishing',2)).length,1); assert.equal((await reloaded.list('memory',1)).length,1);
  await reloaded.clear(); assert.equal((await reloaded.list('fishing',1)).length,0);
});
test('word practice persists counters, timestamp and settings and tolerates blocked storage', () => {
  const storage = memoryStorage(), store = new PracticeStore(()=>storage);
  store.nickname = 'Town'; store.sound = false; store.record('one',true,new Date('2026-10-26'));store.record('one',false,new Date('2026-10-27'));
  const next = new PracticeStore(()=>storage); assert.equal(next.nickname,'Town'); assert.equal(next.sound,false); assert.deepEqual(next.stats.one,{correct:1,wrong:1,lastPracticed:'2026-10-27T00:00:00.000Z'});
  const blocked = new PracticeStore(()=>{throw Error('blocked');});blocked.record('word',false);assert.equal(blocked.stats.word.wrong,1);assert.equal(blocked.persistent,false);
  next.reset();assert.deepEqual(next.stats,{});
});
test('park and street entrances remain reachable and lake is solid', () => {
  assert.equal(canStand(LAKE.x+TILE,LAKE.y+TILE),false);
  for (const entry of ACTIVITIES) { assert.ok(findPath(START,entry.point).length>0); assert.equal(nearbyTownEntrance(entry.point,1)?.location,entry.location); assert.equal(nearbyTownEntrance({x:entry.point.x,y:entry.point.y+49},1),undefined); }
});

test('cafe orders use one word, one sentence, then two ordered items by level', async () => {
  const { cafeOrderText, CafeOrder } = await import('../src/games/CafeOrder');
  const coffee={...word(1,'food_drink'),word:'coffee'},cake={...word(2,'food_drink'),word:'cake'};
  assert.equal(cafeOrderText([coffee],1),'coffee');
  assert.match(cafeOrderText([coffee],2),/Can I get the coffee/);
  for(const level of [3,4] as const) assert.match(cafeOrderText([coffee,cake],level),/coffee and the cake/);
  assert.throws(()=>cafeOrderText([coffee],3),/enough items/);
  const game=new CafeOrder();
  assert.equal(game.eligible(coffee),true);
  for(const wordText of ['cafeteria','tradition','freezer','cash','patron','calcium','chef','offering','apprentice']) assert.equal(game.eligible({...coffee,word:wordText}),false);
  assert.equal(game.eligible({...coffee,pos:'adv.',word:'without'}),false);
});

test('email cloze removes exact whole headwords and keeps punctuation and sentence case', async () => {
  const {clozeExample}=await import('../src/games/OfficeEmail');
  assert.deepEqual(clozeExample({word:'report',example:'My report is ready.'}),{before:'My ',after:' is ready.'});
  assert.deepEqual(clozeExample({word:'I',example:'I work here.'}),{before:'',after:' work here.'});
  assert.deepEqual(clozeExample({word:'post office',example:'The post office is closed.'}),{before:'The ',after:' is closed.'});
  assert.deepEqual(clozeExample({word:'a',example:'A car is here.'}),{before:'',after:' car is here.'});
  assert.throws(()=>clozeExample({word:'port',example:'The report is ready.'}),/does not contain/);
});
