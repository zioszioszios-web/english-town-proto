import Phaser from 'phaser';
import { canStand } from '../data/navigation';
import type { Point } from '../data/town';

export class Player extends Phaser.GameObjects.Container {
  private readonly figure: Phaser.GameObjects.Container;
  private elapsed = 0;
  constructor(scene: Phaser.Scene, position: Point) {
    super(scene, position.x, position.y);
    scene.add.existing(this);
    this.add(scene.add.ellipse(0, 7, 25, 12, 0x233e36, 0.23));
    this.figure = scene.add.container(0, 0);
    this.figure.add([
      scene.add.rectangle(0, 0, 19, 22, 0xf3bd61).setStrokeStyle(2, 0x4b4839),
      scene.add.rectangle(0, -15, 17, 15, 0xf7ddba),
      scene.add.rectangle(0, -23, 21, 7, 0x3c5147),
      scene.add.rectangle(4, -16, 2, 2, 0x233e36),
      scene.add.rectangle(-5, 13, 6, 6, 0x3c5147),
      scene.add.rectangle(5, 13, 6, 6, 0x3c5147),
    ]);
    this.add(this.figure);
    this.setDepth(20);
  }
  move(dx: number, dy: number, delta: number): void {
    // Small substeps prevent tunnelling after a slow frame, on both input paths.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
    const beforeX = this.x, beforeY = this.y;
    for (let i = 0; i < steps; i++) {
      if (canStand(this.x + dx / steps, this.y)) this.x += dx / steps;
      if (canStand(this.x, this.y + dy / steps)) this.y += dy / steps;
    }
    const moving = Math.abs(this.x - beforeX) + Math.abs(this.y - beforeY) > 0.01;
    this.elapsed += delta;
    this.figure.y = moving ? Math.sin(this.elapsed / 75) * 1.5 : 0;
  }
}
