import Phaser from 'phaser';
import { TownScene } from './scenes/TownScene';
import { InteriorScene } from './scenes/InteriorScene';
import './style.css';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#a9bf91',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 760 },
  input: { activePointers: 2 },
  render: { antialias: true, roundPixels: true },
  scene: [TownScene, InteriorScene],
});

// Prevent Safari gesture zoom and browser scroll from stealing game touches.
document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false });
document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
