/**
 * Ramayana: Arrows of Dharma — Phaser 3 game factory.
 */
import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import { GAME_W, GAME_H, GRAVITY } from './constants';
import type { GameEventBus } from '../eventBus';

export function createRamayanaGame(
  parent: HTMLElement,
  bus: GameEventBus,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#1a1a2e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: GRAVITY },
        debug: false,
      },
    },
    scene: [BootScene, MenuScene, GameScene],
    // Pass the bus so scenes can access it through scene data
    callbacks: {
      postBoot: (game) => {
        // Inject bus into all scenes via registry
        game.registry.set('bus', bus);
        // Boot scene auto-starts as the first entry in `scene`; no need to start it manually.
      },
    },
  });
}
