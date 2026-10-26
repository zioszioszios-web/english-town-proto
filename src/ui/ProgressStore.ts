import { isLevel, unlockedLevels, type Level, type PlayMode, type ScenarioLevel } from '../data/levels';
export interface Completion { completed: boolean; count: number }
export interface ProgressStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SAVE_KEY = 'little-town:save';
export const SAVE_VERSION = 1;
export interface SaveData { version: number; mode: PlayMode | null; currentLevel: Level; unlockedLevels: Level[]; scenarios: Record<string, Completion> }
export class ProgressStore {
  private data: SaveData = this.empty();
  private persistent = true;
  constructor(private readonly scenarios: readonly ScenarioLevel[], private readonly storage: () => ProgressStorage = () => window.localStorage) {
    try {
      const raw: unknown = JSON.parse(this.storage().getItem(SAVE_KEY) ?? 'null');
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const value = raw as Record<string, unknown>;
        if (value.version === SAVE_VERSION) {
          this.data.mode = value.mode === 'direct' || value.mode === 'progression' ? value.mode : null;
          const records = value.scenarios;
          if (records && typeof records === 'object' && !Array.isArray(records)) for (const [id, rawEntry] of Object.entries(records)) {
            if (!this.scenarios.some(s => s.id === id) || !rawEntry || typeof rawEntry !== 'object') continue;
            const entry = rawEntry as Record<string, unknown>;
            if (entry.completed === true && typeof entry.count === 'number' && Number.isSafeInteger(entry.count) && entry.count > 0) this.data.scenarios[id] = { completed: true, count: entry.count };
          }
          this.recalculate();
          if (isLevel(value.currentLevel) && this.data.unlockedLevels.includes(value.currentLevel)) this.data.currentLevel = value.currentLevel;
        }
      }
    } catch { this.persistent = false; }
  }
  private empty(): SaveData { return { version: SAVE_VERSION, mode: null, currentLevel: 1, unlockedLevels: [1], scenarios: {} }; }
  private recalculate(): void {
    const completed = new Set(Object.keys(this.data.scenarios).filter(id => this.data.scenarios[id].completed));
    this.data.unlockedLevels = unlockedLevels(this.data.mode, completed, this.scenarios);
  }
  private persist(): void {
    try { this.storage().setItem(SAVE_KEY, JSON.stringify(this.data)); this.persistent = true; }
    catch { this.persistent = false; }
  }
  chooseMode(mode: PlayMode): void { this.data.mode = mode; this.recalculate(); this.data.currentLevel = mode === 'direct' ? 4 : 1; this.persist(); }
  switchLevel(level: Level): boolean {
    if (!this.data.unlockedLevels.includes(level)) return false;
    this.data.currentLevel = level; this.persist(); return true;
  }
  get(id: string): Completion { return { ...(this.data.scenarios[id] ?? { completed: false, count: 0 }) }; }
  complete(id: string): Level[] {
    if (!this.scenarios.some(s => s.id === id)) throw new Error(`Unknown scenario: ${id}`);
    const previous = [...this.data.unlockedLevels];
    this.data.scenarios[id] = { completed: true, count: Math.min(Number.MAX_SAFE_INTEGER, this.get(id).count + 1) };
    this.recalculate(); this.persist();
    return this.data.unlockedLevels.filter(level => !previous.includes(level));
  }
  reset(): void { this.data = this.empty(); this.persist(); }
  completedCount(ids: readonly string[]): number { return ids.filter(id => this.get(id).completed).length; }
  get mode(): PlayMode | null { return this.data.mode; }
  get currentLevel(): Level { return this.data.currentLevel; }
  get unlocked(): readonly Level[] { return [...this.data.unlockedLevels]; }
  get isPersistent(): boolean { return this.persistent; }
}
