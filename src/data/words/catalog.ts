import type { Level } from '../levels';
import manifest from './manifest.json';
import { validateWords } from './validate';
import type { WordEntry } from './types';
const cache = new Map<Level, readonly WordEntry[]>();
export function wordsReady(level: Level): boolean { return manifest[String(level) as keyof typeof manifest].ready; }
export function wordBankInfo(level: Level): {ready:boolean;wordCount?:number;reviewCount?:number} { return manifest[String(level) as keyof typeof manifest]; }
export async function loadWords(level: Level): Promise<readonly WordEntry[] | null> {
  if (!wordsReady(level)) return null;
  const previous = cache.get(level); if (previous) return previous;
  // Additional levels are registered only after their source and enrichment checks pass.
  if (level !== 1 && level !== 2 && level !== 3) return null;
  const data: unknown = level === 1 ? (await import('./lv1.json')).default : level === 2 ? (await import('./lv2.json')).default : (await import('./lv3.json')).default;
  validateWords(data); cache.set(level, data); return data;
}
