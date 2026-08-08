/**
 * MenuScene — level select and character preview for Ramayana game.
 */
import Phaser from 'phaser';
import { GAME_W, GAME_H, LEVELS, HEROES } from '../constants';
import type { GameEventBus } from '../../eventBus';

export default class MenuScene extends Phaser.Scene {
  private bus!: GameEventBus;

  constructor() { super('Menu'); }

  init(data: { bus?: GameEventBus }) {
    this.bus = data.bus ?? this.game.registry.get('bus');
  }

  create() {
    // Background
    this.add.image(GAME_W / 2, GAME_H / 2, 'bg1').setDisplaySize(GAME_W, GAME_H).setAlpha(0.7);

    // Dark overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_W, GAME_H);

    // Title
    this.add.text(GAME_W / 2, 50, '🏹 Ramayana', {
      fontFamily: 'Georgia, serif',
      fontSize: '48px',
      color: '#ffd700',
      stroke: '#8b0000',
      strokeThickness: 6,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 100, 'Arrows of Dharma', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffeaa7',
      stroke: '#333',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Level cards
    const unlocked: number[] = this._getUnlocked();
    LEVELS.forEach((lvl, i) => {
      const x = GAME_W / 2 + (i - 1) * 240;
      const y = GAME_H / 2 - 10;
      const isUnlocked = unlocked.includes(lvl.id);
      this._makeCard(x, y, lvl.id, lvl.title, lvl.subtitle, isUnlocked);
    });

    // Character preview strip
    this.add.text(GAME_W / 2, GAME_H - 105, 'Your Heroes', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#ffd700',
    }).setOrigin(0.5);

    const heroIds = Object.keys(HEROES) as (keyof typeof HEROES)[];
    heroIds.forEach((id, i) => {
      const hero = HEROES[id];
      const x = GAME_W / 2 + (i - 2) * 100;
      const y = GAME_H - 55;
      this.add.image(x, y, id + '_char').setScale(0.85);
      this.add.text(x, y + 22, hero.name, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#ffffff',
      }).setOrigin(0.5);
    });

    // Tagline
    this.add.text(GAME_W / 2, GAME_H - 12, 'Swipe to aim · Release to fire · Tap in-flight for special ability', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
  }

  private _makeCard(
    x: number, y: number, levelId: number,
    title: string, subtitle: string, unlocked: boolean
  ) {
    const w = 200, h = 200;
    const card = this.add.graphics();
    if (unlocked) {
      card.fillStyle(0xffd700, 0.15);
      card.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      card.lineStyle(2, 0xffd700, 0.8);
      card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    } else {
      card.fillStyle(0x333333, 0.6);
      card.fillRoundedRect(x - w / 2, y - h / 2, w, h, 16);
      card.lineStyle(2, 0x555555, 0.5);
      card.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 16);
    }

    this.add.text(x, y - 60, `Level ${levelId}`, {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: unlocked ? '#ffd700' : '#666666',
    }).setOrigin(0.5);

    this.add.text(x, y - 30, title, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: unlocked ? '#ffffff' : '#555555',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.add.text(x, y + 0, subtitle, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: unlocked ? '#ffeaa7' : '#444444',
      wordWrap: { width: w - 20 },
      align: 'center',
    }).setOrigin(0.5);

    const bestScore = this._getBest(levelId);
    if (bestScore > 0) {
      this.add.text(x, y + 38, `Best: ${bestScore}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffd700',
      }).setOrigin(0.5);
    }

    const btn = this.add.graphics();
    if (unlocked) {
      btn.fillStyle(0xffd700, 1);
      btn.fillRoundedRect(x - 50, y + 60, 100, 36, 10);
      const btnText = this.add.text(x, y + 78, '▶ Play', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#8b0000',
      }).setOrigin(0.5).setInteractive();

      btnText.on('pointerover', () => {
        btn.clear();
        btn.fillStyle(0xffaa00, 1);
        btn.fillRoundedRect(x - 50, y + 60, 100, 36, 10);
      });
      btnText.on('pointerout', () => {
        btn.clear();
        btn.fillStyle(0xffd700, 1);
        btn.fillRoundedRect(x - 50, y + 60, 100, 36, 10);
      });
      btnText.on('pointerdown', () => {
        this.scene.start('Game', { levelId, bus: this.bus });
      });

      // Also make the whole card clickable
      const zone = this.add.zone(x, y, w, h).setInteractive();
      zone.on('pointerdown', () => {
        this.scene.start('Game', { levelId, bus: this.bus });
      });
    } else {
      this.add.text(x, y + 78, '🔒 Locked', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#555555',
      }).setOrigin(0.5);
    }
  }

  private _getUnlocked(): number[] {
    try {
      const raw = localStorage.getItem('ramayana_unlocked');
      if (raw) return JSON.parse(raw) as number[];
    } catch { /* ignore */ }
    return [1];
  }

  private _getBest(levelId: number): number {
    try {
      const raw = localStorage.getItem(`ramayana_best_${levelId}`);
      if (raw) return parseInt(raw, 10);
    } catch { /* ignore */ }
    return 0;
  }
}
