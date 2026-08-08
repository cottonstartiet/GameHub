import type { ComponentType } from 'react';

export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  /** Emoji/glyph shown on the app icon. */
  glyph: string;
  /** Gradient accent for the app icon (CSS colors). */
  accentFrom: string;
  accentTo: string;
  available: boolean;
  /** Lazy loader so a game's engine (Phaser) is only fetched when opened. */
  load?: () => Promise<{ default: ComponentType }>;
}

/* The registry drives the landing-page app-icon grid and game routing.
   Add future games here (2D or 3D) and they appear on the hub automatically. */
export const GAMES: GameMeta[] = [
  {
    id: 'snake',
    title: 'Snake',
    tagline: '5 levels · 3 speeds',
    glyph: '🐍',
    accentFrom: 'var(--gh-triangle)',
    accentTo: 'var(--gh-blue)',
    available: true,
    load: () => import('./snake/Snake'),
  },
  {
    id: 'maths-trail',
    title: 'Maths Trail',
    tagline: '30 levels · pet pal',
    glyph: '🧮',
    accentFrom: 'var(--gh-warn)',
    accentTo: 'var(--gh-circle)',
    available: true,
    load: () => import('./maths/MathsGame'),
  },
  {
    id: 'ramayana',
    title: 'Ramayana',
    tagline: '3 levels · Angry Birds style',
    glyph: '🏹',
    accentFrom: '#ffd700',
    accentTo: '#8b0000',
    available: true,
    load: () => import('./ramayana/Ramayana'),
  },
  {
    id: 'coming-soon',
    title: 'More soon',
    tagline: 'New games incoming',
    glyph: '✨',
    accentFrom: 'var(--gh-square)',
    accentTo: 'var(--gh-circle)',
    available: false,
  },
];

export function getGame(id: string | undefined): GameMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
