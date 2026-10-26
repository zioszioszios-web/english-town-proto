import type { Level } from '../data/levels';
import { isLevel } from '../data/levels';
import type { ProgressStorage } from '../ui/ProgressStore';
export interface ScoreEntry { id: string; gameId: string; level: Level; nickname: string; score: number; playedAt: string }
export interface ScoreRepository {
  list(gameId: string, level: Level): Promise<readonly ScoreEntry[]>;
  submit(entry: ScoreEntry): Promise<{ rank: number; entries: readonly ScoreEntry[] }>;
  clear(): Promise<void>;
}
const KEY = 'little-town:scores';
export class LocalScoreRepository implements ScoreRepository {
  private entries: ScoreEntry[] = [];
  persistent = true;
  constructor(private readonly storage: () => ProgressStorage = () => window.localStorage) {
    try {
      const raw: unknown = JSON.parse(this.storage().getItem(KEY) ?? 'null');
      if (raw && typeof raw === 'object' && 'version' in raw && raw.version === 1 && 'entries' in raw && Array.isArray(raw.entries)) {
        this.entries = raw.entries.filter((entry: unknown): entry is ScoreEntry => {
          if (!entry || typeof entry !== 'object') return false;
          const e = entry as Record<string, unknown>;
          return ['id', 'gameId', 'nickname', 'playedAt'].every(key => typeof e[key] === 'string') && isLevel(e.level) && typeof e.score === 'number' && Number.isFinite(e.score) && e.score >= 0;
        });
      }
    } catch { this.persistent = false; }
  }
  private sorted(gameId: string, level: Level): ScoreEntry[] { return this.entries.filter(e => e.gameId === gameId && e.level === level).sort((a,b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id)); }
  private save(): void { try { this.storage().setItem(KEY, JSON.stringify({ version: 1, entries: this.entries })); this.persistent = true; } catch { this.persistent = false; } }
  async list(gameId: string, level: Level): Promise<readonly ScoreEntry[]> { return this.sorted(gameId, level).slice(0,10).map(e => ({ ...e })); }
  async submit(entry: ScoreEntry): Promise<{ rank: number; entries: readonly ScoreEntry[] }> {
    this.entries = this.entries.filter(e => e.id !== entry.id); this.entries.push({ ...entry });
    const sorted = this.sorted(entry.gameId, entry.level), rank = sorted.findIndex(e => e.id === entry.id) + 1;
    this.entries = [...this.entries.filter(e => e.gameId !== entry.gameId || e.level !== entry.level), ...sorted.slice(0,10)]; this.save();
    return { rank, entries: await this.list(entry.gameId, entry.level) };
  }
  async clear(): Promise<void> { this.entries = []; this.save(); }
}
