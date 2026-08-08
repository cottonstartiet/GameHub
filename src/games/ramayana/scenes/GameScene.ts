/**
 * GameScene — Angry Birds-style Ramayana gameplay using Phaser 3 Arcade Physics.
 *
 * Mechanics:
 *  - Pull back on the slingshot (touch/mouse drag) to aim and set power.
 *  - Release to launch the hero character as a projectile.
 *  - Tap/click in-flight to trigger the hero's special ability.
 *  - Destroy all enemies to clear the level.
 *  - Blocks are destructible physics bodies.
 *  - Score: enemy kills + block destructions + unused-hero bonus.
 */
import Phaser from 'phaser';
import {
  GAME_W, GAME_H, GRAVITY,
  LEVELS, HEROES,
  type LevelConfig, type HeroId, type EnemyType,
} from '../constants';
import type { GameEventBus } from '../../eventBus';



const SLING_X = 160;
const SLING_Y = 370;
const MAX_DRAG = 110;
const LAUNCH_POWER = 4.8;

interface SceneData {
  levelId: number;
  bus?: GameEventBus;
}

interface EnemySprite extends Phaser.Physics.Arcade.Image {
  hp: number;
  maxHp: number;
  isBoss: boolean;
  enemyType: EnemyType;
  hpBar?: Phaser.GameObjects.Graphics;
  hpBarBg?: Phaser.GameObjects.Graphics;
  label?: Phaser.GameObjects.Text;
}

