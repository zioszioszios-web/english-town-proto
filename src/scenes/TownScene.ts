import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { BUILDINGS, START, TILE, COLS, ROWS, WORLD_WIDTH, WORLD_HEIGHT, nearbyTownEntrance, LAKE, ACTIVITIES, type Point, type InteriorData, type TownDestination } from '../data/town';
import type { Level } from '../data/levels';
import { gameEvents } from '../events';
import { FONT } from './ui';

type MovementKeys = Record<'W' | 'A' | 'S' | 'D' | 'ENTER' | 'SPACE', Phaser.Input.Keyboard.Key>;
export class TownScene extends Phaser.Scene {
  private player!: Player;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private joystick: Point = { x: 0, y: 0 };
  private minimapDot!: Phaser.GameObjects.Arc;
  private minimap!: Phaser.GameObjects.Graphics;
  private townArt!: Phaser.GameObjects.Container;
  private entering = false;
  private level: Level = 1;
  private nearby?: TownDestination;

  constructor() { super('TownScene'); }
  create(): void {
    this.level = this.registry.get('level') as Level ?? 1;
    this.townArt = this.add.container(0, 0);
    this.drawTown();
    this.player = new Player(this, START);
    // Preserve camera padding so edge positions stay clear of HTML controls.
    this.cameras.main.setBounds(0, -102, WORLD_WIDTH, WORLD_HEIGHT + 102 + 156);
    this.cameras.main.startFollow(this.player, true, .12, .12, 0, -35);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('W,A,S,D,ENTER,SPACE') as MovementKeys | undefined;
    this.input.keyboard?.addCapture('W,A,S,D,UP,DOWN,LEFT,RIGHT,ENTER,SPACE');
    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.drawMinimap();
    this.minimapDot = this.add.circle(0, 0, 3, 0x233e36).setStrokeStyle(1, 0xffffff).setScrollFactor(0).setDepth(91);
    const unsubscribers = [
      gameEvents.on('controls:move', vector => { this.joystick = vector; }),
      gameEvents.on('controls:enter', () => this.enter()),
      gameEvents.on('level:changed', level => {
        this.level = level; this.joystick = { x: 0, y: 0 }; this.nearby = undefined;
        this.player.setPosition(START.x, START.y); this.input.keyboard?.resetKeys();
        this.drawTown(); this.drawMinimap(); gameEvents.emit('entrance:nearby', null);
      }),
    ];
    this.events.on(Phaser.Scenes.Events.RESUME, (_sys: Phaser.Scenes.Systems, data: InteriorData) => {
      const building = BUILDINGS.find(b => b.name === data.location);
      if (building) this.player.setPosition(building.door.x, building.door.y + 42);
      this.joystick = { x: 0, y: 0 }; this.input.keyboard?.resetKeys(); this.entering = false;
    });
    const resetKeys = (): void => { this.joystick = { x: 0, y: 0 }; this.input.keyboard?.resetKeys(); };
    this.game.events.on(Phaser.Core.Events.BLUR, resetKeys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribers.forEach(unsubscribe => unsubscribe()); this.game.events.off(Phaser.Core.Events.BLUR, resetKeys);
    });
  }
  private enter(): void {
    if (this.entering || this.registry.get('uiActive')) return;
    const entrance = nearbyTownEntrance(this.player, this.level);
    if (!entrance) return;
    if (entrance.location === 'Park' || entrance.location === 'Street') {
      this.nearby = undefined; this.joystick = { x: 0, y: 0 }; this.input.keyboard?.resetKeys();
      gameEvents.emit('entrance:nearby', null);
      gameEvents.emit('minigame:open', { id: entrance.location === 'Park' ? 'fishing' : 'runner' }); return;
    }
    this.entering = true; this.nearby = undefined; this.joystick = { x: 0, y: 0 };
    this.input.keyboard?.resetKeys(); gameEvents.emit('entrance:nearby', null);
    // Pause before opening the overlay so returning cannot race a later pause.
    this.scene.pause();
    this.scene.launch('InteriorScene', { location: entrance.location } satisfies InteriorData);
  }
  update(_time: number, frameDelta: number): void {
    if (this.entering || this.registry.get('uiActive')) return;
    const delta = Math.min(frameDelta, 50);
    const dx = Number(Boolean(this.cursors?.right.isDown || this.keys?.D.isDown)) - Number(Boolean(this.cursors?.left.isDown || this.keys?.A.isDown));
    const dy = Number(Boolean(this.cursors?.down.isDown || this.keys?.S.isDown)) - Number(Boolean(this.cursors?.up.isDown || this.keys?.W.isDown));
    const length = Math.hypot(dx, dy);
    const x = length ? dx / length : this.joystick.x, y = length ? dy / length : this.joystick.y;
    this.player.move(x * 150 * delta / 1000, y * 150 * delta / 1000, delta);
    this.minimapDot.setPosition(264 + this.player.x * .078, 130 + this.player.y * .078);
    const entrance = nearbyTownEntrance(this.player, this.level);
    if (entrance?.location !== this.nearby) {
      this.nearby = entrance?.location;
      gameEvents.emit('entrance:nearby', entrance ? { location: entrance.location, nameZh: entrance.nameZh } : null);
    }
    if ((this.keys && Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) || (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.SPACE))) this.enter();
  }
  private drawMinimap(): void {
    const g = this.minimap; g.clear();
    g.fillStyle(0xf7f3e8, .92).fillRoundedRect(257, 108, 126, 108, 8);
    g.fillStyle(0xa9bf91).fillRect(264, 130, WORLD_WIDTH * .078, WORLD_HEIGHT * .078);
    g.fillStyle(0xded2b8).fillRect(264 + 18 * TILE * .078, 130, 4 * TILE * .078, WORLD_HEIGHT * .078)
      .fillRect(264, 130 + 15 * TILE * .078, WORLD_WIDTH * .078, 4 * TILE * .078);
    g.fillStyle(0x78aabb).fillRect(264 + LAKE.x * .078, 130 + LAKE.y * .078, LAKE.width * .078, LAKE.height * .078);
    ACTIVITIES.forEach(e => g.fillStyle(e.location === 'Park' ? 0x325c45 : 0xc57c57).fillCircle(264+e.point.x*.078,130+e.point.y*.078,3));
    BUILDINGS.forEach(b => g.fillStyle(b.levels.includes(this.level) ? b.color : 0x969d91).fillRect(264 + b.x * .078, 130 + b.y * .078, b.width * .078, b.height * .078));
  }
  private drawTown(): void {
    this.townArt.removeAll(true);
    const g = this.add.graphics();
    this.townArt.add(g);
    g.fillStyle(0xa9bf91).fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      if ((col * 7 + row * 11) % 9 === 0) g.fillStyle(0x99b381, 0.6).fillRect(col * TILE + 8, row * TILE + 13, 5, 3);
    }
    g.fillStyle(0xded2b8).fillRect(18 * TILE, 0, 4 * TILE, WORLD_HEIGHT).fillRect(0, 15 * TILE, WORLD_WIDTH, 4 * TILE);
    for (const b of BUILDINGS) {
      g.fillStyle(0xded2b8);
      if (b.door.y < 17 * TILE) {
        g.fillRect(b.door.x - 24, b.door.y - 16, 48, 17 * TILE - b.door.y + 48);
        g.fillRect(Math.min(b.door.x, 20 * TILE), 17 * TILE - 24, Math.abs(20 * TILE - b.door.x) + 24, 48);
      } else {
        g.fillRect(b.door.x - 24, b.door.y - 16, 48, 26 * TILE - b.door.y + 48);
        g.fillRect(Math.min(b.door.x, 20 * TILE), 26 * TILE - 24, Math.abs(20 * TILE - b.door.x) + 24, 48);
      }
    }
    // Park is northwest of Cafe; its path joins the central east-west road.
    g.fillStyle(0xded2b8).fillRect(6*TILE, 6*TILE, TILE, 11*TILE);
    g.fillStyle(0x7babba).fillRoundedRect(LAKE.x, LAKE.y, LAKE.width, LAKE.height, 20);
    g.lineStyle(3,0xc9e0dd).strokeRoundedRect(LAKE.x+6,LAKE.y+6,LAKE.width-12,LAKE.height-12,16);
    for (const e of ACTIVITIES) {
      g.fillStyle(0xf0cb75).fillRoundedRect(e.point.x-17,e.point.y-13,34,26,5);
      this.townArt.add(this.add.text(e.point.x,e.point.y-42,e.location==='Park'?'Park · 公園':'START · 跑酷', {fontFamily:FONT,fontSize:17,color:'#233e36',backgroundColor:'#f7f3e8',padding:{x:6,y:4}}).setOrigin(.5));
    }
    // Draw buildings after paths so roads never cover their walls.
    for (const b of BUILDINGS) {
      const available = b.levels.includes(this.level);
      g.fillStyle(0x45634d, 0.2).fillRoundedRect(b.x + 7, b.y + 10, b.width, b.height, 5);
      g.fillStyle(available ? b.color : 0x969d91).fillRoundedRect(b.x, b.y, b.width, b.height, 5);
      g.fillStyle(0xffffff, 0.14).fillRect(b.x + 8, b.y + 8, b.width - 16, 18);
      for (let x = b.x + 20; x < b.x + b.width - 15; x += 40) {
        g.fillStyle(0xf4e8c9).fillRect(x, b.y + 42, 21, 26);
        g.lineStyle(2, 0x6a6253).strokeRect(x, b.y + 42, 21, 26);
      }
      g.fillStyle(0x384a41).fillRect(b.door.x - 14, b.y + b.height - 29, 28, 29);
      g.fillStyle(available ? 0xf0cb75 : 0x7d8579).fillRoundedRect(b.door.x - 17, b.door.y - 13, 34, 26, 5);
      const name = this.add.text(b.x + b.width / 2, b.y - 23, available ? b.name : `${b.name} · 封閉`, { fontFamily: FONT, fontSize: 19, fontStyle: 'bold', color: '#233e36', backgroundColor: '#f7f3e8', padding: { x: 9, y: 5 } }).setOrigin(0.5).setDepth(5);
      this.townArt.add(name);
    }
    // Decorative shrubs are painted only; all solid obstacles are in town.ts.
    for (const [x, y] of [[8, 6], [8, 23], [32, 5], [32, 24], [5, 14]]) {
      g.fillStyle(0x63876b).fillCircle(x * TILE, y * TILE, 20);
      g.fillStyle(0x789d78).fillCircle(x * TILE - 5, y * TILE - 5, 14);
    }
  }
}
