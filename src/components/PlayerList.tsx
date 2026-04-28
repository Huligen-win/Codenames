import type { Player, TeamOrSpectator, Role } from '../lib/types';

interface PlayerListProps {
  players: Player[];
  localPlayerId: string;
  onUpdatePlayer: (playerId: string, patch: Partial<Pick<Player, 'team' | 'role'>>) => void;
}

function PlayerRow({
  player,
  isMe,
  onUpdatePlayer,
}: {
  player: Player;
  isMe: boolean;
  onUpdatePlayer: PlayerListProps['onUpdatePlayer'];
}) {
  return (
    <div className={`player-row${isMe ? ' player-me' : ''}`}>
      <span className="player-name">
        {player.name}
        {isMe && ' (du)'}
      </span>
      <div className="player-controls">
        <select
          className="select-sm"
          value={player.team}
          onChange={(e) =>
            onUpdatePlayer(player.id, { team: e.target.value as TeamOrSpectator })
          }
        >
          <option value="red">Rot</option>
          <option value="blue">Blau</option>
          <option value="spectator">Zuschauer</option>
        </select>
        <select
          className="select-sm"
          value={player.role}
          onChange={(e) =>
            onUpdatePlayer(player.id, { role: e.target.value as Role })
          }
        >
          <option value="operative">Ermittler</option>
          <option value="spymaster">Chef</option>
        </select>
      </div>
    </div>
  );
}

export function PlayerList({ players, localPlayerId, onUpdatePlayer }: PlayerListProps) {
  const redPlayers = players.filter((p) => p.team === 'red');
  const bluePlayers = players.filter((p) => p.team === 'blue');
  const spectators = players.filter((p) => p.team === 'spectator');

  return (
    <div className="player-list">
      <h3>Spieler ({players.length}/16)</h3>

      {redPlayers.length > 0 && (
        <div className="team-section team-section-red">
          <div className="team-label">Rotes Team</div>
          {redPlayers.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              isMe={p.local_player_id === localPlayerId}
              onUpdatePlayer={onUpdatePlayer}
            />
          ))}
        </div>
      )}

      {bluePlayers.length > 0 && (
        <div className="team-section team-section-blue">
          <div className="team-label">Blaues Team</div>
          {bluePlayers.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              isMe={p.local_player_id === localPlayerId}
              onUpdatePlayer={onUpdatePlayer}
            />
          ))}
        </div>
      )}

      {spectators.length > 0 && (
        <div className="team-section">
          <div className="team-label">Zuschauer</div>
          {spectators.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              isMe={p.local_player_id === localPlayerId}
              onUpdatePlayer={onUpdatePlayer}
            />
          ))}
        </div>
      )}

      {players.length === 0 && (
        <p className="text-muted">Noch keine Spieler.</p>
      )}
    </div>
  );
}
