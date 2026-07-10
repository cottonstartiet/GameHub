import Phaser from 'phaser';
import GameScene, { CELL } from './scenes/GameScene';
import { GRID } from './config';
import type { GameEventBus } from '../eventBus';
import type { Mode } from '../../storage/progress';
import { getGameTheme } from '../theme';

export interface SnakeStartOptions {
  mode: Mode;
  levelId: number;
}

/** Builds a Phaser.Game for Snake bound to a parent element and event bus. */
export function createSnakeGame(
  parent: HTMLElement,
  bus: GameEventBus,
  opts: SnakeStartOptions
): Phaser.Game {
  const theme = getGameTheme();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GRID.cols * CELL,
    height: GRID.rows * CELL,
    backgroundColor: theme.bgCss,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
  });

  // Add and start the scene explicitly so options are passed via init data
  // (avoids any auto-start timing race).
  game.scene.add('game', GameScene, true, {
    mode: opts.mode,
    levelId: opts.levelId,
    bus,
  });
  return game;
}
