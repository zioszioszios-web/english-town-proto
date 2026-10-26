import Phaser from 'phaser';
import { BUILDINGS, type InteriorData, type Building } from '../data/town';
import { button, label } from './ui';

export class InteriorScene extends Phaser.Scene {
  private building!: Building;
  constructor() { super('InteriorScene'); }
  init(data: InteriorData): void {
    this.building = BUILDINGS.find(b => b.name === data.location) ?? BUILDINGS[0];
  }
  create(): void {
    const b = this.building;
    this.cameras.main.setBackgroundColor('#ece4d3');
    const g = this.add.graphics();
    g.fillStyle(b.color).fillRect(0, 0, 390, 198);
    g.fillStyle(0xd4c6ab).fillRect(16, 214, 358, 366);
    g.lineStyle(1, 0xc5b99e);
    for (let x = 16; x <= 374; x += 32) g.lineBetween(x, 214, x, 580);
    for (let y = 214; y <= 580; y += 32) g.lineBetween(16, y, 374, y);
    g.fillStyle(0xf7f3e8).fillRoundedRect(46, 227, 298, 94, 12);
    g.fillStyle(0x253f36).fillRect(179, 368, 32, 47);
    g.fillStyle(0xf0cda6).fillRect(182, 343, 26, 26);
    g.fillStyle(0xeee5cd).fillRect(178, 335, 34, 11);
    g.fillStyle(b.color).fillRoundedRect(78, 426, 234, 57, 5);
    g.fillStyle(0xf5e4bd).fillRect(78, 426, 234, 9);
    g.fillStyle(0xf3bd61).fillRect(185, 515, 20, 25);
    g.fillStyle(0xf0cda6).fillRect(187, 501, 16, 15);
    label(this, 25, 30, 'LITTLE TOWN / INSIDE', 11, '#ffffff').setLetterSpacing(2);
    label(this, 25, 70, b.name, 42, '#ffffff').setFontStyle('bold');
    label(this, 27, 126, b.subtitle, 18, '#ffffff');
    label(this, 195, 248, b.greeting, 16).setOrigin(0.5, 0);
    label(this, 195, 282, '歡迎！你已經抵達目的地。', 13, '#71836c').setOrigin(0.5, 0);
    label(this, 195, 394, b.role, 12, '#233e36').setOrigin(0.5).setBackgroundColor('#f7f3e8').setPadding(5);
    label(this, 195, 614, '每一段對話，都從一句 Hello 開始。', 14).setOrigin(0.5);
    label(this, 195, 642, '階段 1：場景探索 · 口說互動將於後續加入', 11, '#71836c').setOrigin(0.5);
    button(this, 195, 700, 290, '離開 · Back to town  →', () => {
      this.scene.resume('TownScene', { location: b.name } satisfies InteriorData);
      this.scene.stop();
    });
  }
}
