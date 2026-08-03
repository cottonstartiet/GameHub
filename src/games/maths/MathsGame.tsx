import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  awardMathsBadges,
  getMathsBestStars,
  getMathsProgress,
  recordMathsStars,
  setMathsCompanion,
  unlockMathsLevel,
  type Companion,
} from '../../storage/progress';
import { generateLevelRound, getMathsLevel, MATHS_LEVELS } from './levels';
import './MathsGame.css';

type View = 'menu' | 'play';
type CompanionMood = 'ready' | 'happy' | 'sad' | 'celebrate';

interface BadgeMeta {
  id: string;
  label: string;
  emoji: string;
}

interface CompanionMeta {
  name: string;
  emoji: string;
  intro: string;
  cheer: string;
  gentle: string;
}

const BADGES: BadgeMeta[] = [
  { id: 'first-paw', label: 'First Paw Print', emoji: '🌟' },
  { id: 'level-5', label: 'Five Levels', emoji: '🎈' },
  { id: 'level-10', label: 'Ten Levels', emoji: '🚀' },
  { id: 'level-20', label: 'Twenty Levels', emoji: '🏅' },
  { id: 'level-30', label: 'Maths Hero', emoji: '👑' },
  { id: 'perfect-round', label: 'Perfect Round', emoji: '💯' },
];

const BADGE_LOOKUP: Record<string, BadgeMeta> = Object.fromEntries(
  BADGES.map((badge) => [badge.id, badge])
);

const COMPANIONS: Record<Companion, CompanionMeta> = {
  dog: {
    name: 'Dot the Dog',
    emoji: '🐶',
    intro: 'I will cheer for you all the way!',
    cheer: 'Woof! You got it!',
    gentle: 'Tiny try again. I still believe in you!',
  },
  cat: {
    name: 'Coco the Cat',
    emoji: '🐱',
    intro: 'Let us tiptoe through the numbers together!',
    cheer: 'Me-wow! Great answer!',
    gentle: 'A soft retry will do the trick!',
  },
};

const COMPANION_STOPS = [
  { x: 8, y: 10 },
  { x: 72, y: 12 },
  { x: 18, y: 58 },
  { x: 74, y: 60 },
  { x: 42, y: 28 },
];

function countStars(bestStars: Record<number, number>): number {
  return Object.values(bestStars).reduce((total, value) => total + value, 0);
}

function badgeIdsFor(levelId: number, score: number, questionCount: number): string[] {
  const badgeIds = ['first-paw'];
  if (levelId >= 5) badgeIds.push('level-5');
  if (levelId >= 10) badgeIds.push('level-10');
  if (levelId >= 20) badgeIds.push('level-20');
  if (levelId >= 30) badgeIds.push('level-30');
  if (score === questionCount) badgeIds.push('perfect-round');
  return badgeIds;
}

