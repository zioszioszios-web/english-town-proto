import type { MiniGame, MiniGameContext, GameLocation } from './types';
import type { WordTopic } from '../data/words/types';
export abstract class BaseGame implements MiniGame {
  abstract readonly id: string; abstract readonly name: string; abstract readonly location: GameLocation; abstract readonly topics: readonly WordTopic[];
  protected context!: MiniGameContext;
  protected readonly cleanup: (() => void)[] = [];
  protected stopped = true;
  private readonly timers = new Set<number>();
  private readonly frames = new Set<number>();
  abstract start(context: MiniGameContext): void;
  protected timer(callback: () => void, ms: number): void {
    const id = window.setTimeout(() => { this.timers.delete(id); if (!this.stopped) callback(); }, ms); this.timers.add(id);
  }
  protected listen(target: EventTarget, name: string, callback: EventListener): void {
    target.addEventListener(name, callback); this.cleanup.push(() => target.removeEventListener(name, callback));
  }
  protected frame(callback: (now: number) => void): void {
    const id = window.requestAnimationFrame(now => { this.frames.delete(id); if (!this.stopped) callback(now); }); this.frames.add(id);
  }
  end(): void { this.stopped = true; this.timers.forEach(id => window.clearTimeout(id)); this.timers.clear(); this.frames.forEach(id => window.cancelAnimationFrame(id)); this.frames.clear(); this.cleanup.splice(0).forEach(fn => fn()); }
  protected begin(context: MiniGameContext): void { this.end(); this.context = context; this.stopped = false; }
}
