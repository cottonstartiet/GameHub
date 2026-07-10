import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import type { GameEventBus } from './eventBus';

interface PhaserGameProps {
  /** Builds the Phaser.Game bound to the given parent element and event bus. */
  createGame: (parent: HTMLElement, bus: GameEventBus) => Phaser.Game;
  bus: GameEventBus;
  className?: string;
}

/* Mounts a Phaser game inside React with a clean lifecycle:
   created in an effect, destroyed on cleanup, and safe against React
   StrictMode's double mount/unmount in development. */
export default function PhaserGame({
  createGame,
  bus,
  className,
}: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    const game = createGame(parent, bus);
    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
    // createGame/bus are stable for a given mounted game instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
