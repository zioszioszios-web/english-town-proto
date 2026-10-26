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
