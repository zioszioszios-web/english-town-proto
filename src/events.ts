import type { LocationName, Point } from './data/town';
import type { Level } from './data/levels';
interface Events {
  'interior:open': { location: LocationName };
  'interior:leave': { location: LocationName };
  'ui:active': boolean;
  'controls:move': Point;
  'controls:enter': undefined;
  'entrance:nearby': { location: LocationName; nameZh: string } | null;
  'level:changed': Level;
  'progress:changed': { completed: number; total: number };
}
class GameEvents {
  private readonly target = new EventTarget();
  emit<K extends keyof Events>(name: K, detail: Events[K]): void { this.target.dispatchEvent(new CustomEvent(name, { detail })); }
  on<K extends keyof Events>(name: K, callback: (detail: Events[K]) => void): () => void {
    const listener = (event: Event): void => callback((event as CustomEvent<Events[K]>).detail);
    this.target.addEventListener(name, listener);
    return () => this.target.removeEventListener(name, listener);
  }
}
export const gameEvents = new GameEvents();