interface BlockSprite extends Phaser.Physics.Arcade.Image {
  blockType: string;
  hp: number;
}

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  private level!: LevelConfig;
  private bus!: GameEventBus;

  // Hero queue
  private heroQueue: HeroId[] = [];
  private currentHero: Phaser.Physics.Arcade.Image | null = null;
  private currentHeroId: HeroId | null = null;
  private heroLaunched = false;
  private abilityUsed = false;
  private heroesRemaining: Phaser.GameObjects.Image[] = [];

  // Physics groups
  private enemies!: Phaser.Physics.Arcade.Group;
  private blocks!: Phaser.Physics.Arcade.Group;

  // Slingshot
  private bandLeft!: Phaser.GameObjects.Graphics;
  private bandRight!: Phaser.GameObjects.Graphics;
  private isDragging = false;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragCurrent: Phaser.Math.Vector2 | null = null;

  // Trajectory
  private trajectoryDots: Phaser.GameObjects.Arc[] = [];

  // Score & state
  private score = 0;
  private levelOver = false;
  private groundY = 0;
  private groundBody!: Phaser.Physics.Arcade.StaticGroup;

  // Trail particles
  private trailTimer?: Phaser.Time.TimerEvent;

  // Ability tap cleanup
  private abilityTapHandler: (() => void) | null = null;

  // Bus cleanup
  private scoreListener: ((s: number) => void) | null = null;

  init(data: SceneData) {
    const found = LEVELS.find(l => l.id === data.levelId);
    if (!found) throw new Error(`Unknown level ${data.levelId}`);
    this.level = found;
    this.bus = data.bus ?? this.game.registry.get('bus');
    this.heroQueue = [...this.level.heroes];
    this.score = 0;
    this.levelOver = false;
    this.heroLaunched = false;
    this.abilityUsed = false;
  }

  create() {
    // Background
    this.add.image(GAME_W / 2, GAME_H / 2, this.level.bgKey)
      .setDisplaySize(GAME_W, GAME_H);

    // Ground
    this.groundY = Math.round(GAME_H * 0.78);
    const groundGfx = this.add.graphics();
    groundGfx.fillStyle(0x2d5016, 1);
    groundGfx.fillRect(0, this.groundY, GAME_W, GAME_H - this.groundY);

    // Invisible ground physics body
    this.groundBody = this.physics.add.staticGroup();
    const groundImg = this.groundBody.create(GAME_W / 2, this.groundY + 5, '__DEFAULT') as Phaser.Physics.Arcade.Image;
    groundImg.setDisplaySize(GAME_W, 10).setAlpha(0).refreshBody();

    // Story banner
    this._showStoryBanner();

    // Slingshot
    this.add.image(SLING_X, SLING_Y + 10, 'slingshot').setDepth(5);
    this.bandLeft  = this.add.graphics().setDepth(6);
    this.bandRight = this.add.graphics().setDepth(6);

    // Physics groups
    this.blocks = this.physics.add.group({ allowGravity: true, bounceY: 0.2, bounceX: 0.3 });
    this.enemies = this.physics.add.group({ allowGravity: true });

    // Build level
    this._buildBlocks();
    this._buildEnemies();

    // Colliders
    this.physics.add.collider(this.blocks, this.groundBody);
    this.physics.add.collider(this.enemies, this.groundBody);
    this.physics.add.collider(this.blocks, this.blocks);
    this.physics.add.collider(
      this.enemies,
      this.blocks,
      (enemy, _block) => {
        const en = enemy as EnemySprite;
        const body = en.body as Phaser.Physics.Arcade.Body;
        const impact = body.velocity.length();
        if (impact > 250) {
          this._damageEnemy(en, 1, en.x, en.y);
        }
      },
      undefined,
      this
    );

    // HUD
    this._buildHud();

    // Queue first hero
    this._nextHero();

    // Input for slingshot drag
    this.input.on('pointerdown', this._onPointerDown, this);
    this.input.on('pointermove', this._onPointerMove, this);
    this.input.on('pointerup',   this._onPointerUp,   this);
  }

  update() {
    if (this.levelOver) return;

    // Draw slingshot bands
    this._drawBands();

    // Show trajectory while dragging
    if (this.isDragging && this.dragCurrent && !this.heroLaunched) {
      this._drawTrajectory();
    } else if (!this.isDragging) {
      this._clearTrajectory();
    }

    // Follow hero in-flight
    if (this.currentHero && this.heroLaunched) {
      const body = this.currentHero.body as Phaser.Physics.Arcade.Body;
      // Off-screen: move to next hero
      if (
        this.currentHero.x > GAME_W + 100 ||
        this.currentHero.x < -100 ||
        this.currentHero.y > GAME_H + 100
      ) {
        this._heroLanded();
      }
      // Stopped moving on ground
      if (
        Math.abs(body.velocity.x) < 5 &&
        Math.abs(body.velocity.y) < 5 &&
        this.currentHero.y >= this.groundY - 30
      ) {
        this._heroLanded();
      }
    }

    // Update HP bars for enemies
    this.enemies.getChildren().forEach((e) => {
      const en = e as EnemySprite;
      if (en.hpBar && en.hpBarBg && en.active) {
        const bw = 50;
        const bx = en.x - bw / 2;
        const by = en.y - (en.displayHeight / 2) - 12;
        en.hpBarBg.clear();
        en.hpBarBg.fillStyle(0x000000, 0.6);
        en.hpBarBg.fillRect(bx, by, bw, 6);
        en.hpBar.clear();
        en.hpBar.fillStyle(en.hp / en.maxHp > 0.5 ? 0x00cc44 : 0xff4444, 1);
        en.hpBar.fillRect(bx, by, bw * (en.hp / en.maxHp), 6);
      }
    });
  }

  // ─── Slingshot input ────────────────────────────────────────────────────────

  private _onPointerDown(ptr: Phaser.Input.Pointer) {
    if (this.heroLaunched || this.levelOver || !this.currentHero) return;
    const heroPos = new Phaser.Math.Vector2(SLING_X, SLING_Y - 30);
    const ptrPos  = new Phaser.Math.Vector2(ptr.x, ptr.y);
    if (ptrPos.distance(heroPos) < 60) {
      this.isDragging = true;
      this.dragStart = heroPos.clone();
    }
  }

  private _onPointerMove(ptr: Phaser.Input.Pointer) {
    if (!this.isDragging || !this.dragStart) return;
    const raw = new Phaser.Math.Vector2(ptr.x - this.dragStart.x, ptr.y - this.dragStart.y);
    const len = Math.min(raw.length(), MAX_DRAG);
    this.dragCurrent = new Phaser.Math.Vector2(raw.x, raw.y).normalize().scale(len);
    // Move hero with the finger
    if (this.currentHero) {
      this.currentHero.setPosition(
        this.dragStart.x + this.dragCurrent.x,
        this.dragStart.y + this.dragCurrent.y
      );
    }
  }

  private _onPointerUp(_ptr: Phaser.Input.Pointer) {
    if (!this.isDragging || !this.dragCurrent) return;
    this.isDragging = false;
    this._clearTrajectory();
    this._launch();
  }

  private _launch() {
    if (!this.currentHero || !this.dragCurrent) return;
    const hero = HEROES[this.currentHeroId!];

    // Velocity is opposite to drag direction, scaled by power
    const vx = -this.dragCurrent.x * LAUNCH_POWER * hero.powerFactor;
    const vy = -this.dragCurrent.y * LAUNCH_POWER * hero.powerFactor;

    const body = this.currentHero.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(GRAVITY * 0.8);
    body.setVelocity(vx, vy);
    body.setAllowGravity(true);

    this.heroLaunched = true;
    this.abilityUsed = false;
    this.dragCurrent = null;

    // Collider: hero vs blocks
    this.physics.add.collider(
      this.currentHero,
      this.blocks,
      (h, b) => this._onHeroHitBlock(h as Phaser.Physics.Arcade.Image, b as BlockSprite),
      undefined,
      this
    );
    // Collider: hero vs enemies
    this.physics.add.overlap(
      this.currentHero,
      this.enemies,
      (h, e) => this._onHeroHitEnemy(h as Phaser.Physics.Arcade.Image, e as EnemySprite),
      undefined,
      this
    );
    // Collider: hero vs ground
    this.physics.add.collider(this.currentHero, this.groundBody, () => {
      this._heroLanded();
    });

    // Trail effect
    this._startTrail();

    // Ability hint
    this._showAbilityHint(hero.ability);

    // Single-tap ability handler — stored so it can be removed on hero landing
    this.abilityTapHandler = () => {
      if (this.heroLaunched && !this.abilityUsed && this.currentHero) {
        this.abilityUsed = true;
        this._triggerAbility();
      }
    };
    this.input.once('pointerdown', this.abilityTapHandler, this);

    this.bus.emitScore(this.score);
  }

  // ─── Special abilities ───────────────────────────────────────────────────

  private _triggerAbility() {
    const id = this.currentHeroId!;
    const hero = this.currentHero!;
    const body = hero.body as Phaser.Physics.Arcade.Body;

    this._flashHero(hero);

    switch (id) {
      case 'ram': {
        // Triple arrow: spawn 2 extra clones diverging slightly
        [-0.25, 0.25].forEach(angleOffset => {
          const clone = this.physics.add.image(hero.x, hero.y, id + '_char')
            .setCircle(HEROES[id].radius)
            .setScale(0.8);
          const speed = body.velocity.length();
          const baseAngle = Math.atan2(body.velocity.y, body.velocity.x);
          const a = baseAngle + angleOffset;
          (clone.body as Phaser.Physics.Arcade.Body).setVelocity(
            Math.cos(a) * speed,
            Math.sin(a) * speed
          );
          (clone.body as Phaser.Physics.Arcade.Body).setGravityY(GRAVITY * 0.8);
          this.physics.add.overlap(clone, this.enemies,
            (_c, e) => this._damageEnemy(e as EnemySprite, 1, clone.x, clone.y),
            undefined, this
          );
          this.physics.add.collider(clone, this.blocks,
            (_c, b) => this._damageBlock(b as BlockSprite, 1),
            undefined, this
          );
          this.time.delayedCall(3000, () => { if (clone.active) clone.destroy(); });
        });
        break;
      }
      case 'lakshman': {
        // Speed boost + piercing (handled by not destroying on first hit)
        body.setVelocityX(body.velocity.x * 1.4);
        this._emitParticles(hero.x, hero.y, 0x06d6a0, 8);
        break;
      }
      case 'hanuman': {
        // Double size + downward slam
        this.tweens.add({ targets: hero, scaleX: 1.8, scaleY: 1.8, duration: 150 });
        body.setVelocityY(Math.abs(body.velocity.y) + 400);
        this._emitParticles(hero.x, hero.y, 0xff6b35, 14);
        break;
      }
      case 'jatayu': {
        // Nosedive
        const speed = body.velocity.length() * 1.2;
        body.setVelocity(body.velocity.x * 0.3, speed);
        this._emitParticles(hero.x, hero.y, 0x8338ec, 10);
        break;
      }
      case 'sita': {
        // Radial explosion
        this._emitParticles(hero.x, hero.y, 0xef476f, 30);
        this._radialBlast(hero.x, hero.y, 120, 3);
        hero.destroy();
        this.currentHero = null;
        this.time.delayedCall(600, () => this._heroLanded());
        break;
      }
    }
  }

  /** Radial damage blast for Sita's ability */
  private _radialBlast(cx: number, cy: number, radius: number, damage: number) {
    this.cameras.main.shake(300, 0.015);
    // Visual ring
    const ring = this.add.graphics();
    ring.lineStyle(4, 0xef476f, 1);
    ring.strokeCircle(cx, cy, 1);
    this.tweens.add({
      targets: ring,
      scaleX: radius, scaleY: radius,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });

    this.enemies.getChildren().forEach(e => {
      const en = e as EnemySprite;
      if (!en.active) return;
      const dist = Phaser.Math.Distance.Between(cx, cy, en.x, en.y);
      if (dist <= radius) {
        const dmg = Math.max(1, Math.ceil(damage * (1 - dist / radius)));
        this._damageEnemy(en, dmg, cx, cy);
      }
    });
  }

  // ─── Collision handlers ──────────────────────────────────────────────────

  private _onHeroHitBlock(hero: Phaser.Physics.Arcade.Image, block: BlockSprite) {
    const speed = (hero.body as Phaser.Physics.Arcade.Body).velocity.length();
    const dmg = Math.max(1, Math.round(speed / 200));
    this._damageBlock(block, dmg);

    // Lakshman pierces; others stop
    if (this.currentHeroId !== 'lakshman') {
      this._heroLanded();
    }
  }

  private _onHeroHitEnemy(hero: Phaser.Physics.Arcade.Image, enemy: EnemySprite) {
    if (!enemy.active || !hero.active) return;
    const speed = (hero.body as Phaser.Physics.Arcade.Body).velocity.length();
    const massMult = HEROES[this.currentHeroId!].mass;
    const dmg = Math.max(1, Math.round((speed * massMult) / 150));
    this._damageEnemy(enemy, dmg, hero.x, hero.y);

    if (this.currentHeroId !== 'lakshman') {
      this._heroLanded();
    }
  }


  // ─── Damage helpers ──────────────────────────────────────────────────────

  private _damageEnemy(enemy: EnemySprite, damage: number, hitX: number, hitY: number) {
    if (!enemy.active) return;
    enemy.hp -= damage;
    this._emitParticles(hitX, hitY, 0xff4444, 6);
    this.cameras.main.shake(80, 0.008);

    if (enemy.hp <= 0) {
      this._killEnemy(enemy);
    } else {
      // Flash red
      this.tweens.add({
        targets: enemy,
        alpha: 0.4,
        duration: 80,
        yoyo: true,
        repeat: 1,
        onComplete: () => { if (enemy.active) enemy.setAlpha(1); },
      });
    }
  }

  private _killEnemy(enemy: EnemySprite) {
    const pts = this.level.enemyPoints * (enemy.isBoss ? 3 : 1);
    this.score += pts;
    this.bus.emitScore(this.score);
    this._showFloatingText(enemy.x, enemy.y, `+${pts}`, '#ff6b35');
    this._emitParticles(enemy.x, enemy.y, 0xff4444, 20);
    this.cameras.main.shake(200, 0.018);

    // Death animation
    this.tweens.add({
      targets: enemy,
      scaleX: 1.6, scaleY: 1.6,
      alpha: 0,
      angle: Phaser.Math.Between(-90, 90),
      duration: 350,
      ease: 'Cubic.Out',
      onComplete: () => {
        enemy.hpBar?.destroy();
        enemy.hpBarBg?.destroy();
        enemy.label?.destroy();
        enemy.destroy();
        this._checkLevelEnd();
      },
    });
  }

  private _damageBlock(block: BlockSprite, damage: number) {
    if (!block.active) return;
    block.hp -= damage;
    this._emitParticles(block.x, block.y, 0xaaaaaa, 4);
    if (block.hp <= 0) {
      this.score += this.level.blockPoints;
      this.bus.emitScore(this.score);
      this._showFloatingText(block.x, block.y, `+${this.level.blockPoints}`, '#ffd700');
      this.tweens.add({
        targets: block,
        scaleX: 0, scaleY: 0,
        alpha: 0,
        angle: Phaser.Math.Between(-45, 45),
        duration: 250,
        onComplete: () => block.destroy(),
      });
    }
  }

  // ─── Hero lifecycle ──────────────────────────────────────────────────────

  private _heroLanded() {
    if (!this.heroLaunched) return;
    this.heroLaunched = false;
    this._stopTrail();

    // Clean up stale ability tap listener
    if (this.abilityTapHandler) {
      this.input.off('pointerdown', this.abilityTapHandler, this);
      this.abilityTapHandler = null;
    }

    if (this.currentHero && this.currentHero.active) {
      this.tweens.add({
        targets: this.currentHero,
        alpha: 0, scale: 0.3,
        duration: 300,
        onComplete: () => this.currentHero?.destroy(),
      });
    }
    this.currentHero = null;

    this.time.delayedCall(700, () => {
      if (this.levelOver) return;
      if (this.heroQueue.length === 0) {
        this._endLevel(false);
      } else {
        this._nextHero();
      }
    });
  }

  private _nextHero() {
    const id = this.heroQueue.shift();
    if (!id) return;
    this.currentHeroId = id;

    // Remove the first icon from HUD
    const icon = this.heroesRemaining.shift();
    icon?.destroy();

    const heroConf = HEROES[id];
    this.currentHero = this.physics.add.image(SLING_X, SLING_Y - 30, id + '_char');
    this.currentHero.setCircle(heroConf.radius, 0, 0);
    (this.currentHero.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Bounce-in animation
    this.currentHero.setScale(0);
    this.tweens.add({ targets: this.currentHero, scale: 1, duration: 250, ease: 'Back.Out' });

    this.heroLaunched = false;
    this.abilityUsed = false;
  }

  // ─── Level end ───────────────────────────────────────────────────────────

  private _checkLevelEnd() {
    if (this.levelOver) return;
    const aliveEnemies = this.enemies.getChildren().filter(e => (e as EnemySprite).active);
    if (aliveEnemies.length === 0) {
      this._endLevel(true);
    }
  }

  private _endLevel(won: boolean) {
    if (this.levelOver) return;
    this.levelOver = true;
    this._stopTrail();

    // Unused hero bonus
    if (won) {
      const bonus = this.heroQueue.length * this.level.unusedHeroBonus;
      this.score += bonus;
      if (bonus > 0) this._showFloatingText(GAME_W / 2, GAME_H / 2 - 60, `+${bonus} Bonus!`, '#ffd700');
    }

    this.bus.emitScore(this.score);

    // Persist best score and unlocks
    this._saveBest(this.level.id, this.score);
    if (won) this._unlockNext(this.level.id + 1);

    this.time.delayedCall(won ? 1200 : 600, () => {
      this.bus.emitGameOver(this.score, won);
    });
  }

  // ─── Level building ──────────────────────────────────────────────────────

  private _buildBlocks() {
    for (const def of this.level.blocks) {
      const blockCols: Record<string, number> = { wood: 0xa0522d, stone: 0x808080, gold: 0xffd700 };
      const cols = blockCols[def.type] ?? 0x808080;

      // Draw the block using a RenderTexture keyed by type+size
      const texKey = `blk_${def.type}_${def.w}_${def.h}`;
      if (!this.textures.exists(texKey)) {
        const g = this.add.graphics();
        g.fillStyle(cols, 1);
        g.fillRect(0, 0, def.w, def.h);
        g.lineStyle(2, Phaser.Display.Color.IntegerToColor(cols).darken(30).color, 1);
        g.strokeRect(1, 1, def.w - 2, def.h - 2);
        if (def.type === 'wood') {
          g.lineStyle(1, 0x6b3a1f, 0.4);
          for (let xi = 6; xi < def.w; xi += 10) g.lineBetween(xi, 0, xi - 6, def.h);
        }
        g.generateTexture(texKey, def.w, def.h);
        g.destroy();
      }

      const block = this.blocks.create(def.x, def.y, texKey) as BlockSprite;
      block.blockType = def.type;
      block.hp = def.type === 'gold' ? 5 : def.type === 'stone' ? 3 : 1;
      block.setAngle(def.angle ?? 0);
      block.refreshBody();
      (block.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    }
  }

  private _buildEnemies() {
    for (const def of this.level.enemies) {
      const enemy = this.enemies.create(def.x, def.y, def.type + '_enemy') as EnemySprite;
      enemy.hp = def.hp;
      enemy.maxHp = def.hp;
      enemy.isBoss = def.boss ?? false;
      enemy.enemyType = def.type;
      (enemy.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);

      // HP bar
      if (def.hp > 1) {
        enemy.hpBarBg = this.add.graphics().setDepth(10);
        enemy.hpBar    = this.add.graphics().setDepth(11);
      }

      // Boss label
      if (def.boss) {
        const names: Record<string, string> = {
          ravana: '☠ RAVANA',
          meghanada: '⚡ MEGHANADA',
          kumbhakarna: '💤 KUMBHAKARNA',
        };
        enemy.label = this.add.text(def.x, def.y - 60, names[def.type] ?? '👹 BOSS', {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#ff4444',
          stroke: '#000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(12);
        // Pulsing boss label
        this.tweens.add({ targets: enemy.label, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
      }
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  private _buildHud() {
    // Hero queue icons in upper-left
    const allHeroes = [this.currentHeroId, ...this.heroQueue].filter(Boolean) as HeroId[];
    allHeroes.forEach((id, i) => {
      const img = this.add.image(30 + i * 45, 30, id + '_char')
        .setScale(0.6)
        .setAlpha(i === 0 ? 1 : 0.55)
        .setDepth(20);
      this.heroesRemaining.push(img);
    });

    // Level title
    this.add.text(GAME_W / 2, 16, this.level.title, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);

    // Score display — store listener so it can be removed on scene shutdown
    const scoreTxt = this.add.text(GAME_W - 16, 14, 'Score: 0', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(20);
    this.scoreListener = (s: number) => { scoreTxt.setText(`Score: ${s}`); };
    this.bus.on('score', this.scoreListener);

    // Aim guide text
    const aimTxt = this.add.text(SLING_X, SLING_Y - 80, '← Drag to aim', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffd700',
    }).setAlpha(0.8).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: aimTxt, alpha: 0, duration: 500, yoyo: true, repeat: 3, delay: 1500,
      onComplete: () => aimTxt.destroy() });

    // Back button
    const backBtn = this.add.text(GAME_W - 10, GAME_H - 10, '✕ Menu', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    }).setOrigin(1, 1).setDepth(20).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('Menu', { bus: this.bus }));  }

  // ─── Visual helpers ──────────────────────────────────────────────────────

  private _drawBands() {
    this.bandLeft.clear();
    this.bandRight.clear();

    const forkL = new Phaser.Math.Vector2(SLING_X - 18, SLING_Y - 60);
    const forkR = new Phaser.Math.Vector2(SLING_X + 18, SLING_Y - 60);
    const heroPos = this.currentHero && !this.heroLaunched
      ? new Phaser.Math.Vector2(this.currentHero.x, this.currentHero.y)
      : new Phaser.Math.Vector2(SLING_X, SLING_Y - 30);

    this.bandLeft.lineStyle(4, 0x4a2500, 1);
    this.bandLeft.lineBetween(forkL.x, forkL.y, heroPos.x, heroPos.y);
    this.bandRight.lineStyle(4, 0x4a2500, 1);
    this.bandRight.lineBetween(forkR.x, forkR.y, heroPos.x, heroPos.y);
  }

  private _drawTrajectory() {
    if (!this.dragCurrent) return;
    this._clearTrajectory();

    const startX = SLING_X;
    const startY = SLING_Y - 30;
    const vx = -this.dragCurrent.x * LAUNCH_POWER * HEROES[this.currentHeroId!].powerFactor;
    const vy = -this.dragCurrent.y * LAUNCH_POWER * HEROES[this.currentHeroId!].powerFactor;
    const g = GRAVITY * 0.8 * 0.001; // pixels per ms²

    for (let i = 1; i <= 18; i++) {
      const t = i * 60; // ms
      const x = startX + vx * t * 0.001;
      const y = startY + vy * t * 0.001 + 0.5 * g * t * t;
      const dot = this.add.circle(x, y, 3, 0xffffff, 0.6 - i * 0.03);
      dot.setDepth(7);
      this.trajectoryDots.push(dot);
    }
  }

  private _clearTrajectory() {
    this.trajectoryDots.forEach(d => d.destroy());
    this.trajectoryDots = [];
  }

  private _startTrail() {
    this.trailTimer = this.time.addEvent({
      delay: 40,
      repeat: -1,
      callback: () => {
        if (!this.currentHero || !this.currentHero.active) return;
        const heroConf = HEROES[this.currentHeroId!];
        const p = this.add.circle(this.currentHero.x, this.currentHero.y, 6, heroConf.color, 0.7).setDepth(4);
        this.tweens.add({ targets: p, alpha: 0, scale: 0.2, duration: 300, onComplete: () => p.destroy() });
      },
    });
  }

  private _stopTrail() {
    this.trailTimer?.remove();
  }

  private _emitParticles(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 200);
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 8), color).setDepth(15);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0, scale: 0.1,
        duration: Phaser.Math.Between(250, 450),
        ease: 'Cubic.Out',
        onComplete: () => p.destroy(),
      });
    }
  }

  private _showFloatingText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t,
      y: y - 60, alpha: 0,
      duration: 900,
      ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  private _showAbilityHint(ability: string) {
    const t = this.add.text(GAME_W / 2, GAME_H - 30, `TAP: ${ability}`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 3,
      backgroundColor: '#00000066',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      alpha: 0,
      duration: 300,
      delay: 1800,
      onComplete: () => t.destroy(),
    });
  }

  private _flashHero(hero: Phaser.Physics.Arcade.Image) {
    this.tweens.add({
      targets: hero,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
      repeat: 3,
    });
  }

  private _showStoryBanner() {
    const bg = this.add.graphics().setDepth(50);
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(GAME_W / 2 - 320, GAME_H / 2 - 60, 640, 120, 16);

    this.add.text(GAME_W / 2, GAME_H / 2 - 30, this.level.title, {
      fontFamily: 'Georgia, serif',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(51);

    this.add.text(GAME_W / 2, GAME_H / 2 + 10, this.level.story, {
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(51);

    this.time.delayedCall(2800, () => {
      this.tweens.add({ targets: [bg], alpha: 0, duration: 400, onComplete: () => bg.destroy() });
    });
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private _saveBest(levelId: number, score: number) {
    try {
      const key = `ramayana_best_${levelId}`;
      const prev = parseInt(localStorage.getItem(key) ?? '0', 10);
      if (score > prev) localStorage.setItem(key, String(score));
    } catch { /* ignore */ }
  }

  private _unlockNext(nextId: number) {
    try {
      const raw = localStorage.getItem('ramayana_unlocked');
      const arr: number[] = raw ? JSON.parse(raw) : [1];
      if (!arr.includes(nextId)) {
        arr.push(nextId);
        localStorage.setItem('ramayana_unlocked', JSON.stringify(arr));
      }
    } catch { /* ignore */ }
  }

  // ─── Lifecycle cleanup ────────────────────────────────────────────────────

  shutdown() {
    // Remove bus listener to prevent accumulation on scene restarts
    if (this.scoreListener) {
      this.bus?.off('score', this.scoreListener);
      this.scoreListener = null;
    }
    // Remove stale ability tap listener if scene shuts down mid-flight
    if (this.abilityTapHandler) {
      this.input.off('pointerdown', this.abilityTapHandler, this);
      this.abilityTapHandler = null;
    }
    this._stopTrail();
  }
}
