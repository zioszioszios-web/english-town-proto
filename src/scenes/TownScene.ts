import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { BUILDINGS, START, TILE, COLS, ROWS, WORLD_WIDTH, WORLD_HEIGHT, type Point, type InteriorData, type LocationName } from '../data/town';
import { findPath } from '../data/navigation';
import { button, label, FONT } from './ui';

type MovementKeys = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
export class TownScene extends Phaser.Scene {
  private player!: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private path: Point[] = [];
  private marker!: Phaser.GameObjects.Arc;
  private status!: Phaser.GameObjects.Text;
  private minimapDot!: Phaser.GameObjects.Arc;
  private entering = false;
  private visited = new Set<LocationName>();
  private progress!: Phaser.GameObjects.Text;

  constructor() { super('TownScene'); }
  create(): void {
    this.entering = false;
    this.path = [];
    this.drawTown();
    this.player = new Player(this, START);
    this.marker = this.add.circle(0, 0, 9, 0xffffff, 0.3).setStrokeStyle(2, 0xffffff).setVisible(false).setDepth(2);
    // Camera padding keeps the player clear of fixed HUD panels at map edges.
    this.cameras.main.setBounds(0, -102, WORLD_WIDTH, WORLD_HEIGHT + 102 + 156);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, -35);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D') as MovementKeys | undefined;
    this.input.keyboard?.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.drawHud();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < 102 || pointer.y > 604 || this.entering) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const building = BUILDINGS.find(b => world.x >= b.x && world.x <= b.x + b.width && world.y >= b.y && world.y <= b.y + b.height);
      this.navigate(building?.door ?? world);
    });
    this.events.on(Phaser.Scenes.Events.RESUME, (_sys: Phaser.Scenes.Systems, data: InteriorData) => {
      const building = BUILDINGS.find(b => b.name === data.location);
      if (building) {
        this.player.setPosition(building.door.x, building.door.y + 42);
        this.visited.add(building.name);
      }
      this.path = [];
      this.marker.setVisible(false);
      this.input.keyboard?.resetKeys();
      this.entering = false;
      this.status.setText('回到小鎮了，繼續探索吧！');
      this.progress.setText(`${this.visited.size} / 3 EXPLORED`);
    });
    const resetKeys = (): void => { this.input.keyboard?.resetKeys(); };
    this.game.events.on(Phaser.Core.Events.BLUR, resetKeys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, resetKeys));
  }
  private navigate(target: Point): void {
    this.path = findPath(this.player, target);
    const end = this.path.at(-1);
    this.marker.setVisible(Boolean(end));
    if (end) this.marker.setPosition(end.x, end.y);
    this.status.setText(end ? '正在前往目的地…' : '這裡無法到達，請點擊空地。');
  }
  update(_time: number, frameDelta: number): void {
    if (this.entering) return;
    const delta = Math.min(frameDelta, 50);
    const dx = Number(Boolean(this.cursors?.right.isDown || this.keys?.D.isDown)) - Number(Boolean(this.cursors?.left.isDown || this.keys?.A.isDown));
    const dy = Number(Boolean(this.cursors?.down.isDown || this.keys?.S.isDown)) - Number(Boolean(this.cursors?.up.isDown || this.keys?.W.isDown));
    const distance = 150 * delta / 1000;
    if (dx || dy) {
      this.path = [];
      this.marker.setVisible(false);
      const magnitude = Math.hypot(dx, dy);
      this.player.move(dx / magnitude * distance, dy / magnitude * distance, delta);
    } else {
      const next = this.path[0];
      if (next) {
        const x = next.x - this.player.x, y = next.y - this.player.y, length = Math.hypot(x, y);
        if (length <= 0.5) this.path.shift();
        else this.player.move(x / length * Math.min(distance, length), y / length * Math.min(distance, length), delta);
        if (!this.path.length) { this.marker.setVisible(false); this.status.setText('點擊地面移動，走到門口即可進入。'); }
      }
    }
    this.minimapDot.setPosition(264 + this.player.x * 0.078, 504 + this.player.y * 0.078);
    const entrance = BUILDINGS.find(b => Phaser.Math.Distance.Between(this.player.x, this.player.y, b.door.x, b.door.y) < 12);
    if (entrance) {
      this.entering = true;
      this.path = [];
      this.scene.launch('InteriorScene', { location: entrance.name } satisfies InteriorData);
      this.scene.pause();
    }
  }
  private drawTown(): void {
    const g = this.add.graphics();
    g.fillStyle(0xa9bf91).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if ((col * 7 + row * 11) % 9 === 0) g.fillStyle(0x99b381, 0.6).fillRect(col * TILE + 8, row * TILE + 13, 5, 3);
    }
    g.fillStyle(0xded2b8).fillRect(18 * TILE, 0, 4 * TILE, WORLD_HEIGHT).fillRect(0, 15 * TILE, WORLD_WIDTH, 4 * TILE);
    for (const b of BUILDINGS) {
      g.fillStyle(0xded2b8).fillRect(b.door.x - 32, Math.min(b.door.y - 16, 17 * TILE), 64, Math.abs(17 * TILE - b.door.y) + 32);
    }
    // Draw buildings after paths so roads never cover their walls.
    for (const b of BUILDINGS) {
      g.fillStyle(0x45634d, 0.2).fillRoundedRect(b.x + 7, b.y + 10, b.width, b.height, 5);
      g.fillStyle(b.color).fillRoundedRect(b.x, b.y, b.width, b.height, 5);
      g.fillStyle(0xffffff, 0.14).fillRect(b.x + 8, b.y + 8, b.width - 16, 18);
      for (let x = b.x + 20; x < b.x + b.width - 15; x += 40) {
        g.fillStyle(0xf4e8c9).fillRect(x, b.y + 42, 21, 26);
        g.lineStyle(2, 0x6a6253).strokeRect(x, b.y + 42, 21, 26);
      }
      g.fillStyle(0x384a41).fillRect(b.door.x - 14, b.y + b.height - 29, 28, 29);
      g.fillStyle(0xf0cb75).fillRoundedRect(b.door.x - 17, b.door.y - 13, 34, 26, 5);
      this.add.text(b.x + b.width / 2, b.y - 23, b.name, { fontFamily: FONT, fontSize: 19, fontStyle: 'bold', color: '#233e36', backgroundColor: '#f7f3e8', padding: { x: 9, y: 5 } }).setOrigin(0.5).setDepth(5);
    }
    // Decorative shrubs are painted only; all solid obstacles are in town.ts.
    for (const [x, y] of [[8, 6], [8, 23], [32, 5], [32, 24], [5, 14]]) {
      g.fillStyle(0x63876b).fillCircle(x * TILE, y * TILE, 20);
      g.fillStyle(0x789d78).fillCircle(x * TILE - 5, y * TILE - 5, 14);
    }
  }
  private drawHud(): void {
    this.add.rectangle(195, 49, 390, 98, 0xf7f3e8).setScrollFactor(0).setDepth(100);
    label(this, 22, 17, 'LITTLE TOWN', 12, '#71836c').setLetterSpacing(3);
    label(this, 21, 37, '今天，去小鎮走走。', 24).setFontStyle('bold');
    label(this, 23, 73, '英語小鎮  /  01 探索與移動', 12, '#71836c');
    this.add.rectangle(195, 682, 390, 156, 0xf7f3e8).setScrollFactor(0).setDepth(100);
    this.status = label(this, 20, 619, '點擊地面移動，走到門口即可進入。', 13);
    BUILDINGS.forEach((b, i) => button(this, 70 + i * 125, 670, 114, `${b.name}\n${b.subtitle}`, () => this.navigate(b.door)));
    label(this, 20, 712, '點地移動  ·  方向鍵 / WASD', 12, '#71836c');
    this.progress = label(this, 20, 735, `${this.visited.size} / 3 EXPLORED`, 10, '#71836c').setLetterSpacing(2);
    const map = this.add.graphics().setScrollFactor(0).setDepth(90);
    map.fillStyle(0xf7f3e8, 0.92).fillRoundedRect(257, 482, 126, 111, 8);
    label(this, 268, 490, 'TOWN MAP', 9, '#71836c').setLetterSpacing(1);
    map.fillStyle(0xa9bf91).fillRect(264, 504, WORLD_WIDTH * 0.078, WORLD_HEIGHT * 0.078);
    map.fillStyle(0xded2b8).fillRect(264 + 18 * TILE * 0.078, 504, 4 * TILE * 0.078, WORLD_HEIGHT * 0.078)
      .fillRect(264, 504 + 15 * TILE * 0.078, WORLD_WIDTH * 0.078, 4 * TILE * 0.078);
    BUILDINGS.forEach(b => map.fillStyle(b.color).fillRect(264 + b.x * 0.078, 504 + b.y * 0.078, b.width * 0.078, b.height * 0.078));
    this.minimapDot = this.add.circle(0, 0, 3, 0x233e36).setStrokeStyle(1, 0xffffff).setScrollFactor(0).setDepth(102);
  }
}
