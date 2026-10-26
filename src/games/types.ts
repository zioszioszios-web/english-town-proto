import type { Level } from '../data/levels';
import type { LocationName } from '../data/town';
import type { WordEntry, WordTopic } from '../data/words/types';
export type GameLocation = LocationName | 'Park' | 'Street';
export interface MiniGameContext {
  host: HTMLElement; words: readonly WordEntry[]; level: Level;
  speak(text: string): void;
  answer(word: WordEntry, correct: boolean, timeBonus?: number): void;
  finish(bonus?: number): void;
}
export interface MiniGame {
  readonly id: string; readonly name: string; readonly location: GameLocation;
  readonly topics: readonly WordTopic[];
  start(context: MiniGameContext): void;
  end(): void;
}
export interface WordStats { correct: number; wrong: number; lastPracticed: string }
export interface GameResult {
  score: number; correct: number; wrong: number; maxStreak: number;
  mistakes: readonly WordEntry[]; elapsedSeconds: number;
}
