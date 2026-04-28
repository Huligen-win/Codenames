import { useState, type ReactNode } from 'react';
import type { Game, TeamOrSpectator } from '../lib/types';

interface SidebarProps {
  game: Game;
  redScore: number;
  blueScore: number;
  isHost: boolean;
  isSpymaster: boolean;
  myTeam: TeamOrSpectator;
  canEndTurn: boolean;
  onStartGame: () => void;
  onEndTurn: () => void;
  onRestartGame: () => void;
  onGiveClue: (word: string, number: number) => void;
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
  isSpymaster,
  myTeam,
  canEndTurn,
  onStartGame,
  onEndTurn,
  onRestartGame,
  onGiveClue,
  children,
}: SidebarProps) {
  const [copied, setCopied] = useState(false);
  const [clueWord, setClueWord] = useState('');
  const [clueNumber, setClueNumber] = useState(1);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(game.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard nicht verfügbar
    }
  };

  const handleGiveClue = () => {
    const word = clueWord.trim();
    if (!word) return;
    onGiveClue(word, clueNumber);
    setClueWord('');
    setClueNumber(1);
  };

  const isMyTeamActive = myTeam === game.current_team;
  const showClueForm =
    game.status === 'playing' &&
    game.turn_phase === 'clue' &&
    isSpymaster &&
    isMyTeamActive;
  const showClueWaiting =
    game.status === 'playing' &&
    game.turn_phase === 'clue' &&
    !showClueForm;
  const showClueDisplay = game.status === 'playing' && game.turn_phase === 'guess';

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

      {showClueForm && (
        <div className={`clue-form clue-form-${game.current_team}`}>
          <div className="clue-form-label">Dein Hinweis</div>
          <input
            className="clue-word-input"
            type="text"
            placeholder="Hinweiswort…"
            value={clueWord}
            onChange={(e) => setClueWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGiveClue()}
            maxLength={30}
            autoFocus
          />
          <div className="clue-number-row">
            <label className="clue-number-label">Anzahl</label>
            <select
              className="clue-number-select"
              value={clueNumber}
              onChange={(e) => setClueNumber(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={0}>∞</option>
            </select>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleGiveClue}
            disabled={!clueWord.trim()}
          >
            Hinweis geben
          </button>
        </div>
      )}

      {showClueWaiting && (
        <div className={`clue-waiting clue-waiting-${game.current_team}`}>
          Wartet auf Hinweis von {game.current_team === 'red' ? 'Rot' : 'Blau'}…
        </div>
      )}

      {showClueDisplay && game.current_clue_word && (
        <div className={`clue-display clue-display-${game.current_team}`}>
          <div className="clue-display-label">Aktueller Hinweis</div>
          <div className="clue-display-content">
            <span className="clue-display-word">{game.current_clue_word}</span>
            <span className="clue-display-number">
              {game.current_clue_number === 0 ? '∞' : game.current_clue_number}
            </span>
          </div>
          {game.guesses_remaining != null && (
            <div className="clue-display-remaining">
              Noch {game.guesses_remaining} Versuch{game.guesses_remaining !== 1 ? 'e' : ''}
            </div>
          )}
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

      <div className="sidebar-section actions">
        {isHost && game.status === 'waiting' && (
          <button className="btn btn-primary" onClick={onStartGame}>
            Spiel starten
          </button>
        )}
        {canEndTurn && game.status === 'playing' && (
          <button className="btn btn-secondary" onClick={onEndTurn}>
            Zug beenden
          </button>
        )}
        {isHost && game.status !== 'waiting' && (
          <button className="btn btn-muted" onClick={onRestartGame}>
            Neu starten
          </button>
        )}
      </div>

      {children}
    </aside>
  );
}
