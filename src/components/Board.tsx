import type { Card as CardType, Game, TeamOrSpectator } from '../lib/types';
import { Card } from './Card';

interface BoardProps {
  cards: CardType[];
  isSpymaster: boolean;
  game: Game;
  myTeam: TeamOrSpectator;
  onReveal: (card: CardType) => void;
}

export function Board({ cards, isSpymaster, game, myTeam, onReveal }: BoardProps) {
  const sorted = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="board">
      {sorted.map((card) => (
        <Card
          key={card.id}
          card={card}
          isSpymaster={isSpymaster}
          gameStatus={game.status}
          currentTeam={game.current_team}
          myTeam={myTeam}
          onReveal={onReveal}
        />
      ))}
    </div>
  );
}
