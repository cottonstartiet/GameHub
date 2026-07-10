import { useNavigate } from 'react-router-dom';
import type { GameMeta } from '../games/registry';
import './GameCard.css';

interface GameCardProps {
  game: GameMeta;
  index: number;
}

export default function GameCard({ game, index }: GameCardProps) {
  const navigate = useNavigate();
  const onOpen = () => {
    if (game.available) navigate(`/games/${game.id}`);
  };

  return (
    <button
      className={`game-card ${game.available ? '' : 'soon'}`}
      style={{ animationDelay: `${index * 70}ms` }}
      onClick={onOpen}
      disabled={!game.available}
      aria-label={game.title}
    >
      <span
        className="game-icon"
        style={{
          background: `linear-gradient(150deg, ${game.accentFrom}, ${game.accentTo})`,
        }}
      >
        <span className="game-glyph">{game.glyph}</span>
      </span>
      <span className="game-title">{game.title}</span>
      <span className="game-tagline">{game.tagline}</span>
      {!game.available && <span className="soon-badge">Soon</span>}
    </button>
  );
}
