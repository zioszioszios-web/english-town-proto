import { Sfx } from '../src/games/sfx';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topicPool, selectQuestions, ScoreCounter, correctPoints, spellingHint, runnerDirection, runnerReward } from '../src/games/rules';
import { LocalScoreRepository } from '../src/games/scores';
import { GAME_SAVE_KEY, PracticeStore } from '../src/games/storage';
import type { WordEntry, WordTopic } from '../src/data/words/types';
import { ACTIVITIES, LAKE, START, nearbyTownEntrance, TILE } from '../src/data/town';
import { canStand, findPath } from '../src/data/navigation';
const word = (id: number, topic: WordTopic): WordEntry => ({id: String(id), word:'word'+id,pos:'n.',zh:['字'+id],example:'example',exampleZh:'例句',level:1,topics:[topic],source:'test',review:false});
test('sound effects tolerate Node without AudioContext', () => {
  const sfx = new Sfx();
  assert.doesNotThrow(() => { sfx.unlock(); sfx.play('correct'); });
});
function memoryStorage() { const data = new Map<string,string>(); return {getItem:(key:string) => data.get(key)??null,setItem:(key:string,value:string) => {data.set(key,value);}}; }

test('practice volume defaults, clamps, persists and resets', () => {
  const storage = memoryStorage(), store = new PracticeStore(()=>storage);
  assert.equal(store.volume,.8);
  store.volume = 1.5; assert.equal(store.volume,1);
  store.volume = -1; assert.equal(store.volume,0);
  store.volume = .3; assert.equal(new PracticeStore(()=>storage).volume,.3);
  store.reset(); assert.equal(store.volume,.8); assert.equal(new PracticeStore(()=>storage).volume,.8);
});

test('practice volume falls back for old saves and corrupt values', () => {
  const storage = memoryStorage();
  for (const volume of [undefined, '0.5', NaN, Infinity, -1, 1.5]) {
    storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:1,volume}));
    assert.equal(new PracticeStore(()=>storage).volume,.8);
  }
  // JSON serializes NaN as null; a literal NaN is invalid saved JSON.
  storage.setItem(GAME_SAVE_KEY,'{"version":1,"volume":NaN}');
  assert.equal(new PracticeStore(()=>storage).volume,.8);
  for (const volume of [0,1]) {
    storage.setItem(GAME_SAVE_KEY,JSON.stringify({version:1,volume}));
    assert.equal(new PracticeStore(()=>storage).volume,volume);
  }
});
test('display name defaults to 玩家 and follows nickname and reset', () => {
  const storage = memoryStorage(), store = new PracticeStore(()=>storage);
  assert.equal(store.displayName,'玩家');
  store.nickname = '小鎮玩家'; assert.equal(store.displayName,'小鎮玩家');
  assert.equal(new PracticeStore(()=>storage).displayName,'小鎮玩家');
  store.nickname = ''; assert.equal(store.displayName,'玩家');
  store.nickname = 'Town'; store.reset(); assert.equal(store.nickname,''); assert.equal(store.displayName,'玩家');
});
test('runner directions stay Chinese to English at low levels and mix at high levels', () => {
  for (const level of [1,2] as const) for (const random of [.1,.9]) assert.equal(runnerDirection(level,()=>random),'zh-en');
  for (const level of [3,4] as const) {
    assert.equal(runnerDirection(level,()=>.1),'zh-en');
    assert.equal(runnerDirection(level,()=>.9),'en-zh');
  }
});
test('runner rewards grow with streaks and cap at forty meters', () => {
  for (const [streak, reward] of [[1,20],[3,30],[5,40],[10,40]]) assert.equal(runnerReward(streak),reward);
});
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


test('sparse practice pools supplement the nearest lower topic bank without changing word levels', async () => {
  const {practicePool}=await import('../src/games/rules');
  const own=[{...word(1,'food_drink'),word:'yeast',level:3 as const}];
  const near=Array.from({length:40},(_,i)=>({...word(i+2,'food_drink'),word:'food'+i,level:2 as const}));
  const far=[{...word(100,'food_drink'),word:'coffee'}];
  const result=practicePool(own,['food_drink'],[near,far]);
  assert.equal(result.ownCount,1);assert.equal(result.supplementalCount,40);
  assert.equal(result.words.length,41);assert.ok(result.words.some(w=>w.level===3));
  assert.ok(!result.words.some(w=>w.word==='coffee'));
  assert.equal(practicePool(near,['food_drink'],[far]).supplementalCount,0);
  const duplicate={...far[0],id:'another-id',word:'YEAST'};
  assert.equal(practicePool(own,['food_drink'],[[duplicate]]).words.length,1);
  const eligible=practicePool(own,['food_drink'],[[...far,word(101,'health_body')]],w=>w.word==='coffee');
  assert.deepEqual(eligible.words.map(w=>w.word),['coffee']);
});

test('every published game level has forty usable words after approved lower-level supplementation', async () => {
  const {loadWords}=await import('../src/data/words/catalog');
  const {GAME_FACTORIES}=await import('../src/games/registry');
  const {practicePool}=await import('../src/games/rules');
  const banks: (readonly WordEntry[])[]=[];
  for(const level of [1,2,3,4] as const) {
    const entries=await loadWords(level);assert.ok(entries);
    for(const factory of GAME_FACTORIES){const game=factory();const pool=practicePool(entries,game.topics,[...banks].reverse(),w=>game.eligible?.(w)??true);assert.ok(pool.words.length>=40,'Lv'+level+' '+game.id);}
    banks.push(entries);
  }
});
