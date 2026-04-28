export type GameStatus = 'waiting' | 'playing' | 'finished';
export type Team = 'red' | 'blue';
export type TeamOrSpectator = Team | 'spectator';
export type CardColor = 'red' | 'blue' | 'neutral' | 'assassin';
export type Role = 'operative' | 'spymaster';
export type EndReason = 'all_red_found' | 'all_blue_found' | 'assassin';

export interface Game {
  id: string;
  room_code: string;
  host_id: string;
  status: GameStatus;
  current_team: Team;
  winner: Team | null;
  end_reason: EndReason | null;
  created_at: string;
}

export interface Card {
  id: string;
  game_id: string;
  word: string;
  color: CardColor;
  revealed: boolean;
  position: number;
}

export interface Player {
  id: string;
  game_id: string;
  local_player_id: string;
  name: string;
  team: TeamOrSpectator;
  role: Role;
  joined_at: string;
  last_seen: string;
}

export interface LocalPlayer {
  id: string;
  name: string;
}
