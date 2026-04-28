import { useState, type ReactNode } from 'react';
import type { Game } from '../lib/types';

interface SidebarProps {
  game: Game;
  redScore: number;
  blueScore: number;
  isHost: boolean;
  onStartGame: () => void;
  onEndTurn: () => void;
  onRestartGame: () => void;
  children: ReactNode;
}

const END_REASON_LABELS: Record<string, string> = {
  all_red_found: 'Alle roten Karten gefunden!',
  all_blue_found: 'Alle blauen Karten gefunden!',
  assassin: 'Attentäter aufgedeckt!',
};

export function Sidebar({
  game,
  redScore,
  blueScore,
  isHost,
  onStartGame,
  onEndTurn,
  onRestartGame,
  children,
}: SidebarProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(game.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="room-code-label">Raumcode</div>
        <button className="room-code" onClick={copyRoomCode} title="Klicken zum Kopieren">
          <span>{game.room_code}</span>
          <span className="copy-hint">{copied ? '✓ Kopiert' : 'Kopieren'}</span>
        </button>
      </div>

      <div className="sidebar-section score-section">
        <div className="score-badge score-red">Rot: {redScore}</div>
        <div className="score-badge score-blue">Blau: {blueScore}</div>
      </div>

      {game.status === 'playing' && (
        <div className={`turn-indicator turn-${game.current_team}`}>
          Am Zug: {game.current_team === 'red' ? 'Rotes Team' : 'Blaues Team'}
        </div>
      )}

      {game.status === 'waiting' && (
        <div className="status-waiting">
          Wartet auf Spielstart…
        </div>
      )}

      {game.status === 'finished' && game.winner && (
        <div className={`winner-banner winner-${game.winner}`}>
          <div className="winner-title">
            {game.winner === 'red' ? '🔴 Rotes Team gewinnt!' : '🔵 Blaues Team gewinnt!'}
          </div>
          {game.end_reason && (
            <div className="winner-reason">{END_REASON_LABELS[game.end_reason]}</div>
          )}
        </div>
      )}

      {isHost && (
        <div className="sidebar-section actions">
          {game.status === 'waiting' && (
            <button className="btn btn-primary" onClick={onStartGame}>
              Spiel starten
            </button>
          )}
          {game.status === 'playing' && (
            <button className="btn btn-secondary" onClick={onEndTurn}>
              Zug beenden
            </button>
          )}
          {game.status !== 'waiting' && (
            <button className="btn btn-muted" onClick={onRestartGame}>
              Neu starten
            </button>
          )}
        </div>
      )}

      {children}
    </aside>
  );
}
