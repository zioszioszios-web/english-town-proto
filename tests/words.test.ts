import { test } from 'node:test';
import assert from 'node:assert/strict';
import words from '../src/data/words/lv1.json';
import raw from '../data/sources/moe-lv1-raw.json';
import { validateWords } from '../src/data/words/validate';
import { PLACE_TOPICS, normalizeWord } from '../src/data/words/types';
test('authored entries validate and all come from the downloaded MOE source', () => {
  assert.doesNotThrow(() => validateWords(words));
  const official = new Set(raw.words.map(entry => normalizeWord(entry.word)));
  assert.equal(words.length, raw.uniqueWordCount);
  assert.equal(official.size, words.length);
  for (const topic of PLACE_TOPICS) assert.ok(words.filter(word => word.topics.includes(topic)).length >= 40, topic);
  assert.ok(words.every(word => official.has(normalizeWord(word.word))));
});
test('word validation catches duplicate headwords, missing fields and unknown topics', () => {
  assert.throws(() => validateWords([words[0], { ...words[0], id: 'different-id' }]), /Duplicate/);
  assert.throws(() => validateWords([{ ...words[0], exampleZh: '' }]), /Missing/);
  assert.throws(() => validateWords([{ ...words[0], topics: ['not-a-topic'] }]), /topics/);
  assert.throws(() => validateWords([{ ...words[0], zh: ['一','二','三','四'] }]), /Chinese/);
});

test('downloaded MOE source and extracted wordlist stay pinned to the recorded original', async () => {
  const { createHash } = await import('node:crypto');
  const { readFile } = await import('node:fs/promises');
  const pdf = await readFile('data/sources/moe-english-curriculum-2018.pdf');
  assert.equal(createHash('sha256').update(pdf).digest('hex'), raw.sha256);
  assert.equal(raw.rawEntryCount, 2005);
  assert.equal(raw.uniqueWordCount, 2003);
  assert.deepEqual(Object.keys(raw.duplicates).sort(), ['may', 'miss']);
});

test('word identity treats a hyphenated spelling and its joined spelling as the same word', () => {
  assert.equal(normalizeWord('E-mail'),normalizeWord('email'));
  assert.throws(()=>validateWords([{...words[0],word:'e-mail'},{...words[1],word:'email'}]),/Duplicate/);
});


test('Lv2 matches CEEC source counts, has every place topic and does not overlap Lv1', async () => {
  const {default: entries}=await import('../src/data/words/lv2.json');
  const {default: source}=await import('../data/sources/ceec-lv2-raw.json');
  const {createHash}=await import('node:crypto');
  const {readFile}=await import('node:fs/promises');
  validateWords(entries);
  assert.equal(entries.length,4203);
  assert.equal(entries.length,source.uniqueWordCount);
  assert.equal(source.sourceWordCount-source.excludedCount,entries.length);
  assert.equal(createHash('sha256').update(await readFile('data/sources/ceec-111-vocabulary.pdf')).digest('hex'),source.sha256);
  const lower=new Set(words.map(w=>normalizeWord(w.word)));
  const official=new Set(source.words.map(w=>normalizeWord(w.word)));
  for(const w of entries) {assert.ok(official.has(normalizeWord(w.word)));assert.ok(!lower.has(normalizeWord(w.word)),w.word);}
  for(const topic of PLACE_TOPICS) assert.ok(entries.filter(w=>w.topics.includes(topic)).length>=40,topic);
  assert.ok(entries.some(w=>w.word==='chairperson'));
  assert.ok(!entries.some(w=>w.word==='email'));
  const {loadWords,wordBankInfo}=await import('../src/data/words/catalog');
  assert.equal((await loadWords(2))?.length,4203);
  assert.equal(wordBankInfo(2).reviewCount,entries.filter(w=>w.review).length);
});


test('Lv3 matches pinned NAWL minus lower levels and loads independently', async () => {
  const {default: entries}=await import('../src/data/words/lv3.json');
  const {default: source}=await import('../data/sources/nawl-lv3-raw.json');
  const {default: lv2}=await import('../src/data/words/lv2.json');
  const {createHash}=await import('node:crypto');
  const {readFile}=await import('node:fs/promises');
  const {wordsReady,loadWords}=await import('../src/data/words/catalog');
  validateWords(entries);
  assert.equal(source.sourceWordCount,957);
  assert.equal(source.excludedCount,583);
  assert.equal(source.uniqueWordCount,374);
  assert.equal(entries.length,374);
  assert.equal(createHash('sha256').update(await readFile('data/sources/nawl-1.2-alphabetized.txt')).digest('hex'),source.sha256);
  const lower=new Set([...words,...lv2].map(w=>normalizeWord(w.word)));
  const official=new Set(source.words.map(w=>normalizeWord(w.word)));
  for(const w of entries){assert.ok(official.has(normalizeWord(w.word)));assert.ok(!lower.has(normalizeWord(w.word)),w.word);}
  assert.equal(wordsReady(3),true);
  assert.equal((await loadWords(3))?.length,374);
});


test('Lv4 matches numbered TSL source, excludes lower words and keeps canonical input accessible', async () => {
  const {default: entries}=await import('../src/data/words/lv4.json');
  const {default: source}=await import('../data/sources/tsl-lv4-raw.json');
  const {createHash}=await import('node:crypto');
  const {readFile}=await import('node:fs/promises');
  const {loadWords,wordBankInfo}=await import('../src/data/words/catalog');
  validateWords(entries);
  assert.equal(source.sourceWordCount,1250);
  assert.equal(source.excludedCount,887);
  assert.equal(source.uniqueWordCount,363);
  assert.equal(entries.length,363);
  assert.equal(createHash('sha256').update(await readFile('data/sources/tsl-1.2-alphabetized.txt')).digest('hex'),source.sha256);
  const lower=new Set<string>();
  for(const level of [1,2,3] as const)for(const w of await loadWords(level)??[])lower.add(normalizeWord(w.word));
  const official=new Set(source.words.map(w=>w.word));
  for(const w of entries){assert.ok(official.has(w.word));assert.ok(!lower.has(normalizeWord(w.word)),w.word);assert.match(w.word,/^[a-z-]+$/);}
  assert.ok(source.words.some(w=>w.word==='entree'&&w.original==='entr'+String.fromCharCode(233)+'e'));
  assert.ok(!entries.some(w=>['cafe','resume','advisor','donut','sock'].includes(w.word)));
  assert.equal((await loadWords(4))?.length,363);
  assert.equal(wordBankInfo(4).reviewCount,22);
});
