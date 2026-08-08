/** Ramayana: Arrows of Dharma — game constants */

export const GAME_W = 960;
export const GAME_H = 540;

export const GRAVITY = 800;

/** Characters that can be used as projectiles */
export type HeroId = 'ram' | 'lakshman' | 'hanuman' | 'jatayu' | 'sita';

export interface HeroConfig {
  id: HeroId;
  name: string;
  color: number;
  bodyColor: number;
  /** Radius of the projectile circle */
  radius: number;
  /** Special ability description */
  ability: string;
  /** Mass multiplier (heavier = more knockback) */
  mass: number;
  /** Extra velocity boost factor on launch */
  powerFactor: number;
}

export const HEROES: Record<HeroId, HeroConfig> = {
  ram: {
    id: 'ram',
    name: 'Ram',
    color: 0x3a86ff,       // blue for bow-wielder
    bodyColor: 0xffd166,
    radius: 20,
    ability: 'Triple Arrow – splits into 3 on tap',
    mass: 1.0,
    powerFactor: 1.0,
  },
  lakshman: {
    id: 'lakshman',
    name: 'Lakshman',
    color: 0x06d6a0,       // teal
    bodyColor: 0xffd166,
    radius: 19,
    ability: 'Piercing Shot – passes through one block',
    mass: 1.0,
    powerFactor: 1.1,
  },
  hanuman: {
    id: 'hanuman',
    name: 'Hanuman',
    color: 0xff6b35,       // orange
    bodyColor: 0xd4a574,
    radius: 24,
    ability: 'Slam – doubles size and damage on tap',
    mass: 2.2,
    powerFactor: 0.9,
  },
  jatayu: {
    id: 'jatayu',
    name: 'Jatayu',
    color: 0x8338ec,       // purple (eagle)
    bodyColor: 0xc77dff,
    radius: 22,
    ability: 'Dive – nosedives downward on tap',
    mass: 1.4,
    powerFactor: 1.05,
  },
  sita: {
    id: 'sita',
    name: 'Sita',
    color: 0xef476f,       // pink
    bodyColor: 0xffd166,
    radius: 18,
    ability: 'Bloom – explodes in a wide radial burst',
    mass: 0.9,
    powerFactor: 1.15,
  },
};

export interface LevelConfig {
  id: number;
  title: string;
  subtitle: string;
  story: string;
  heroes: HeroId[];      // queue of projectiles (in order)
  enemies: EnemyDef[];
  blocks: BlockDef[];
  bgKey: string;
  /** Score threshold to clear the level */
  clearScore: number;
  /** Points per enemy */
  enemyPoints: number;
  /** Points per block destroyed */
  blockPoints: number;
  /** Bonus points per remaining hero */
  unusedHeroBonus: number;
}

export type EnemyType = 'demon' | 'ravana' | 'rakshasa' | 'meghanada' | 'kumbhakarna';

export interface EnemyDef {
  x: number; y: number;
  type: EnemyType;
  hp: number;
  /** If true this must be killed to clear the level */
  boss?: boolean;
}

export type BlockType = 'wood' | 'stone' | 'gold';

export interface BlockDef {
  x: number; y: number;
  w: number; h: number;
  type: BlockType;
  angle?: number;   // degrees
}

// ─── Level 1: Building the Bridge (Ram Setu) ────────────────────────────────
// Scene: Hanuman & the Vanara army build Ram Setu, Demon guards must be cleared.
// Enemies are demon sentinels blocking the bridge construction.
// ─────────────────────────────────────────────────────────────────────────────
const L1_ENEMIES: EnemyDef[] = [
  { x: 620, y: 390, type: 'demon', hp: 1 },
  { x: 670, y: 390, type: 'demon', hp: 1 },
  { x: 720, y: 390, type: 'demon', hp: 1 },
  { x: 780, y: 390, type: 'demon', hp: 2 },
  { x: 840, y: 390, type: 'demon', hp: 1 },
  { x: 790, y: 300, type: 'rakshasa', hp: 2 },
];

const L1_BLOCKS: BlockDef[] = [
  // Ground platform
  { x: 590, y: 420, w: 80, h: 20, type: 'wood' },
  { x: 650, y: 420, w: 60, h: 20, type: 'wood' },
  { x: 710, y: 420, w: 60, h: 20, type: 'stone' },
  { x: 770, y: 420, w: 60, h: 20, type: 'stone' },
  { x: 830, y: 420, w: 80, h: 20, type: 'stone' },
  // Tower for rakshasa
  { x: 780, y: 390, w: 20, h: 50, type: 'wood' },
  { x: 800, y: 390, w: 20, h: 50, type: 'wood' },
  { x: 790, y: 340, w: 60, h: 20, type: 'stone' },
];

// ─── Level 2: Ashok Vatika ───────────────────────────────────────────────────
// Hanuman in Lanka, destroying Ravana's garden + defeating guards to find Sita.
// ─────────────────────────────────────────────────────────────────────────────
const L2_ENEMIES: EnemyDef[] = [
  { x: 600, y: 390, type: 'demon', hp: 1 },
  { x: 660, y: 390, type: 'demon', hp: 1 },
  { x: 720, y: 390, type: 'demon', hp: 1 },
  { x: 750, y: 300, type: 'rakshasa', hp: 3 },
  { x: 820, y: 390, type: 'demon', hp: 2 },
  { x: 870, y: 390, type: 'rakshasa', hp: 2 },
  { x: 850, y: 250, type: 'meghanada', hp: 3, boss: true },
];

