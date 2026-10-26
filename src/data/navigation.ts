import { BUILDINGS, COLS, ROWS, TILE, PLAYER_RADIUS, WORLD_WIDTH, WORLD_HEIGHT, center, type Point } from './town';

export function canStand(x: number, y: number): boolean {
  const r = PLAYER_RADIUS;
  return x >= r && y >= r && x <= WORLD_WIDTH - r && y <= WORLD_HEIGHT - r &&
    !BUILDINGS.some(b => x + r > b.x && x - r < b.x + b.width && y + r > b.y && y - r < b.y + b.height);
}

/** Four-way breadth-first search; every edge stays on a collision-free tile corridor. */
export function findPath(from: Point, to: Point): Point[] {
  const sx = Math.floor(from.x / TILE), sy = Math.floor(from.y / TILE);
  const tx = Math.floor(to.x / TILE), ty = Math.floor(to.y / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS || sx < 0 || sy < 0 || sx >= COLS || sy >= ROWS) return [];
  const target = center(tx, ty);
  if (!canStand(target.x, target.y)) return [];
  const start = sy * COLS + sx, end = ty * COLS + tx;
  const queue = [start];
  const parents = new Map<number, number>([[start, -1]]);
  for (let i = 0; i < queue.length && !parents.has(end); i++) {
    const current = queue[i];
    const x = current % COLS, y = Math.floor(current / COLS);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, id = ny * COLS + nx;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || parents.has(id)) continue;
      const p = center(nx, ny);
      if (!canStand(p.x, p.y)) continue;
      parents.set(id, current);
      queue.push(id);
    }
  }
  if (!parents.has(end)) return [];
  const path: Point[] = [];
  for (let id = end; id !== -1; id = parents.get(id) ?? -1) path.push(center(id % COLS, Math.floor(id / COLS)));
  // Include the current tile center so diagonal shortcuts never clip building corners.
  return path.reverse();
}
