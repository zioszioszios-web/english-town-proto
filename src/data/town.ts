import type { Level } from './levels';
export const TILE = 32;
export const COLS = 40;
export const ROWS = 30;
export const WORLD_WIDTH = COLS * TILE;
export const WORLD_HEIGHT = ROWS * TILE;
export const PLAYER_RADIUS = 10;
export const ENTRY_DISTANCE = TILE * 1.5;
export interface Point { x: number; y: number }
export type LocationName = 'Cafe' | 'Hotel' | 'Pharmacy' | 'School' | 'Office';
export interface Building {
  name: LocationName; subtitle: string;
  x: number; y: number; width: number; height: number;
  door: Point; color: number; levels: readonly Level[];
}
export const center = (col: number, row: number): Point => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
export const BUILDINGS: readonly Building[] = [
  { name: 'Cafe', subtitle: '咖啡廳', x: 10 * TILE, y: 8 * TILE, width: 5 * TILE, height: 4 * TILE,
    door: center(12, 12), color: 0xc57c57, levels: [1, 2, 3, 4] },
  { name: 'Hotel', subtitle: '飯店', x: 25 * TILE, y: 5 * TILE, width: 6 * TILE, height: 5 * TILE,
    door: center(28, 10), color: 0x6d8ca6, levels: [1, 2, 3, 4] },
  { name: 'Pharmacy', subtitle: '藥局', x: 25 * TILE, y: 20 * TILE, width: 6 * TILE, height: 4 * TILE,
    door: center(28, 24), color: 0x7c9c82, levels: [1, 2, 3, 4] },
  { name: 'School', subtitle: '學校', x: 5 * TILE, y: 20 * TILE, width: 7 * TILE, height: 5 * TILE,
    door: center(8, 25), color: 0xb29a63, levels: [1, 2] },
  { name: 'Office', subtitle: '辦公室', x: 13 * TILE, y: 1 * TILE, width: 7 * TILE, height: 5 * TILE,
    door: center(16, 6), color: 0x8b819e, levels: [4] },
];
export const START = center(19, 17);
export interface InteriorData { location: LocationName }
export function availableBuildings(level: Level): readonly Building[] { return BUILDINGS.filter(b => b.levels.includes(level)); }
export function nearbyEntrance(position: Point, level: Level): Building | undefined {
  return availableBuildings(level).filter(b => Math.hypot(position.x - b.door.x, position.y - b.door.y) <= ENTRY_DISTANCE)
    .sort((a, b) => Math.hypot(position.x - a.door.x, position.y - a.door.y) - Math.hypot(position.x - b.door.x, position.y - b.door.y))[0];
}
