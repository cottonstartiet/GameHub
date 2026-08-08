/**
 * BootScene — generates all game assets programmatically using Phaser graphics.
 * No external image files needed.
 */
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../constants';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // Progress bar
    const bar = this.add.graphics();
    bar.fillStyle(0x3a86ff, 1);
    bar.fillRect(GAME_W / 2 - 200, GAME_H / 2 - 8, 0, 16);

    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.fillStyle(0x1a1a2e, 1);
      bar.fillRect(GAME_W / 2 - 202, GAME_H / 2 - 10, 404, 20);
      bar.fillStyle(0x3a86ff, 1);
      bar.fillRect(GAME_W / 2 - 200, GAME_H / 2 - 8, 400 * v, 16);
    });
  }

  create() {
    this._generateTextures();
    const bus = this.game.registry.get('bus');
    this.scene.start('Menu', { bus });
  }

  private _generateTextures() {
    this._makeBg('bg1', 0x87ceeb, 0x228b22, 0x1e90ff); // sky, green, ocean
    this._makeBg('bg_setu', 0x8dd8ff, 0x2e8b57, 0x4682b4); // level 1 calm bridge coast
    this._makeBg('bg2', 0xff7043, 0x4a148c, 0xffd54f); // burning sky, purple, gold
    this._makeBg('bg3', 0x1a1a2e, 0x8b0000, 0xff6b35);  // dark war sky

    this._makeBlock('wood',  0xa0522d, 0x8b4513);
    this._makeBlock('stone', 0x808080, 0x696969);
    this._makeBlock('gold',  0xffd700, 0xb8860b);

    this._makeCharTex('ram',      0x3a86ff, 0xffd166, false, false);
    this._makeCharTex('lakshman', 0x06d6a0, 0xffd166, false, false);
    this._makeCharTex('hanuman',  0xff6b35, 0xd4a574, true,  false);
    this._makeCharTex('jatayu',   0x8338ec, 0xc77dff, false, true);
    this._makeCharTex('sita',     0xef476f, 0xffd166, false, false);

    this._makeEnemyTex('demon',       0x4a0000, 0xff0000, 1);
    this._makeEnemyTex('rakshasa',    0x5c0020, 0xff4500, 1.3);
    this._makeEnemyTex('meghanada',   0x3a0060, 0xcc44ff, 1.5);
    this._makeEnemyTex('kumbhakarna', 0x2d2d00, 0xff8c00, 2.0);
    this._makeEnemyTex('ravana',      0x1a0000, 0xff0000, 2.5);

    this._makeSlingshotTex();
    this._makeParticleTex();
    this._makePig(); // generic "hit" marker
  }

  /** Layered parallax background */
  private _makeBg(key: string, skyColor: number, groundColor: number, accentColor: number) {
    const rt = this.add.renderTexture(0, 0, GAME_W, GAME_H);

    // Sky gradient via horizontal strips
    const g = this.add.graphics();
    for (let y = 0; y < GAME_H * 0.65; y++) {
      const t = y / (GAME_H * 0.65);
      const r = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(skyColor),
        Phaser.Display.Color.IntegerToColor(0xffffff),
        100,
        Math.round(t * 100)
      );
      g.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b), 1);
      g.fillRect(0, y, GAME_W, 1);
    }
    rt.draw(g, 0, 0);
    g.destroy();

    // Sun / moon decoration
    const sun = this.add.graphics();
    if (key === 'bg3') {
      sun.fillStyle(0xff4500, 0.7);
      sun.fillCircle(GAME_W * 0.75, 80, 60);
      sun.fillStyle(0xff6b35, 0.4);
      sun.fillCircle(GAME_W * 0.75, 80, 80);
    } else {
      sun.fillStyle(0xfff176, 0.9);
      sun.fillCircle(GAME_W * 0.8, 70, 50);
      sun.fillStyle(0xffffff, 0.3);
      sun.fillCircle(GAME_W * 0.8, 70, 65);
    }
    rt.draw(sun, 0, 0);
    sun.destroy();

    // Mountains / silhouettes
    const hills = this.add.graphics();
    hills.fillStyle(accentColor, 0.35);
    hills.fillTriangle(0, GAME_H * 0.55, 200, GAME_H * 0.25, 400, GAME_H * 0.55);
    hills.fillTriangle(250, GAME_H * 0.55, 500, GAME_H * 0.18, 750, GAME_H * 0.55);
    hills.fillTriangle(550, GAME_H * 0.55, GAME_W, GAME_H * 0.30, GAME_W + 100, GAME_H * 0.55);
    rt.draw(hills, 0, 0);
    hills.destroy();

    // Ground
    const gnd = this.add.graphics();
    gnd.fillStyle(groundColor, 1);
    gnd.fillRect(0, GAME_H * 0.78, GAME_W, GAME_H * 0.22);
    // Grass/texture strip
    gnd.fillStyle(Phaser.Display.Color.ValueToColor(
      (key === 'bg1' || key === 'bg_setu') ? '#2ecc71' : key === 'bg2' ? '#ff7043' : '#8b0000'
    ).color, 1);
    gnd.fillRect(0, GAME_H * 0.78, GAME_W, 12);
    rt.draw(gnd, 0, 0);
    gnd.destroy();

    rt.saveTexture(key);
    rt.destroy();
  }

  /** 1×1 pixel block tile that gets scaled */
  private _makeBlock(key: string, fillColor: number, strokeColor: number) {
    const size = 40;
    const g = this.add.graphics();
    g.fillStyle(fillColor, 1);
    g.fillRect(0, 0, size, size);
    g.lineStyle(2, strokeColor, 1);
    g.strokeRect(1, 1, size - 2, size - 2);
    // wood grain for wood
    if (key === 'wood') {
      g.lineStyle(1, strokeColor, 0.4);
      for (let i = 4; i < size; i += 8) g.lineBetween(i, 0, i - 4, size);
    }
    // stone cracks
    if (key === 'stone') {
      g.lineStyle(1, 0x404040, 0.5);
      g.lineBetween(5, 10, 15, 25); g.lineBetween(25, 5, 35, 20);
    }
    g.generateTexture(key + '_block', size, size);
    g.destroy();
  }

  /** Character texture */
  private _makeCharTex(
    id: string, color: number, skinColor: number,
    isMonkey: boolean, isBird: boolean
  ) {
    const r = id === 'hanuman' ? 24 : id === 'jatayu' ? 22 : id === 'sita' ? 18 : 20;
    const size = (r + 10) * 2;
    const g = this.add.graphics();
    const cx = size / 2;
    const cy = size / 2 + 2;

    g.fillStyle(color, 0.2);
    g.fillCircle(cx, cy, r + 6);

    if (isBird) {
      // Jatayu (bird warrior)
      g.fillStyle(0x5b3a29, 1);
      g.fillEllipse(cx, cy + 4, 24, 30); // torso
      g.fillStyle(0xffffff, 1);
      g.fillEllipse(cx + 2, cy - 12, 18, 16); // head
      g.fillStyle(color, 0.9);
      g.fillTriangle(cx - 12, cy - 4, cx - 30, cy - 18, cx - 28, cy + 8); // left wing
      g.fillTriangle(cx + 12, cy - 4, cx + 30, cy - 18, cx + 28, cy + 8); // right wing
      g.fillStyle(0xf4a300, 1);
      g.fillTriangle(cx + 9, cy - 11, cx + 26, cy - 8, cx + 9, cy - 4); // beak
      g.fillStyle(0x111111, 1);
      g.fillCircle(cx - 1, cy - 13, 2.2);
      g.fillCircle(cx + 5, cy - 13, 2.2);
      g.lineStyle(2, 0xd4af37, 1);
      g.lineBetween(cx - 2, cy + 10, cx - 6, cy + 20); // claw 1
      g.lineBetween(cx + 3, cy + 10, cx + 7, cy + 20); // claw 2
      g.fillStyle(0xd4af37, 1);
      g.fillTriangle(cx - 4, cy - 22, cx, cy - 29, cx + 4, cy - 22); // warrior crest
    } else if (isMonkey) {
      // Hanuman
      g.fillStyle(0xd89d6b, 1);
      g.fillCircle(cx, cy - 11, 11); // face
      g.fillStyle(color, 1);
      g.fillRoundedRect(cx - 11, cy - 2, 22, 26, 8); // body
      g.fillStyle(0x111111, 1);
      g.fillCircle(cx - 4, cy - 13, 2);
      g.fillCircle(cx + 4, cy - 13, 2);
      g.lineStyle(2, 0x222222, 1);
      g.beginPath();
      g.arc(cx, cy - 8, 4, 0.25, Math.PI - 0.25);
      g.strokePath();
      g.lineStyle(4, 0xffd700, 1);
      g.lineBetween(cx + 12, cy - 10, cx + 25, cy - 20); // gada handle
      g.fillStyle(0xffd700, 1);
      g.fillCircle(cx + 27, cy - 22, 5); // gada head
      g.lineStyle(3, color, 0.8);
      g.beginPath();
      g.arc(cx + 14, cy + 15, 10, -0.3, Math.PI * 1.1, false); // tail
      g.strokePath();
    } else {
      // Human form base (Ram / Lakshman / Sita)
      const robe = id === 'sita' ? 0xd94b7f : color;
      const sash = id === 'ram' ? 0xffd700 : id === 'lakshman' ? 0xe8f18b : 0xf9c3d7;

      g.fillStyle(0x3b2a1d, 1);
      g.fillRoundedRect(cx - 9, cy + 16, 18, 12, 4); // feet
      g.fillStyle(robe, 1);
      g.fillRoundedRect(cx - 12, cy - 2, 24, 28, 9); // torso/robe
      g.fillStyle(sash, 1);
      g.fillRoundedRect(cx - 5, cy - 1, 10, 24, 4); // center sash
      g.fillStyle(skinColor, 1);
      g.fillCircle(cx, cy - 14, 10); // head
      g.fillStyle(0x2f1f14, 1);
      g.fillEllipse(cx, cy - 20, 16, 8); // hair
      g.fillStyle(0x111111, 1);
      g.fillCircle(cx - 3, cy - 15, 1.8);
      g.fillCircle(cx + 3, cy - 15, 1.8);
      g.lineStyle(1.5, 0x553322, 1);
      g.lineBetween(cx - 2, cy - 11, cx + 2, cy - 11); // mouth

      g.lineStyle(5, robe, 1);
      g.lineBetween(cx - 9, cy + 4, cx - 15, cy + 14); // arm left
      g.lineBetween(cx + 9, cy + 4, cx + 15, cy + 14); // arm right

      if (id === 'sita') {
        g.fillStyle(0xb21f4b, 1);
        g.fillCircle(cx, cy - 16, 2); // bindi
        g.fillStyle(0xffd700, 1);
        g.fillTriangle(cx - 4, cy - 24, cx, cy - 30, cx + 4, cy - 24); // head ornament
      } else {
        g.fillStyle(0xffd700, 1);
        g.fillRect(cx - 7, cy - 27, 14, 4); // crown band
        g.fillTriangle(cx - 6, cy - 23, cx - 3, cy - 30, cx, cy - 23);
        g.fillTriangle(cx, cy - 23, cx + 3, cy - 31, cx + 6, cy - 23);

        if (id === 'ram') {
          g.lineStyle(2.5, 0x8b5a2b, 1);
          g.beginPath();
          g.arc(cx + 18, cy - 6, 10, -Math.PI / 2, Math.PI / 2);
          g.strokePath();
          g.lineStyle(1.2, 0xf2f2f2, 1);
          g.lineBetween(cx + 18, cy - 16, cx + 18, cy + 4); // bow string
        } else if (id === 'lakshman') {
          g.fillStyle(0xc0c0c0, 1);
          g.fillRect(cx + 14, cy - 14, 3, 20); // sword blade
          g.fillStyle(0xffd700, 1);
          g.fillRect(cx + 12, cy - 2, 7, 3); // hilt
        }
      }
    }

    g.generateTexture(id + '_char', size, size);
    g.destroy();
  }

  /** Enemy texture */
  private _makeEnemyTex(id: string, color: number, eyeColor: number, scale: number) {
    const base = 22;
    const r = Math.round(base * scale);
    const size = (r + 6) * 2;
    const g = this.add.graphics();
    const cx = size / 2, cy = size / 2;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, cy + r + 3, r * 1.8, r * 0.4);

    // Body
    g.fillStyle(color, 1);
    g.fillCircle(cx, cy, r);
    g.lineStyle(3, eyeColor, 0.8);
    g.strokeCircle(cx, cy, r);

    // Horns
    g.fillStyle(eyeColor, 1);
    g.fillTriangle(cx - r * 0.5, cy - r + 4, cx - r * 0.3, cy - r - 14, cx - r * 0.1, cy - r + 2);
    g.fillTriangle(cx + r * 0.1, cy - r + 2, cx + r * 0.3, cy - r - 14, cx + r * 0.5, cy - r + 4);

    // Ravana: 10 heads indicator (crown)
    if (id === 'ravana') {
      g.fillStyle(0xffd700, 1);
      for (let i = -4; i <= 4; i += 2) {
        const hx = cx + i * (r / 5);
        const hy = cy - r + 2;
        g.fillTriangle(hx - 3, hy, hx, hy - 10 - Math.abs(i), hx + 3, hy);
      }
    }

    // Eyes
    g.fillStyle(eyeColor, 1);
    g.fillEllipse(cx - r * 0.35, cy - 5, r * 0.3, r * 0.4);
    g.fillEllipse(cx + r * 0.35, cy - 5, r * 0.3, r * 0.4);
    g.fillStyle(0x000000, 1);
    g.fillCircle(cx - r * 0.35, cy - 5, r * 0.12);
    g.fillCircle(cx + r * 0.35, cy - 5, r * 0.12);

    // Angry mouth
    g.lineStyle(2, eyeColor, 1);
    g.beginPath();
    g.arc(cx, cy + r * 0.3, r * 0.25, 0.1, Math.PI - 0.1);
    g.strokePath();

    // HP bar background (visual only)
    if (id === 'kumbhakarna' || id === 'ravana') {
      g.fillStyle(0x000000, 0.5);
      g.fillRect(cx - r, cy + r + 6, r * 2, 5);
      g.fillStyle(0xff4444, 1);
      g.fillRect(cx - r, cy + r + 6, r * 2, 5);
    }

    g.generateTexture(id + '_enemy', size, size);
    g.destroy();
  }

  /** Slingshot texture */
  private _makeSlingshotTex() {
    const w = 60, h = 100;
    const g = this.add.graphics();
    // Post
    g.fillStyle(0x6d3b1e, 1);
    g.fillRect(22, 40, 16, 60);
    // Y fork left
    g.lineStyle(12, 0x8b4513, 1);
    g.lineBetween(30, 40, 10, 10);
    // Y fork right
    g.lineBetween(30, 40, 50, 10);
    // Band hints
    g.lineStyle(3, 0x333333, 0.6);
    g.lineBetween(10, 10, 30, 50);
    g.lineBetween(50, 10, 30, 50);
    g.generateTexture('slingshot', w, h);
    g.destroy();
  }

  /** Small particle/star for explosions */
  private _makeParticleTex() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('particle', 16, 16);
    g.destroy();
  }

  /** Generic "defeated" pig-placeholder glyph */
  private _makePig() {
    const g = this.add.graphics();
    g.fillStyle(0x555555, 0.5);
    g.fillCircle(12, 12, 10);
    g.lineStyle(2, 0xffffff, 0.7);
    g.lineBetween(6, 8, 10, 12); g.lineBetween(10, 8, 6, 12); // X eyes
    g.lineBetween(14, 8, 18, 12); g.lineBetween(18, 8, 14, 12);
    g.generateTexture('defeated', 24, 24);
    g.destroy();
  }
}
