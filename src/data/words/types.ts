import type { Level } from '../levels';
export const WORD_TOPICS = ['food_drink', 'health_body', 'travel_lodging', 'school_sports', 'work_business', 'nature_outdoor', 'transport_city', 'daily_life', 'people_feelings', 'time_numbers', 'other'] as const;
export type WordTopic = typeof WORD_TOPICS[number];
export interface WordEntry { id: string; word: string; pos: string; zh: string[]; example: string; exampleZh: string; level: Level; topics: WordTopic[]; source: string; review: boolean }
export const PLACE_TOPICS: readonly WordTopic[] = ['food_drink', 'health_body', 'travel_lodging', 'school_sports', 'work_business', 'nature_outdoor', 'transport_city'];
export function normalizeWord(value: string): string { return value.trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').toLocaleLowerCase('en-US'); }
