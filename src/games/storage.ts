import type { WordStats } from './types';
import type { ProgressStorage } from '../ui/ProgressStore';
export const DEFAULT_NICKNAME = '玩家';
export const GAME_SAVE_KEY = 'little-town:word-practice';
export class PracticeStore {
  private data: { version: 1; nickname: string; sound: boolean; volume: number; words: Record<string, WordStats> } = { version: 1, nickname: '', sound: true, volume: .8, words: {} };
  persistent = true;
  constructor(private readonly storage: () => ProgressStorage = () => window.localStorage) {
    try {
      const raw: unknown = JSON.parse(this.storage().getItem(GAME_SAVE_KEY) ?? 'null');
      if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 1) {
        const value = raw as Record<string, unknown>;
        if (typeof value.nickname === 'string') this.data.nickname = value.nickname.trim().slice(0, 20);
        if (typeof value.sound === 'boolean') this.data.sound = value.sound;
        if (typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1) this.data.volume = value.volume;
        if (value.words && typeof value.words === 'object') for (const [id, entry] of Object.entries(value.words)) {
          if (!entry || typeof entry !== 'object') continue;
          const item = entry as Record<string, unknown>;
          if (typeof item.correct === 'number' && Number.isSafeInteger(item.correct) && item.correct >= 0 && typeof item.wrong === 'number' && Number.isSafeInteger(item.wrong) && item.wrong >= 0 && typeof item.lastPracticed === 'string') {
            this.data.words[id] = { correct: item.correct, wrong: item.wrong, lastPracticed: item.lastPracticed };
          }
        }
      }
    } catch { this.persistent = false; }
  }
  private save(): void { try { this.storage().setItem(GAME_SAVE_KEY, JSON.stringify(this.data)); this.persistent = true; } catch { this.persistent = false; } }
  get displayName(): string { return this.data.nickname || DEFAULT_NICKNAME; }
  get nickname(): string { return this.data.nickname; }
  set nickname(value: string) { this.data.nickname = value.trim().slice(0, 20); this.save(); }
  get sound(): boolean { return this.data.sound; }
  set sound(value: boolean) { this.data.sound = value; this.save(); }
  get volume(): number { return this.data.volume; }
  set volume(value: number) { this.data.volume = Number.isNaN(value) ? .8 : Math.max(0, Math.min(1, value)); this.save(); }
  get stats(): Readonly<Record<string, WordStats>> { return structuredClone(this.data.words); }
  record(id: string, correct: boolean, now = new Date()): void {
    const previous = this.data.words[id] ?? { correct: 0, wrong: 0, lastPracticed: '' };
    this.data.words[id] = { correct: previous.correct + Number(correct), wrong: previous.wrong + Number(!correct), lastPracticed: now.toISOString() }; this.save();
  }
  reset(): void { this.data = { version: 1, nickname: '', sound: true, volume: .8, words: {} }; this.save(); }
}
