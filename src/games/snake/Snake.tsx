import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhaserGame from '../PhaserGame';
import { GameEventBus } from '../eventBus';
import { createSnakeGame } from './game';
import { LEVELS } from './config';
import {
  getHighScore,
  getSnakeProgress,
  isSnakeLevelUnlocked,
  recordSnakeScore,
  unlockSnakeLevel,
  type Mode,
} from '../../storage/progress';
import './Snake.css';

type View = 'menu' | 'play';
const MODES: Mode[] = ['easy', 'medium', 'hard'];

export default function Snake() {
  const [view, setView] = useState<View>('menu');
  const [mode, setMode] = useState<Mode>('easy');
  const [levelId, setLevelId] = useState(1);

  if (view === 'menu') {
    return (
      <SnakeMenu
        mode={mode}
        levelId={levelId}
        onMode={setMode}
        onLevel={setLevelId}
        onPlay={() => setView('play')}
      />
    );
  }
  return (
    <SnakePlay
      mode={mode}
      levelId={levelId}
      onExit={() => setView('menu')}
    />
  );
}

interface MenuProps {
  mode: Mode;
  levelId: number;
  onMode: (m: Mode) => void;
  onLevel: (id: number) => void;
  onPlay: () => void;
}

function SnakeMenu({ mode, levelId, onMode, onLevel, onPlay }: MenuProps) {
  const navigate = useNavigate();
  const progress = getSnakeProgress();

  return (
    <div className="snake-menu">
      <button className="ghost-btn back" onClick={() => navigate('/')}>
        ← Hub
      </button>
      <h1 className="snake-title">Snake</h1>
      <p className="snake-sub">Pick a difficulty and level</p>

      <section className="menu-block">
        <h2>Difficulty</h2>
        <div className="mode-row">
          {MODES.map((m) => (
            <button
              key={m}
              className={`chip ${mode === m ? 'active' : ''}`}
              onClick={() => onMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </section>

      <section className="menu-block">
        <h2>Level</h2>
        <div className="level-grid">
          {LEVELS.map((lvl) => {
            const unlocked = progress.unlockedLevels.includes(lvl.id);
            const best = getHighScore(mode, lvl.id);
            return (
              <button
                key={lvl.id}
                className={`level-card ${levelId === lvl.id ? 'active' : ''} ${
                  unlocked ? '' : 'locked'
                }`}
                disabled={!unlocked}
                onClick={() => onLevel(lvl.id)}
              >
                <span className="level-num">{unlocked ? lvl.id : '🔒'}</span>
                <span className="level-name">{lvl.name}</span>
                {unlocked && best > 0 && (
                  <span className="level-best">Best {best}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <button className="play-btn" onClick={onPlay}>
        ▶ Play
      </button>
    </div>
  );
}

interface PlayProps {
  mode: Mode;
  levelId: number;
  onExit: () => void;
}

interface Toast {
  id: number;
  label: string;
}

function SnakePlay({ mode, levelId, onExit }: PlayProps) {
  const busRef = useRef<GameEventBus>(new GameEventBus());
  const [runId, setRunId] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => getHighScore(mode, levelId));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [result, setResult] = useState<{ score: number; won: boolean } | null>(
    null
  );
  const toastId = useRef(0);

  useEffect(() => {
    const bus = busRef.current;

    const pushToast = (label: string) => {
      const id = ++toastId.current;
      setToasts((t) => [...t, { id, label }]);
      window.setTimeout(
        () => setToasts((t) => t.filter((x) => x.id !== id)),
        2600
      );
    };

    const onScore = (s: number) => setScore(s);
    const onLevelUp = (lvl: number) => unlockSnakeLevel(lvl);
    const onAchievement = (p: { id: string; label: string }) =>
      pushToast(p.label);
    const onGameOver = (p: { score: number; won: boolean }) => {
      const isBest = recordSnakeScore(mode, levelId, p.score);
      if (isBest) setBest(p.score);
      setResult(p);
    };

    bus.on('score', onScore);
    bus.on('levelup', onLevelUp);
    bus.on('achievement', onAchievement);
    bus.on('gameover', onGameOver);

    document.body.classList.add('gh-playing');
    return () => {
      // Only remove React-owned listeners; the scene owns its 'control' listener.
      bus.off('score', onScore);
      bus.off('levelup', onLevelUp);
      bus.off('achievement', onAchievement);
      bus.off('gameover', onGameOver);
      document.body.classList.remove('gh-playing');
    };
  }, [mode, levelId, runId]);

  const replay = () => {
    setScore(0);
    setResult(null);
    setRunId((n) => n + 1);
  };

  const control = (dir: 'up' | 'down' | 'left' | 'right') =>
    busRef.current.emitControl(dir);

  const nextUnlocked = isSnakeLevelUnlocked(levelId + 1);

  return (
    <div className="snake-play">
      <header className="play-hud">
        <button className="ghost-btn" onClick={onExit}>
          ← Menu
        </button>
        <div className="hud-scores">
          <span className="hud-score">{score}</span>
          <span className="hud-best">Best {best}</span>
        </div>
        <span className="hud-mode">{mode}</span>
      </header>

      <div className="stage">
        <PhaserGame
          key={runId}
          className="phaser-holder"
          bus={busRef.current}
          createGame={(parent, bus) =>
            createSnakeGame(parent, bus, { mode, levelId })
          }
        />

        <div className="toasts">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              🏆 {t.label}
            </div>
          ))}
        </div>

        {result && (
          <div className="overlay">
            <div className="overlay-card">
              <h2 className={result.won ? 'win' : 'lose'}>
                {result.won ? 'You Win!' : 'Game Over'}
              </h2>
              <p className="overlay-score">Score {result.score}</p>
              <p className="overlay-best">Best {best}</p>
              <div className="overlay-actions">
                <button className="play-btn" onClick={replay}>
                  Play again
                </button>
                {nextUnlocked && !result.won && (
                  <button className="ghost-btn wide" onClick={onExit}>
                    Try next level
                  </button>
                )}
                <button className="ghost-btn wide" onClick={onExit}>
                  Change level
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dpad" role="group" aria-label="Direction controls">
        <button
          className="dbtn up"
          aria-label="Up"
          onClick={() => control('up')}
        >
          ▲
        </button>
        <div className="dpad-mid">
          <button
            className="dbtn left"
            aria-label="Left"
            onClick={() => control('left')}
          >
            ◀
          </button>
          <button
            className="dbtn right"
            aria-label="Right"
            onClick={() => control('right')}
          >
            ▶
          </button>
        </div>
        <button
          className="dbtn down"
          aria-label="Down"
          onClick={() => control('down')}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
