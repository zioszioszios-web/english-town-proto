export const TILE = 32;
export const COLS = 40;
export const ROWS = 30;
export const WORLD_WIDTH = COLS * TILE;
export const WORLD_HEIGHT = ROWS * TILE;
export const PLAYER_RADIUS = 10;
export interface Point { x: number; y: number }
export type LocationName = 'Cafe' | 'Hotel' | 'Pharmacy';
export interface Building {
  name: LocationName;
  subtitle: string;
  x: number; y: number; width: number; height: number;
  door: Point;
  color: number;
  greeting: string;
  role: string;
}
export const center = (col: number, row: number): Point => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
export const BUILDINGS: readonly Building[] = [
  { name: 'Cafe', subtitle: '咖啡館', x: 12 * TILE, y: 8 * TILE, width: 5 * TILE, height: 4 * TILE,
    door: center(14, 12), color: 0xc57c57, greeting: 'Hello! Welcome to our cafe.', role: 'Barista' },
  { name: 'Hotel', subtitle: '旅館', x: 23 * TILE, y: 8 * TILE, width: 6 * TILE, height: 5 * TILE,
    door: center(26, 13), color: 0x6d8ca6, greeting: 'Hello! Welcome to the hotel.', role: 'Receptionist' },
  { name: 'Pharmacy', subtitle: '藥局', x: 23 * TILE, y: 20 * TILE, width: 6 * TILE, height: 4 * TILE,
    door: center(26, 24), color: 0x7c9c82, greeting: 'Hi! How can I help you?', role: 'Pharmacist' },
];
export const START = center(19, 17);
export interface InteriorData { location: LocationName }
