export type Level = 1 | 2 | 3 | 4;
export type PlayMode = 'progression' | 'direct';
export const UNLOCK_RATIO = 1.0;
export const LEVELS: readonly Level[] = [1, 2, 3, 4];
export const LEVEL_INFO: Record<Level, { title: string; description: string }> = {
  1: { title: '國中以下', description: '國中小基本 2000 字為主，短句練習' },
  2: { title: '高中', description: '高中英文參考詞彙，生活客製化表達' },
  3: { title: '大學', description: '全民英檢中高級與學術常用表達' },
  4: { title: '社會人士', description: '職場、多益常用詞與較長句型' },
};
export function isLevel(value: unknown): value is Level { return typeof value === 'number' && LEVELS.includes(value as Level); }
export interface ScenarioLevel { id: string; level: Level }
export function unlockedLevels(mode: PlayMode | null, completed: ReadonlySet<string>, scenarios: readonly ScenarioLevel[], ratio = UNLOCK_RATIO): Level[] {
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1) throw new Error('UNLOCK_RATIO must be in (0, 1]');
  if (mode === 'direct') return [...LEVELS];
  const unlocked: Level[] = [1];
  if (!mode) return unlocked;
  for (const level of [1, 2, 3] as const) {
    const available = scenarios.filter(s => s.level === level);
    if (!available.length || available.filter(s => completed.has(s.id)).length / available.length < ratio) break;
    unlocked.push((level + 1) as Level);
  }
  return unlocked;
}
