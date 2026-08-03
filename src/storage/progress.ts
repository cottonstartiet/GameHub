/* Versioned, resilient localStorage persistence for game progress.
   Guards against corrupt JSON and unavailable storage (e.g. private mode). */

const STORAGE_KEY = 'gamehub:progress';
const STORAGE_VERSION = 1;

export type Mode = 'easy' | 'medium' | 'hard';
export type Companion = 'dog' | 'cat';

export interface SnakeProgress {
  unlockedLevels: number[];
  /** highScores[mode][level] = best score */
  highScores: Record<Mode, Record<number, number>>;
}

export interface MathsProgress {
  unlockedLevels: number[];
  /** bestStars[level] = best score out of 5 */
  bestStars: Record<number, number>;
  companion: Companion | null;
  badges: string[];
}

interface ProgressState {
  version: number;
  games: {
    snake: SnakeProgress;
    maths: MathsProgress;
  };
}

function defaultSnakeProgress(): SnakeProgress {
  return {
    unlockedLevels: [1],
    highScores: { easy: {}, medium: {}, hard: {} },
  };
}

function defaultState(): ProgressState {
  return {
    version: STORAGE_VERSION,
    games: {
      snake: defaultSnakeProgress(),
      maths: defaultMathsProgress(),
    },
  };
}

function defaultMathsProgress(): MathsProgress {
  return {
    unlockedLevels: [1],
    bestStars: {},
    companion: null,
    badges: [],
  };
}

function storageAvailable(): boolean {
  try {
    const probe = '__gh_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** Merge persisted data over defaults so missing fields never crash callers. */
function normalize(raw: unknown): ProgressState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const state = raw as Partial<ProgressState>;
  const snake = state.games?.snake;
  const maths = state.games?.maths;
  if (snake && typeof snake === 'object') {
    const merged = base.games.snake;
    if (Array.isArray(snake.unlockedLevels)) {
      merged.unlockedLevels = Array.from(
        new Set(snake.unlockedLevels.filter((n) => Number.isFinite(n)))
      );
      if (!merged.unlockedLevels.includes(1)) merged.unlockedLevels.push(1);
    }
    if (snake.highScores && typeof snake.highScores === 'object') {
      for (const mode of ['easy', 'medium', 'hard'] as Mode[]) {
        const scores = snake.highScores[mode];
        if (scores && typeof scores === 'object') {
          merged.highScores[mode] = { ...scores };
        }
      }
    }
  }
  if (maths && typeof maths === 'object') {
    const merged = base.games.maths;
    if (Array.isArray(maths.unlockedLevels)) {
      merged.unlockedLevels = Array.from(
        new Set(maths.unlockedLevels.filter((n) => Number.isFinite(n)))
      ).sort((a, b) => a - b);
      if (!merged.unlockedLevels.includes(1)) merged.unlockedLevels.unshift(1);
    }
    if (maths.bestStars && typeof maths.bestStars === 'object') {
      const bestStars = Object.entries(maths.bestStars).reduce<
        Record<number, number>
      >((acc, [level, stars]) => {
        const parsedLevel = Number(level);
        if (Number.isFinite(parsedLevel) && Number.isFinite(stars)) {
          acc[parsedLevel] = Math.max(0, Math.min(5, Number(stars)));
        }
        return acc;
      }, {});
      merged.bestStars = bestStars;
    }
    if (maths.companion === 'dog' || maths.companion === 'cat') {
      merged.companion = maths.companion;
    }
    if (Array.isArray(maths.badges)) {
      merged.badges = Array.from(
        new Set(maths.badges.filter((badge) => typeof badge === 'string'))
      );
    }
  }
  return base;
}

function read(): ProgressState {
  if (!storageAvailable()) return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalize(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

function write(state: ProgressState): void {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / availability errors */
  }
}

export function getSnakeProgress(): SnakeProgress {
  return read().games.snake;
}

export function getHighScore(mode: Mode, level: number): number {
  return getSnakeProgress().highScores[mode]?.[level] ?? 0;
}

/** Records a score; returns whether it was a new best for that mode+level. */
export function recordSnakeScore(
  mode: Mode,
  level: number,
  score: number
): boolean {
  const state = read();
  const scores = state.games.snake.highScores[mode];
  const prev = scores[level] ?? 0;
  const isBest = score > prev;
  if (isBest) {
    scores[level] = score;
    write(state);
  }
  return isBest;
}

/** Unlocks a level; returns whether it was newly unlocked. */
export function unlockSnakeLevel(level: number): boolean {
  const state = read();
  const unlocked = state.games.snake.unlockedLevels;
  if (unlocked.includes(level)) return false;
  unlocked.push(level);
  unlocked.sort((a, b) => a - b);
  write(state);
  return true;
}

export function isSnakeLevelUnlocked(level: number): boolean {
  return getSnakeProgress().unlockedLevels.includes(level);
}

export function getMathsProgress(): MathsProgress {
  return read().games.maths;
}

export function getMathsBestStars(level: number): number {
  return getMathsProgress().bestStars[level] ?? 0;
}

export function recordMathsStars(level: number, stars: number): boolean {
  const state = read();
  const prev = state.games.maths.bestStars[level] ?? 0;
  const next = Math.max(0, Math.min(5, stars));
  const isBest = next > prev;
  if (isBest) {
    state.games.maths.bestStars[level] = next;
    write(state);
  }
  return isBest;
}

export function unlockMathsLevel(level: number): boolean {
  const state = read();
  const unlocked = state.games.maths.unlockedLevels;
  if (unlocked.includes(level)) return false;
  unlocked.push(level);
  unlocked.sort((a, b) => a - b);
  write(state);
  return true;
}

export function isMathsLevelUnlocked(level: number): boolean {
  return getMathsProgress().unlockedLevels.includes(level);
}

export function setMathsCompanion(companion: Companion): void {
  const state = read();
  state.games.maths.companion = companion;
  write(state);
}

export function awardMathsBadges(badgeIds: string[]): string[] {
  const state = read();
  const earned = state.games.maths.badges;
  const newIds: string[] = [];
  for (const badgeId of badgeIds) {
    if (!earned.includes(badgeId)) {
      earned.push(badgeId);
      newIds.push(badgeId);
    }
  }
  if (newIds.length > 0) write(state);
  return newIds;
}
