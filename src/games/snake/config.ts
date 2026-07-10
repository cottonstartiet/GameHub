import type { Mode } from '../../storage/progress';

export interface Cell {
  x: number;
  y: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  /** Interior obstacle cells (grid edges are always deadly walls). */
  obstacles: Cell[];
  /** Score at which the next level unlocks (undefined for the final level). */
  unlockNextAt?: number;
  /** Final level only: score that counts as "beating the game". */
  winAt?: number;
}

/** Square play grid. Odd size so there is a true center cell. */
export const GRID = { cols: 21, rows: 21 };

/** Step interval in ms per difficulty — lower is faster. */
export const MODE_SPEED: Record<Mode, number> = {
  easy: 170,
  medium: 115,
  hard: 75,
};

/** Score multiplier per difficulty. */
export const MODE_MULTIPLIER: Record<Mode, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export const FOOD_POINTS = 10;

function line(fixed: 'row' | 'col', at: number, from: number, to: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = from; i <= to; i++) {
    cells.push(fixed === 'row' ? { x: i, y: at } : { x: at, y: i });
  }
  return cells;
}

const C = GRID.cols; // 21
const MID = Math.floor(C / 2); // 10

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Open Field',
    obstacles: [],
    unlockNextAt: 30,
  },
  {
    id: 2,
    name: 'Corners',
    obstacles: [
      ...line('row', 3, 3, 5),
      ...line('row', 3, C - 6, C - 4),
      ...line('row', C - 4, 3, 5),
      ...line('row', C - 4, C - 6, C - 4),
    ],
    unlockNextAt: 60,
  },
  {
    id: 3,
    name: 'Crossroads',
    obstacles: [
      ...line('row', MID, MID - 4, MID + 4),
      ...line('col', MID, MID - 4, MID + 4),
    ],
    unlockNextAt: 100,
  },
  {
    id: 4,
    name: 'Gauntlet',
    obstacles: [
      ...line('col', 6, 4, C - 5),
      ...line('col', C - 7, 4, C - 5),
    ],
    unlockNextAt: 150,
  },
  {
    id: 5,
    name: 'The Arena',
    obstacles: [
      // Center box.
      ...line('row', MID - 3, MID - 3, MID + 3),
      ...line('row', MID + 3, MID - 3, MID + 3),
      ...line('col', MID - 3, MID - 3, MID + 3),
      ...line('col', MID + 3, MID - 3, MID + 3),
      // Edge pillars.
      ...line('col', 4, 4, 6),
      ...line('col', C - 5, 4, 6),
      ...line('col', 4, C - 7, C - 5),
      ...line('col', C - 5, C - 7, C - 5),
    ],
    winAt: 250,
  },
];

export function getLevel(id: number): LevelConfig {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