export default function MathsGame() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('menu');
  const [progressTick, setProgressTick] = useState(0);
  const progress = useMemo(() => getMathsProgress(), [progressTick]);
  const [levelId, setLevelId] = useState(
    () => progress.unlockedLevels[progress.unlockedLevels.length - 1] ?? 1
  );
  const [companion, setCompanion] = useState<Companion | null>(progress.companion);

  const totalStars = countStars(progress.bestStars);
  const earnedBadges = progress.badges
    .map((badgeId) => BADGE_LOOKUP[badgeId])
    .filter((badge): badge is BadgeMeta => Boolean(badge));

  useEffect(() => {
    if (!companion && progress.companion) {
      setCompanion(progress.companion);
    }
  }, [companion, progress.companion]);

  const refreshProgress = () => setProgressTick((value) => value + 1);

  if (view === 'play' && companion) {
    return (
      <MathsPlay
        key={`${levelId}-${companion}`}
        levelId={levelId}
        companion={companion}
        onExit={() => {
          refreshProgress();
          setView('menu');
        }}
      />
    );
  }

  return (
    <div className="maths-menu">
      <button className="maths-ghost-btn" onClick={() => navigate('/')}>
        ← Hub
      </button>

      <header className="maths-hero">
        <div className="maths-hero-copy">
          <span className="maths-kicker">A playful number adventure</span>
          <h1>Maths Trail</h1>
          <p>
            Explore 30 levels of addition, number order, and take-away fun with a
            pet friend by your side.
          </p>
        </div>
        <div className="maths-stats" aria-label="Maths Trail progress">
          <div>
            <strong>{progress.unlockedLevels.length}</strong>
            <span>levels open</span>
          </div>
          <div>
            <strong>{totalStars}</strong>
            <span>stars won</span>
          </div>
          <div>
            <strong>{earnedBadges.length}</strong>
            <span>badges</span>
          </div>
        </div>
      </header>

      <section className="maths-panel">
        <div className="maths-section-head">
          <div>
            <h2>Choose your buddy</h2>
            <p>Your helper will stick with you in every level.</p>
          </div>
          {companion && (
            <div className="maths-buddy-preview">
              <span>{COMPANIONS[companion].emoji}</span>
              <div>
                <strong>{COMPANIONS[companion].name}</strong>
                <small>{COMPANIONS[companion].intro}</small>
              </div>
            </div>
          )}
        </div>
        <div className="companion-grid">
          {(Object.entries(COMPANIONS) as [Companion, CompanionMeta][]).map(
            ([id, meta]) => (
              <button
                key={id}
                className={`companion-card ${companion === id ? 'active' : ''}`}
                onClick={() => {
                  setCompanion(id);
                  setMathsCompanion(id);
                  refreshProgress();
                }}
              >
                <span className="companion-emoji">{meta.emoji}</span>
                <strong>{meta.name}</strong>
                <span>{meta.intro}</span>
              </button>
            )
          )}
        </div>
      </section>

      <section className="maths-panel">
        <div className="maths-section-head">
          <div>
            <h2>Level trail</h2>
            <p>Pass a level to unlock the next stepping stone.</p>
          </div>
          <button
            className="maths-play-btn compact"
            disabled={!companion}
            onClick={() => setView('play')}
          >
            {companion ? 'Play selected level' : 'Choose a buddy first'}
          </button>
        </div>
        <div className="maths-level-grid">
          {MATHS_LEVELS.map((level) => {
            const unlocked = progress.unlockedLevels.includes(level.id);
            const bestStars = progress.bestStars[level.id] ?? 0;
            return (
              <button
                key={level.id}
                className={`maths-level-card ${levelId === level.id ? 'active' : ''} ${
                  unlocked ? '' : 'locked'
                }`}
                disabled={!unlocked}
                onClick={() => setLevelId(level.id)}
              >
                <span className="maths-level-id">Level {level.id}</span>
                <strong>{level.title}</strong>
                <span>{level.prompt}</span>
                <small>{unlocked ? `Best ${'⭐'.repeat(bestStars || 1)}` : 'Locked'}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="maths-panel">
        <div className="maths-section-head">
          <div>
            <h2>Badge garden</h2>
            <p>Special celebrations you have earned along the trail.</p>
          </div>
        </div>
        {earnedBadges.length > 0 ? (
          <div className="badge-grid">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-chip">
                <span>{badge.emoji}</span>
                <strong>{badge.label}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="maths-empty-state">
            Finish your first level to grow your badge garden.
          </div>
        )}
      </section>
    </div>
  );
}

interface MathsPlayProps {
  levelId: number;
  companion: Companion;
  onExit: () => void;
}

function MathsPlay({ levelId, companion, onExit }: MathsPlayProps) {
  const level = getMathsLevel(levelId);
  const buddy = COMPANIONS[companion];
  const [questions, setQuestions] = useState(() => generateLevelRound(levelId));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [companionMood, setCompanionMood] = useState<CompanionMood>('ready');
  const [companionLine, setCompanionLine] = useState(
    `${buddy.intro} Let us solve ${level.questionCount} puzzles!`
  );
  const [bestStars, setBestStars] = useState(() => getMathsBestStars(levelId));
  const [runNumber, setRunNumber] = useState(1);
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    badges: BadgeMeta[];
    unlockedNext: boolean;
  } | null>(null);
  const [companionStop, setCompanionStop] = useState(COMPANION_STOPS[0]);
  const timersRef = useRef<number[]>([]);

  const question = questions[questionIndex];
  const progressPercent = ((questionIndex + (result ? 1 : 0)) / level.questionCount) * 100;

  useEffect(() => {
    const moveTimer = window.setInterval(() => {
      setCompanionStop((current) => {
        const choices = COMPANION_STOPS.filter(
          (stop) => stop.x !== current.x || stop.y !== current.y
        );
        return choices[Math.floor(Math.random() * choices.length)] ?? current;
      });
    }, 1600);

    return () => {
      window.clearInterval(moveTimer);
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = [];
    };
  }, []);

  const queue = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(callback, delay);
    timersRef.current.push(timerId);
  };

  const startFreshRound = () => {
    setQuestions(generateLevelRound(levelId));
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setCompanionMood('ready');
    setCompanionLine(`${buddy.intro} Round ${runNumber + 1} starts now!`);
    setResult(null);
    setRunNumber((value) => value + 1);
  };

  const finishRound = (finalScore: number) => {
    const passed = finalScore >= level.passMark;
    const isBest = recordMathsStars(levelId, finalScore);
    if (isBest) setBestStars(finalScore);
    const unlockedNext =
      passed && levelId < MATHS_LEVELS.length ? unlockMathsLevel(levelId + 1) : false;
    const freshBadges = awardMathsBadges(
      passed ? badgeIdsFor(levelId, finalScore, level.questionCount) : []
    )
      .map((badgeId) => BADGE_LOOKUP[badgeId])
      .filter((badge): badge is BadgeMeta => Boolean(badge));

    setCompanionMood(passed ? 'celebrate' : 'sad');
    setCompanionLine(
      passed
        ? `${buddy.cheer} You earned ${finalScore} star${finalScore === 1 ? '' : 's'}!`
        : `${buddy.gentle} You still won ${finalScore} star${finalScore === 1 ? '' : 's'}!`
    );
    setResult({
      passed,
      score: finalScore,
      badges: freshBadges,
      unlockedNext,
    });
  };

  const answerQuestion = (choice: string) => {
    if (selectedAnswer || result) return;
    const correct = choice === question.answer;
    const nextScore = correct ? score + 1 : score;
    setSelectedAnswer(choice);
    setFeedback(correct ? 'correct' : 'wrong');
    setScore(nextScore);
    setCompanionMood(correct ? 'happy' : 'sad');
    setCompanionLine(correct ? buddy.cheer : `${buddy.gentle} The answer is ${question.answer}.`);

    queue(() => {
      if (questionIndex === questions.length - 1) {
        finishRound(nextScore);
        return;
      }
      setQuestionIndex((index) => index + 1);
      setSelectedAnswer(null);
      setFeedback(null);
      setCompanionMood('ready');
      setCompanionLine(
        `Puzzle ${questionIndex + 2} is ready. ${
          questions[questionIndex + 1]?.hint ?? 'You can do it!'
        }`
      );
    }, 950);
  };

  return (
    <div className="maths-play">
      <header className="maths-play-header">
        <button className="maths-ghost-btn" onClick={onExit}>
          ← Levels
        </button>
        <div className="maths-play-status">
          <strong>{level.title}</strong>
          <span>
            {questionIndex + 1} / {level.questionCount} · Need {level.passMark} stars
          </span>
        </div>
        <div className="maths-score-pill">
          <span>{'⭐'.repeat(Math.max(score, 1))}</span>
          <small>Best {bestStars}</small>
        </div>
      </header>

      <div className="maths-progress-track" aria-hidden="true">
        <div className="maths-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <main className="maths-stage">
        <section className="maths-board">
          <span className="maths-topic-tag">{level.prompt}</span>
          <h2>{question.prompt}</h2>
          <p>{question.hint}</p>
          <div className="maths-choice-grid">
            {question.choices.map((choice) => {
              const isChosen = selectedAnswer === choice;
              const isCorrect = question.answer === choice;
              return (
                <button
                  key={choice}
                  className={`maths-choice ${isChosen ? 'selected' : ''} ${
                    feedback === 'correct' && isCorrect ? 'correct' : ''
                  } ${feedback === 'wrong' && isChosen ? 'wrong' : ''}`}
                  disabled={Boolean(selectedAnswer) || Boolean(result)}
                  onClick={() => answerQuestion(choice)}
                >
                  {choice}
                </button>
              );
            })}
          </div>
        </section>

        <aside
          className={`maths-companion ${companionMood}`}
          style={{ left: `${companionStop.x}%`, top: `${companionStop.y}%` }}
        >
          <div className="maths-companion-bubble">{companionLine}</div>
          <div className="maths-companion-body" aria-label={buddy.name}>
            <span>{buddy.emoji}</span>
            <strong>{buddy.name}</strong>
          </div>
        </aside>

        {result && (
          <div className="maths-overlay">
            <div className="maths-overlay-card">
              <span className="maths-overlay-emoji">
                {result.passed ? '🎉' : '🌈'}
              </span>
              <h3>{result.passed ? 'Trail cleared!' : 'Good trying!'}</h3>
              <p>
                You earned <strong>{result.score}</strong> out of {level.questionCount} stars.
              </p>
              {result.unlockedNext && <p>New level unlocked. Your trail just grew!</p>}
              {result.badges.length > 0 && (
                <div className="badge-grid">
                  {result.badges.map((badge) => (
                    <div key={badge.id} className="badge-chip">
                      <span>{badge.emoji}</span>
                      <strong>{badge.label}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="maths-overlay-actions">
                <button className="maths-play-btn" onClick={startFreshRound}>
                  Play again
                </button>
                <button className="maths-ghost-btn wide" onClick={onExit}>
                  Back to levels
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
