import Phaser from 'phaser';
import { getGameTheme, type GameTheme } from '../../theme';
import type { GameEventBus } from '../../eventBus';
import type { Mode } from '../../../storage/progress';
import {
  FOOD_POINTS,
  GRID,
  getLevel,
  MODE_MULTIPLIER,
  MODE_SPEED,
  type Cell,
  type LevelConfig,
} from '../config';

export const CELL = 30;

interface SceneData {
  mode: Mode;
  levelId: number;
  bus: GameEventBus;
}

type Dir = { x: number; y: number };

const DIRS: Record<string, Dir> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export default class GameScene extends Phaser.Scene {
  private mode: Mode = 'easy';
  private level!: LevelConfig;
  private bus!: GameEventBus;
  private theme!: GameTheme;

  private snake: Cell[] = [];
  private dir: Dir = DIRS.right;
  private nextDir: Dir = DIRS.right;
  private food: Cell = { x: 0, y: 0 };
  private obstacles = new Set<string>();

  private score = 0;
  private stepMs = 150;
  private acc = 0;
  private started = false;
  private over = false;
  private unlockFired = false;
  private wonFired = false;

  private segments: Phaser.GameObjects.Rectangle[] = [];
  private foodObj!: Phaser.GameObjects.Arc;
  private swipeStart: { x: number; y: number } | null = null;

  constructor() {
    super('game');
  }

  init(data: SceneData) {
    this.mode = data.mode;
    this.level = getLevel(data.levelId);
    this.bus = data.bus;
    this.stepMs = MODE_SPEED[this.mode];
  }

  create() {
    this.theme = getGameTheme();
    this.cameras.main.setBackgroundColor(this.theme.bgCss);

    this.drawGridBackground();
    this.drawObstacles();

    // Snake starts horizontally centered, moving right.
    const cy = Math.floor(GRID.rows / 2);
    this.snake = [
      { x: 5, y: cy },
      { x: 4, y: cy },
      { x: 3, y: cy },
    ];
    this.dir = DIRS.right;
    this.nextDir = DIRS.right;
    this.score = 0;
    this.acc = 0;
    this.started = false;
    this.over = false;
    this.unlockFired = false;
    this.wonFired = false;

    this.placeFood();
    this.renderSnake();
    this.setupInput();

    // On-screen D-pad from React routes through the event bus.
    const onControl = (name: 'up' | 'down' | 'left' | 'right') =>
      this.setDirection(name);
    this.bus.on('control', onControl);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bus.off('control', onControl);
    });

    this.bus.emitScore(0);
    this.showHint();
  }

  private key(c: Cell): string {
    return `${c.x},${c.y}`;
  }

  private drawGridBackground() {
    const g = this.add.graphics();
    g.fillStyle(this.theme.surface, 0.25);
    for (let x = 0; x < GRID.cols; x++) {
      for (let y = 0; y < GRID.rows; y++) {
        if ((x + y) % 2 === 0) {
          g.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    }
    g.lineStyle(3, this.theme.blue, 0.5);
    g.strokeRect(0, 0, GRID.cols * CELL, GRID.rows * CELL);
  }

  private drawObstacles() {
    for (const o of this.level.obstacles) {
      this.obstacles.add(this.key(o));
      const r = this.add.rectangle(
        o.x * CELL + CELL / 2,
        o.y * CELL + CELL / 2,
        CELL - 2,
        CELL - 2,
        this.theme.blue,
        0.85
      );
      r.setStrokeStyle(2, this.theme.blueGlow, 0.9);
    }
  }

  private placeFood() {
    const free: Cell[] = [];
    const taken = new Set<string>(this.obstacles);
    for (const s of this.snake) taken.add(this.key(s));
    for (let x = 0; x < GRID.cols; x++) {
      for (let y = 0; y < GRID.rows; y++) {
        if (!taken.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    // Board full — the player has effectively cleared it.
    if (free.length === 0) {
      this.gameOver(true);
      return;
    }
    this.food = Phaser.Utils.Array.GetRandom(free);

    const fx = this.food.x * CELL + CELL / 2;
    const fy = this.food.y * CELL + CELL / 2;
    if (!this.foodObj) {
      this.foodObj = this.add.circle(fx, fy, CELL / 2 - 4, this.theme.circle);
      this.foodObj.setStrokeStyle(3, 0xffffff, 0.4);
    } else {
      // Stop the previous pulse so tweens don't accumulate.
      this.tweens.killTweensOf(this.foodObj);
      this.foodObj.setPosition(fx, fy);
    }
    this.foodObj.setScale(0);
    this.tweens.add({
      targets: this.foodObj,
      scale: 1,
      duration: 220,
      ease: 'Back.Out',
    });
    // Gentle pulse so the food reads as the target.
    this.tweens.add({
      targets: this.foodObj,
      scale: { from: 1, to: 1.18 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      delay: 240,
      ease: 'Sine.InOut',
    });
  }

  private renderSnake() {
    // Grow the object pool to match snake length.
    while (this.segments.length < this.snake.length) {
      const rect = this.add.rectangle(0, 0, CELL - 3, CELL - 3, this.theme.cross);
      rect.setOrigin(0.5);
      this.segments.push(rect);
    }
    while (this.segments.length > this.snake.length) {
      this.segments.pop()!.destroy();
    }
    for (let i = 0; i < this.snake.length; i++) {
      const c = this.snake[i];
      const seg = this.segments[i];
      seg.setPosition(c.x * CELL + CELL / 2, c.y * CELL + CELL / 2);
      if (i === 0) {
        seg.setFillStyle(this.theme.triangle);
        seg.setStrokeStyle(3, 0xffffff, 0.55);
      } else {
        seg.setFillStyle(this.theme.cross, 1 - Math.min(i, 8) * 0.05);
        seg.setStrokeStyle(0);
      }
    }
  }

  private showHint() {
    const t = this.add
      .text(
        (GRID.cols * CELL) / 2,
        (GRID.rows * CELL) / 2,
        'Swipe or use arrow keys to start',
        {
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          fontSize: '22px',
          color: this.theme.text,
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setAlpha(0.9);
    this.tweens.add({
      targets: t,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    this.events.once('firstmove', () => t.destroy());
  }

  private setupInput() {
    // Keyboard.
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: DIRS.up,
        ArrowDown: DIRS.down,
        ArrowLeft: DIRS.left,
        ArrowRight: DIRS.right,
        w: DIRS.up,
        s: DIRS.down,
        a: DIRS.left,
        d: DIRS.right,
      };
      const d = map[e.key];
      if (d) this.queueDir(d);
    });

    // Swipe.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.swipeStart = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.queueDir(dx > 0 ? DIRS.right : DIRS.left);
      } else {
        this.queueDir(dy > 0 ? DIRS.down : DIRS.up);
      }
    });
  }

  /** Set direction while preventing a 180-degree reversal into itself. */
  private queueDir(d: Dir) {
    if (this.over) return;
    if (d.x === -this.dir.x && d.y === -this.dir.y) return;
    this.nextDir = d;
    if (!this.started) {
      this.started = true;
      this.events.emit('firstmove');
    }
  }

  /** External control from React on-screen D-pad. */
  setDirection(name: 'up' | 'down' | 'left' | 'right') {
    this.queueDir(DIRS[name]);
  }

  update(_time: number, delta: number) {
    if (this.over || !this.started) return;
    this.acc += delta;
    if (this.acc < this.stepMs) return;
    this.acc = 0;
    this.step();
  }

  private step() {
    this.dir = this.nextDir;
    const head = this.snake[0];
    const newHead: Cell = { x: head.x + this.dir.x, y: head.y + this.dir.y };

    // Wall collision.
    if (
      newHead.x < 0 ||
      newHead.y < 0 ||
      newHead.x >= GRID.cols ||
      newHead.y >= GRID.rows
    ) {
      return this.gameOver(false);
    }
    // Obstacle collision.
    if (this.obstacles.has(this.key(newHead))) {
      return this.gameOver(false);
    }
    // Self collision (tail moves unless we grow this step).
    const willGrow = newHead.x === this.food.x && newHead.y === this.food.y;
    const body = willGrow ? this.snake : this.snake.slice(0, -1);
    if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
      return this.gameOver(false);
    }

    this.snake.unshift(newHead);
    if (willGrow) {
      this.onEat();
    } else {
      this.snake.pop();
    }
    this.renderSnake();
  }

  private onEat() {
    this.score += FOOD_POINTS * MODE_MULTIPLIER[this.mode];
    this.bus.emitScore(this.score);
    this.flashFood();
    this.placeFood();
    this.checkProgress();
  }

  private flashFood() {
    const burst = this.add.circle(
      this.foodObj.x,
      this.foodObj.y,
      CELL / 2,
      this.theme.circle,
      0.6
    );
    this.tweens.add({
      targets: burst,
      scale: 2.4,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.Out',
      onComplete: () => burst.destroy(),
    });
  }

  private checkProgress() {
    if (
      !this.unlockFired &&
      this.level.unlockNextAt !== undefined &&
      this.score >= this.level.unlockNextAt
    ) {
      this.unlockFired = true;
      this.bus.emitLevelUp(this.level.id + 1);
      this.bus.emitAchievement(
        `unlock-${this.level.id + 1}`,
        `Level ${this.level.id + 1} unlocked!`
      );
      this.celebrate(this.theme.good);
    }
    if (
      !this.wonFired &&
      this.level.winAt !== undefined &&
      this.score >= this.level.winAt
    ) {
      this.wonFired = true;
      this.bus.emitAchievement('arena-master', 'Arena Master — you won!');
      this.gameOver(true);
    }
  }

  private celebrate(color: number) {
    const cx = (GRID.cols * CELL) / 2;
    const cy = (GRID.rows * CELL) / 2;
    for (let i = 0; i < 14; i++) {
      const p = this.add.circle(cx, cy, Phaser.Math.Between(4, 9), color);
      const angle = (Math.PI * 2 * i) / 14;
      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * Phaser.Math.Between(120, 240),
        y: cy + Math.sin(angle) * Phaser.Math.Between(120, 240),
        alpha: 0,
        scale: 0,
        duration: 720,
        ease: 'Cubic.Out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private gameOver(won: boolean) {
    if (this.over) return;
    this.over = true;

    if (won) {
      this.celebrate(this.theme.good);
      this.celebrate(this.theme.blueGlow);
    } else {
      this.cameras.main.shake(260, 0.012);
      this.cameras.main.flash(180, 255, 84, 112);
    }

    // Fade the field, then notify React.
    this.tweens.add({
      targets: this.segments,
      alpha: won ? 1 : 0.25,
      duration: 400,
    });
    this.time.delayedCall(won ? 650 : 420, () => {
      this.bus.emitGameOver(this.score, won);
    });
  }
}
