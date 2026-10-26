import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateWords } from '../src/data/words/validate';
import { WORD_TOPICS, PLACE_TOPICS, normalizeWord, type WordEntry } from '../src/data/words/types';
const batchOnly = process.argv.includes('--batch');
const all: WordEntry[] = [];
const failures: string[] = [];
const source = JSON.parse(await readFile(resolve('data/sources/moe-lv1-raw.json'), 'utf8')) as { uniqueWordCount: number; words: { word: string }[] };
const expected = new Set(source.words.map(entry => normalizeWord(entry.word)));
const seen = new Map<string, number>();
for (const level of [1, 2, 3, 4]) {
  let text: string;
  try { text = await readFile(resolve(`src/data/words/lv${level}.json`), 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' && level > 1) { console.log(`Lv${level}: 單字準備中`); continue; } throw error; }
  const words: unknown = JSON.parse(text); validateWords(words);
  for (const word of words) {
    if (word.level !== level) failures.push(`${word.id}: level 與檔名不符`);
    const key = normalizeWord(word.word);
    if (seen.has(key)) failures.push(`${key}: Lv${seen.get(key)} 與 Lv${level} 重複`);
    seen.set(key, level);
    if (level === 1 && !expected.has(key)) failures.push(`${key}: 不在官方原始字表`);
  }
  if (level === 1 && !batchOnly && words.length !== source.uniqueWordCount) failures.push(`Lv1: ${words.length}/${source.uniqueWordCount}，尚未完成原始字表`);
  const counts = Object.fromEntries(WORD_TOPICS.map(topic => [topic, words.filter(word => word.topics.includes(topic)).length]));
  console.log(`Lv${level}: ${words.length} 字；review=${words.filter(word => word.review).length}`);
  console.log(JSON.stringify(counts));
  if (!batchOnly) for (const topic of PLACE_TOPICS) if (counts[topic] < 40) failures.push(`Lv${level}.${topic}: ${counts[topic]}/40`);
  all.push(...words);
}
await mkdir(resolve('data'), { recursive: true });
const review = all.filter(word => word.review);
await writeFile(resolve('data/review-list.md'), '# 單字待複核清單\n\n僅列出已產生的資料；未產生的字不代表已通過複核。\n\n| 等級 | 單字 | 中文 | 例句 |\n| --- | --- | --- | --- |\n' + review.map(word => `| Lv${word.level} | ${word.word} | ${word.zh.join('；')} | ${word.example} |`).join('\n') + '\n', 'utf8');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(batchOnly ? '批次檢查通過；這不代表完整單字庫已完成。' : '完整單字庫檢查通過。');
