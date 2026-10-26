import { isLevel } from '../levels';
import { WORD_TOPICS, normalizeWord, type WordEntry } from './types';
export function validateWords(value: unknown): asserts value is WordEntry[] {
  if (!Array.isArray(value)) throw new Error('Words must be an array');
  const ids = new Set<string>(), words = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Word must be an object');
    const entry = raw as Record<string, unknown>;
    for (const key of ['id', 'word', 'pos', 'example', 'exampleZh', 'source']) if (typeof entry[key] !== 'string' || !(entry[key] as string).trim()) throw new Error(`Missing ${key}`);
    if (!isLevel(entry.level)) throw new Error(`Invalid level: ${entry.id}`);
    if (typeof entry.review !== 'boolean') throw new Error(`Missing review flag: ${entry.id}`);
    if (!Array.isArray(entry.zh) || entry.zh.length < 1 || entry.zh.length > 3 || entry.zh.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Invalid Chinese meanings: ${entry.id}`);
    if (!Array.isArray(entry.topics) || !entry.topics.length || entry.topics.some(topic => !WORD_TOPICS.includes(topic))) throw new Error(`Invalid topics: ${entry.id}`);
    const id = entry.id as string, word = normalizeWord(entry.word as string);
    if (ids.has(id) || words.has(word)) throw new Error(`Duplicate word/id: ${word}`);
    ids.add(id); words.add(word);
  }
}
