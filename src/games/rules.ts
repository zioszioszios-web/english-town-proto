import { normalizeWord } from '../data/words/types';
import type { WordEntry, WordTopic } from '../data/words/types';
import type { WordStats } from './types';
export const SPELL_HINT_MODE: SpellHintMode = 'first_last';
export type SpellHintMode = 'first_last' | 'first_only' | 'length_only';
export function spellingHint(word: string, mode: SpellHintMode = SPELL_HINT_MODE): string {
  const letters = [...word];
  const first = letters.findIndex(letter => /[a-z]/i.test(letter));
  let last = -1; letters.forEach((letter, i) => { if (/[a-z]/i.test(letter)) last = i; });
  return letters.map((letter, i) => !/[a-z]/i.test(letter) ? letter === ' ' ? '/' : letter :
    (mode !== 'length_only' && i === first) || (mode === 'first_last' && i === last) ? letter : '_').join(' ');
}
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function topicPool(words: readonly WordEntry[], topics: readonly WordTopic[]): WordEntry[] {
  const selected = topics.length ? words.filter(word => topics.some(topic => word.topics.includes(topic))) : [...words];
  if (selected.length >= 20 || !topics.length) return selected;
  const ids = new Set(selected.map(word => word.id));
  return [...selected, ...words.filter(word => word.topics.includes('daily_life') && !ids.has(word.id))];
}
export function selectQuestions(pool: readonly WordEntry[], count: number, stats: Readonly<Record<string, WordStats>>, random: () => number = Math.random): WordEntry[] {
  const wrong = shuffle(pool.filter(word => (stats[word.id]?.wrong ?? 0) > 0), random).slice(0, Math.round(count * .3));
  const ids = new Set(wrong.map(word => word.id));
  const questions = [...wrong, ...shuffle(pool.filter(word => !ids.has(word.id)), random).slice(0, Math.max(0, count - wrong.length))];
  return shuffle(questions, random);
}
export function correctPoints(streak: number, timeBonus = 0): number {
  return 10 + Math.min(10, Math.max(0, streak - 1) * 2) + Math.max(0, Math.floor(timeBonus));
}
export class ScoreCounter {
  score = 0; correct = 0; wrong = 0; streak = 0; maxStreak = 0;
  answer(correct: boolean, timeBonus = 0): void {
    if (correct) { this.streak++; this.correct++; this.maxStreak = Math.max(this.streak, this.maxStreak); this.score += correctPoints(this.streak, timeBonus); }
    else { this.wrong++; this.streak = 0; }
  }
}


export const MIN_PRACTICE_WORDS = 40;
export interface PracticePool { words: WordEntry[]; ownCount: number; supplementalCount: number }
/** Lower banks are ordered nearest level first; whole banks keep random sampling unbiased. */
export function practicePool(current: readonly WordEntry[], topics: readonly WordTopic[],
  lowerBanks: readonly (readonly WordEntry[])[] = [], eligible: (word: WordEntry) => boolean = () => true): PracticePool {
  const words = topicPool(current, topics).filter(eligible);
  const ownCount = words.length, seen = new Set(words.map(word => normalizeWord(word.word)));
  for (const bank of lowerBanks) {
    if (words.length >= MIN_PRACTICE_WORDS) break;
    for (const word of bank) {
      if (topics.length && !topics.some(topic => word.topics.includes(topic))) continue;
      const key = normalizeWord(word.word);
      if (seen.has(key) || !eligible(word)) continue;
      seen.add(key); words.push(word);
    }
  }
  return {words, ownCount, supplementalCount: words.length - ownCount};
}
