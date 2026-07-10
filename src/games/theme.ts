/* Reads the shared CSS theme tokens (see src/theme/theme.css) and exposes them
   as Phaser-friendly numeric colors so every game inherits the same base theme. */

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** Convert a `#rrggbb` string to a Phaser color number (0xrrggbb). */
function toHexNumber(color: string): number {
  const hex = color.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  return parseInt(full, 16) || 0x000000;
}

export interface GameTheme {
  bg: number;
  bgCss: string;
  surface: number;
  blue: number;
  blueGlow: number;
  triangle: number;
  circle: number;
  cross: number;
  square: number;
  text: string;
  textDim: string;
  good: number;
  bad: number;
}

export function getGameTheme(): GameTheme {
  return {
    bg: toHexNumber(cssVar('--gh-bg', '#0a0f2c')),
    bgCss: cssVar('--gh-bg', '#0a0f2c'),
    surface: toHexNumber(cssVar('--gh-surface', '#171f4d')),
    blue: toHexNumber(cssVar('--gh-blue', '#0070d1')),
    blueGlow: toHexNumber(cssVar('--gh-blue-glow', '#2f8fff')),
    triangle: toHexNumber(cssVar('--gh-triangle', '#46e0b8')),
    circle: toHexNumber(cssVar('--gh-circle', '#ff5470')),
    cross: toHexNumber(cssVar('--gh-cross', '#4aa3ff')),
    square: toHexNumber(cssVar('--gh-square', '#d76bff')),
    text: cssVar('--gh-text', '#eef2ff'),
    textDim: cssVar('--gh-text-dim', '#9aa6d6'),
    good: toHexNumber(cssVar('--gh-good', '#46e0b8')),
    bad: toHexNumber(cssVar('--gh-bad', '#ff5470')),
  };
}
