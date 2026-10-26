import Phaser from 'phaser';
import { TownScene } from './scenes/TownScene';
import { InteriorScene } from './scenes/InteriorScene';
import { gameEvents } from './events';
import { AppUI } from './ui/AppUI';
import { ProgressStore } from './ui/ProgressStore';
import { ALL_SCENARIOS } from './data/dialogues';
import './style.css';

const progress = new ProgressStore(ALL_SCENARIOS);
let uiActive = !progress.mode;
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#a9bf91',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 760 },
  input: { activePointers: 2 }, render: { antialias: true, roundPixels: true },
  scene: [TownScene, InteriorScene],
  callbacks: { preBoot: game => { game.registry.set('level', progress.currentLevel); game.registry.set('uiActive', uiActive); } },
});
function applyInputLock(active: boolean): void {
  uiActive = active; game.registry?.set('uiActive', active);
  if (game.input) { game.input.enabled = !active; if (game.input.keyboard) game.input.keyboard.enabled = !active; }
  const host = document.getElementById('game'); if (host) host.inert = active;
}
gameEvents.on('ui:active', applyInputLock);
gameEvents.on('level:changed', level => game.registry.set('level', level));
const ui = new AppUI(progress);
game.events.once(Phaser.Core.Events.READY, () => { game.canvas.tabIndex = 0; applyInputLock(uiActive); });
game.events.once(Phaser.Core.Events.DESTROY, () => ui.destroy());
// Only the canvas consumes drag gestures; HTML dialogue panels must remain scrollable.
document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
document.addEventListener('touchmove', event => { if (event.target instanceof HTMLCanvasElement) event.preventDefault(); }, { passive: false });