const L2_BLOCKS: BlockDef[] = [
  // Platform tiers
  { x: 580, y: 420, w: 100, h: 20, type: 'wood' },
  { x: 680, y: 420, w: 80,  h: 20, type: 'wood' },
  { x: 760, y: 420, w: 80,  h: 20, type: 'stone' },
  { x: 840, y: 420, w: 80,  h: 20, type: 'stone' },
  // Walls
  { x: 640, y: 380, w: 20, h: 60, type: 'wood' },
  { x: 700, y: 380, w: 20, h: 60, type: 'wood' },
  // Upper platform
  { x: 730, y: 320, w: 80, h: 20, type: 'stone' },
  { x: 720, y: 310, w: 20, h: 30, type: 'wood' },
  { x: 790, y: 310, w: 20, h: 30, type: 'wood' },
  // Meghanada tower
  { x: 820, y: 380, w: 20, h: 60, type: 'gold' },
  { x: 875, y: 380, w: 20, h: 60, type: 'gold' },
  { x: 840, y: 270, w: 75, h: 20, type: 'gold' },
];

// ─── Level 3: The Final Battle – Ram vs Ravana ───────────────────────────────
// On the battlefield of Lanka. Defeat Ravana (multi-head boss).
// ─────────────────────────────────────────────────────────────────────────────
const L3_ENEMIES: EnemyDef[] = [
  { x: 600, y: 390, type: 'demon', hp: 2 },
  { x: 650, y: 390, type: 'demon', hp: 2 },
  { x: 700, y: 390, type: 'kumbhakarna', hp: 5 },
  { x: 780, y: 390, type: 'demon', hp: 2 },
  { x: 830, y: 390, type: 'rakshasa', hp: 3 },
  { x: 880, y: 390, type: 'rakshasa', hp: 3 },
  { x: 840, y: 240, type: 'ravana', hp: 10, boss: true },
];

const L3_BLOCKS: BlockDef[] = [
  // Ground tier
  { x: 580, y: 420, w: 80, h: 20, type: 'stone' },
  { x: 660, y: 420, w: 80, h: 20, type: 'stone' },
  { x: 740, y: 420, w: 80, h: 20, type: 'gold' },
  { x: 820, y: 420, w: 80, h: 20, type: 'gold' },
  // Kumbhakarna fortress
  { x: 680, y: 380, w: 20, h: 60, type: 'gold' },
  { x: 720, y: 380, w: 20, h: 60, type: 'gold' },
  { x: 690, y: 360, w: 70, h: 20, type: 'gold' },
  // Ravana throne tower
  { x: 810, y: 380, w: 20, h: 80, type: 'gold' },
  { x: 870, y: 380, w: 20, h: 80, type: 'gold' },
  { x: 820, y: 300, w: 90, h: 20, type: 'gold' },
  { x: 825, y: 275, w: 20, h: 50, type: 'gold' },
  { x: 860, y: 275, w: 20, h: 50, type: 'gold' },
  { x: 830, y: 260, w: 55, h: 20, type: 'gold' },
];

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    title: 'Ram Setu',
    subtitle: 'Clear the demon guards!',
    story: 'Ram\'s army prepares to build the bridge to Lanka.\nDemon sentinels stand in the way — defeat them!',
    heroes: ['ram', 'ram', 'lakshman', 'hanuman', 'hanuman'],
    enemies: L1_ENEMIES,
    blocks: L1_BLOCKS,
    bgKey: 'bg1',
    clearScore: 500,
    enemyPoints: 100,
    blockPoints: 20,
    unusedHeroBonus: 50,
  },
  {
    id: 2,
    title: 'Ashok Vatika',
    subtitle: 'Destroy the garden, defeat Meghanada!',
    story: 'Hanuman has entered Lanka! He burns the ashok garden\nand battles Ravana\'s son Meghanada. Stop them all!',
    heroes: ['hanuman', 'hanuman', 'ram', 'lakshman', 'jatayu', 'hanuman'],
    enemies: L2_ENEMIES,
    blocks: L2_BLOCKS,
    bgKey: 'bg2',
    clearScore: 800,
    enemyPoints: 150,
    blockPoints: 25,
    unusedHeroBonus: 75,
  },
  {
    id: 3,
    title: 'Battle of Lanka',
    subtitle: 'Defeat Ravana — the ten-headed king!',
    story: 'The great war begins! Ram faces Ravana on the\nbattlefield of Lanka. Victory means Sita\'s freedom!',
    heroes: ['ram', 'lakshman', 'hanuman', 'ram', 'sita', 'lakshman', 'jatayu'],
    enemies: L3_ENEMIES,
    blocks: L3_BLOCKS,
    bgKey: 'bg3',
    clearScore: 1500,
    enemyPoints: 200,
    blockPoints: 30,
    unusedHeroBonus: 100,
  },
];
