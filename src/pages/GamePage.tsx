import { lazy, Suspense, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame } from '../games/registry';
import './GamePage.css';

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = getGame(gameId);

  const LazyGame = useMemo(
    () => (game?.load ? lazy(game.load) : null),
    [game]
  );

  if (!game || !game.available || !LazyGame) {
    return (
      <div className="game-missing">
        <h1>Game not found</h1>
        <button className="ghost-btn" onClick={() => navigate('/')}>
          ← Back to hub
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="game-loading">Loading…</div>}>
      <LazyGame />
    </Suspense>
  );
}
