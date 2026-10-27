import Phaser from 'phaser';
import { BUILDINGS, type InteriorData, type Building } from '../data/town';
import { gameEvents } from '../events';
export class InteriorScene extends Phaser.Scene {
  private building!: Building;
  constructor() { super('InteriorScene'); }
  init(data: InteriorData): void { this.building = BUILDINGS.find(b => b.name === data.location) ?? BUILDINGS[0]; }
  create(): void {
    const b = this.building;
    this.cameras.main.setBackgroundColor('#ece4d3');
    const key = 'town-interior';
    if (this.textures.exists(key)) this.textures.remove(key);
    const g = this.add.graphics();
    g.fillStyle(b.color).fillRect(0, 0, 390, 198);
    g.fillStyle(0xd4c6ab).fillRect(16, 214, 358, 366);
    g.lineStyle(1, 0xc5b99e);
    for (let x = 16; x <= 374; x += 32) g.lineBetween(x, 214, x, 580);
    for (let y = 214; y <= 580; y += 32) g.lineBetween(16, y, 374, y);
    g.fillStyle(0x253f36).fillRect(179, 368, 32, 47);
    g.fillStyle(0xf0cda6).fillRect(182, 343, 26, 26);
    g.fillStyle(0xeee5cd).fillRect(178, 335, 34, 11);
    g.fillStyle(b.color).fillRoundedRect(78, 426, 234, 57, 5);
    g.fillStyle(0xf5e4bd).fillRect(78, 426, 234, 9);
    g.fillStyle(0xf3bd61).fillRect(185, 515, 20, 25);
    g.fillStyle(0xf0cda6).fillRect(187, 501, 16, 15);
    g.generateTexture(key, 390, 581); g.destroy();
    const art = this.add.image(0, 0, key).setOrigin(0);
    const unsubscribe = gameEvents.on('interior:leave', ({ location }) => {
      if (location !== b.name) return;
      this.scene.resume('TownScene', { location } satisfies InteriorData); this.scene.stop();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe(); art.destroy();
      if (this.textures.exists(key)) this.textures.remove(key);
    });
    gameEvents.emit('interior:open', { location: b.name });
  }
}
