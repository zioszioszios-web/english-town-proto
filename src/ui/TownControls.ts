import { gameEvents } from '../events';
import { ALL_SCENARIOS } from '../data/dialogues';
import { LEVEL_INFO } from '../data/levels';
import type { ProgressStore } from './ProgressStore';
import { action, element } from './dom';

/** HTML controls emit intent only; Phaser owns character movement and proximity. */
export class TownControls {
  private readonly root = element('div', 'town-overlay');
  private readonly levelButton: HTMLButtonElement;
  private readonly progressLabel = element('span', 'town-progress');
  private readonly enter: HTMLButtonElement;
  private readonly pad = element('div', 'joystick');
  private readonly thumb = element('span', 'joystick-thumb');
  private pointerId: number | null = null;
  private readonly unsubscribers: (() => void)[];
  constructor(private readonly progress: ProgressStore, settings: () => void, levels: () => void) {
    const top = element('header', 'town-top');
    this.levelButton = action('', levels, 'ui-button level-button');
    top.append(this.levelButton, this.progressLabel, action('設定', settings, 'ui-button quiet'));
    const bottom = element('div', 'town-bottom');
    const joystickArea = element('div', 'joystick-area');
    this.pad.setAttribute('aria-label', '拖曳搖桿移動；也可使用方向鍵或 WASD');
    this.pad.append(element('span', 'joystick-cross', '＋'), this.thumb);
    joystickArea.append(this.pad, element('p', 'control-hint', '拖曳移動 · WASD / 方向鍵'));
    this.enter = action('', () => gameEvents.emit('controls:enter', undefined), 'ui-button enter-button');
    this.enter.hidden = true;
    bottom.append(joystickArea, this.enter);
    this.root.append(top, bottom);
    document.body.append(this.root);
    this.pad.addEventListener('pointerdown', event => {
      if (this.pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.preventDefault(); this.pointerId = event.pointerId; this.pad.setPointerCapture(event.pointerId); this.move(event);
    });
    this.pad.addEventListener('pointermove', event => { if (event.pointerId === this.pointerId) this.move(event); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) this.pad.addEventListener(name, () => this.stop());
    window.addEventListener('blur', this.stop);
    this.unsubscribers = [
      gameEvents.on('entrance:nearby', building => {
        this.enter.hidden = !building;
        this.enter.textContent = building ? `進入 ${building.nameZh} →` : '';
      }),
      gameEvents.on('ui:active', active => { this.stop(); this.root.hidden = active; }),
      gameEvents.on('progress:changed', () => this.refresh()),
      gameEvents.on('level:changed', () => this.refresh()),
    ];
    this.refresh();
  }
  private move(event: PointerEvent): void {
    const rect = this.pad.getBoundingClientRect();
    const radius = rect.width * .32;
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const y = (event.clientY - rect.top - rect.height / 2) / radius;
    const magnitude = Math.hypot(x, y);
    const clamped = Math.min(1, magnitude);
    const speed = Math.max(0, (clamped - .13) / .87);
    const nx = magnitude ? x / magnitude : 0, ny = magnitude ? y / magnitude : 0;
    this.thumb.style.transform = `translate(${nx * clamped * 100 - 50}%, ${ny * clamped * 100 - 50}%)`;
    gameEvents.emit('controls:move', { x: nx * speed, y: ny * speed });
  }
  private stop = (): void => {
    const pointer = this.pointerId; this.pointerId = null;
    if (pointer !== null && this.pad.hasPointerCapture(pointer)) this.pad.releasePointerCapture(pointer);
    this.thumb.style.transform = 'translate(-50%, -50%)';
    gameEvents.emit('controls:move', { x: 0, y: 0 });
  };
  private refresh(): void {
    const level = this.progress.currentLevel;
    const scenarios = ALL_SCENARIOS.filter(s => s.level === level);
    this.levelButton.textContent = `Lv${level} ${LEVEL_INFO[level].title} ▾`;
    this.progressLabel.textContent = `情境 ${this.progress.completedCount(scenarios.map(s => s.id))} / ${scenarios.length}`;
  }
  destroy(): void { this.stop(); this.unsubscribers.forEach(unsubscribe => unsubscribe()); window.removeEventListener('blur', this.stop); this.root.remove(); }
}
