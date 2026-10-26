import Phaser from 'phaser';
export const FONT = 'Arial, "Microsoft JhengHei", sans-serif';
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 14, color = '#233e36'): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT, fontSize: size, color }).setScrollFactor(0).setDepth(101);
}
export function button(scene: Phaser.Scene, x: number, y: number, width: number, text: string, action: () => void): void {
  const bg = scene.add.rectangle(x, y, width, 48, 0xf7f3e8).setStrokeStyle(1, 0xb7c2ac)
    .setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
  label(scene, x, y, text, 14).setOrigin(0.5);
  bg.on('pointerdown', (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    action();
  });
  bg.on('pointerover', () => bg.setFillStyle(0xe5ead9));
  bg.on('pointerout', () => bg.setFillStyle(0xf7f3e8));
}
