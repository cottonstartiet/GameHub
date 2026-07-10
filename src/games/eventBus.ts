import Phaser from 'phaser';

/* Decoupled event bridge between Phaser scenes and React.
   Scenes emit events; React subscribes to update the HUD, show toasts,
   and persist progress — so we never pass unstable React callbacks into Phaser. */

export interface GameEvents {
  score: (score: number) => void;
  levelup: (level: number) => void;
  achievement: (payload: { id: string; label: string }) => void;
  gameover: (payload: { score: number; won: boolean }) => void;
}

export class GameEventBus extends Phaser.Events.EventEmitter {
  emitScore(score: number) {
    this.emit('score', score);
  }
  emitLevelUp(level: number) {
    this.emit('levelup', level);
  }
  emitAchievement(id: string, label: string) {
    this.emit('achievement', { id, label });
  }
  emitGameOver(score: number, won: boolean) {
    this.emit('gameover', { score, won });
  }
  /** React on-screen controls -> the active scene. */
  emitControl(name: 'up' | 'down' | 'left' | 'right') {
    this.emit('control', name);
  }
}
