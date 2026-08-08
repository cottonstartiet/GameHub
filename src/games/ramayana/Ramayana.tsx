import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from '../PhaserGame';
import { GameEventBus } from '../eventBus';
import { createRamayanaGame } from './game';
import './Ramayana.css';

export default function Ramayana() {
  const navigate = useNavigate();
  const busRef = useRef<GameEventBus>(new GameEventBus());
  const [runId, setRunId] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{ score: number; won: boolean } | null>(null);
  const [levelTitle, setLevelTitle] = useState('Ramayana');

  useEffect(() => {
    const bus = busRef.current;

    const onScore = (s: number) => setScore(s);
    const onGameOver = (p: { score: number; won: boolean }) => setResult(p);

    bus.on('score', onScore);
    bus.on('gameover', onGameOver);
    document.body.classList.add('gh-playing');

    return () => {
      bus.off('score', onScore);
      bus.off('gameover', onGameOver);
      document.body.classList.remove('gh-playing');
    };
  }, [runId]);

  // Update title from bus events (scenes emit 'levelTitle')
  useEffect(() => {
    const bus = busRef.current;
    const onTitle = (t: string) => setLevelTitle(t);
    bus.on('levelTitle' as never, onTitle);
    return () => { bus.off('levelTitle' as never, onTitle); };
  }, []);

  const restart = () => {
    setScore(0);
    setResult(null);
    setRunId((n) => n + 1);
  };

  const goMenu = () => {
    setScore(0);
    setResult(null);
    // Re-mount with a new runId so the game resets to the Menu scene
    setRunId((n) => n + 1);
  };

  return (
    <div className="ramayana-root">
      {/* Thin HUD bar */}
      <header className="ramayana-hud">
        <button className="hud-back" onClick={() => navigate('/')}>
          ← Hub
        </button>
        <span className="hud-title">🏹 {levelTitle}</span>
        <span className="hud-score">Score: {score}</span>
      </header>

      <div className="ramayana-stage">
        <PhaserGame
          key={runId}
          className="phaser-holder"
          bus={busRef.current}
          createGame={(parent, bus) => createRamayanaGame(parent, bus)}
        />

        {result && (
          <div className="ramayana-overlay">
            <div className="ramayana-overlay-card">
              <h2 className={result.won ? 'win' : 'lose'}>
                {result.won ? '🏆 Victory!' : '💀 Defeated'}
              </h2>
              <p className="oc-score">Score: {result.score}</p>
              <div className="oc-actions">
                <button className="play-btn" onClick={restart}>
                  ▶ Play Again
                </button>
                <button className="ghost-btn" onClick={goMenu}>
                  Level Select
                </button>
                <button className="ghost-btn" onClick={() => navigate('/')}>
                  ← Hub
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
