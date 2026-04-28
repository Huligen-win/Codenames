import type { Card as CardType, GameStatus, TeamOrSpectator, Team } from '../lib/types';

interface CardProps {
  card: CardType;
  isSpymaster: boolean;
  gameStatus: GameStatus;
  currentTeam: Team;
  myTeam: TeamOrSpectator;
  onReveal: (card: CardType) => void;
}

export function Card({ card, isSpymaster, gameStatus, currentTeam, myTeam, onReveal }: CardProps) {
  const canReveal =
    !card.revealed &&
    !isSpymaster &&
    gameStatus === 'playing' &&
    myTeam !== 'spectator' &&
    myTeam === currentTeam;

  const handleClick = () => {
    if (canReveal) onReveal(card);
  };

  let className = 'card';

  if (card.revealed) {
    className += ` card-revealed card-${card.color}`;
  } else if (isSpymaster) {
    className += ` card-hidden card-spymaster-${card.color}`;
  } else {
    className += ' card-hidden';
  }

  if (canReveal) {
    className += ' card-clickable';
  }

  return (
    <div
      className={className}
      onClick={handleClick}
      role={canReveal ? 'button' : undefined}
      tabIndex={canReveal ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {card.word}
    </div>
  );
}
