import { GAMES } from '../games/registry';
import GameCard from '../components/GameCard';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="brand-shapes" aria-hidden="true">
          <span className="shape triangle" />
          <span className="shape circle" />
          <span className="shape cross">✕</span>
          <span className="shape square" />
        </div>
        <h1 className="brand">
          Game<span>Hub</span>
        </h1>
        <p className="brand-sub">Your hub for online games. Pick one and play.</p>
      </header>

      <main className="game-grid">
        {GAMES.map((game, i) => (
          <GameCard key={game.id} game={game} index={i} />
        ))}
      </main>

      <footer className="landing-footer">
        Installable · works offline · mobile-first
      </footer>
    </div>
  );
}
