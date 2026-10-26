import { practicePool, MIN_PRACTICE_WORDS } from '../src/games/rules';
import { GAME_FACTORIES } from '../src/games/registry';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateWords } from '../src/data/words/validate';
import { WORD_TOPICS, PLACE_TOPICS, normalizeWord, type WordEntry } from '../src/data/words/types';
const batchOnly = process.argv.includes('--batch');
const all: WordEntry[] = [];
const banks: WordEntry[][] = [];
const failures: string[] = [];
const sourceFiles: Record<number,string> = {1:'moe-lv1-raw.json',2:'ceec-lv2-raw.json',3:'nawl-lv3-raw.json',4:'tsl-lv4-raw.json'};
const seen = new Map<string, number>();
for (const level of [1, 2, 3, 4]) {
  let text: string;
  try { text = await readFile(resolve(`src/data/words/lv${level}.json`), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' && level > 1) { console.log(`Lv${level}: 單字準備中`); continue; } throw error; }
  const source = JSON.parse(await readFile(resolve('data/sources/'+sourceFiles[level]),'utf8')) as {source:string;uniqueWordCount:number;words:{word:string}[]};
  const expected = new Set(source.words.map(entry=>normalizeWord(entry.word)));
  const words: unknown = JSON.parse(text); validateWords(words);
  for (const word of words) {
    if (word.level !== level) failures.push(`${word.id}: level 與檔名不符`);
    if (word.source !== source.source) failures.push(`${word.id}: 來源名稱與原始字表不符`);
    const key = normalizeWord(word.word);
    if (seen.has(key)) failures.push(`${key}: Lv${seen.get(key)} 與 Lv${level} 重複`);
    seen.set(key, level);
    if (!expected.has(key)) failures.push(`${key}: 不在官方原始字表`);
  }
  if (!batchOnly && words.length !== source.uniqueWordCount) failures.push(`Lv${level}: ${words.length}/${source.uniqueWordCount}，尚未完成原始字表`);
  const counts = Object.fromEntries(WORD_TOPICS.map(topic => [topic, words.filter(word => word.topics.includes(topic)).length]));
  console.log(`Lv${level}: ${words.length} 字；review=${words.filter(word => word.review).length}`);
  console.log(JSON.stringify(counts));
  if (!batchOnly) {
    const lower = [...banks].reverse();
    const coverage = Object.fromEntries(PLACE_TOPICS.map(topic => [topic,practicePool(words,[topic],lower).words.length]));
    console.log('補字後主題題庫：'+JSON.stringify(coverage));
    for (const topic of PLACE_TOPICS) if (coverage[topic] < MIN_PRACTICE_WORDS) failures.push('Lv'+level+'.'+topic+': '+coverage[topic]+'/'+MIN_PRACTICE_WORDS);
    const games = GAME_FACTORIES.map(factory => {const game=factory();return {id:game.id,...practicePool(words,game.topics,lower,word=>game.eligible?.(word)??true)};});
    console.log('遊戲題庫：'+JSON.stringify(games.map(game=>({id:game.id,own:game.ownCount,supplement:game.supplementalCount,total:game.words.length}))));
    for (const game of games) if (game.words.length < MIN_PRACTICE_WORDS) failures.push('Lv'+level+'.'+game.id+': '+game.words.length+'/'+MIN_PRACTICE_WORDS);
  }
  banks.push(words);
  all.push(...words);
}
await mkdir(resolve('data'), { recursive: true });
const review = all.filter(word => word.review);
await writeFile(resolve('data/review-list.md'), '# 單字待複核清單\n\n僅列出已產生的資料；未產生的字不代表已通過複核。\n\n| 等級 | 單字 | 中文 | 例句 |\n| --- | --- | --- | --- |\n' + review.map(word => `| Lv${word.level} | ${word.word} | ${word.zh.join('；')} | ${word.example} |`).join('\n') + '\n', 'utf8');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(batchOnly ? '批次檢查通過；這不代表完整單字庫已完成。' : '完整單字庫檢查通過。');
