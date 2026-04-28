import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { distributeColors } from '../lib/utils';
import { useGame } from '../hooks/useGame';
import { useCards } from '../hooks/useCards';
import { usePlayers } from '../hooks/usePlayers';
import { useLocalPlayerContext } from '../context/LocalPlayerContext';
import { Board } from '../components/Board';
import { Sidebar } from '../components/Sidebar';
import { PlayerList } from '../components/PlayerList';
import type { Card, Player } from '../lib/types';

export function GameRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { localPlayer } = useLocalPlayerContext();

  const { game, loading: gameLoading, error: gameError } = useGame(roomCode ?? '');
  const { cards } = useCards(game?.id ?? null);
  const { players } = usePlayers(game?.id ?? null);

  const [joinError, setJoinError] = useState<string | null>(null);

  const me = players.find((p) => p.local_player_id === localPlayer.id);
  const isHost = game?.host_id === localPlayer.id;
  const isSpymaster = me?.role === 'spymaster';
  const myTeam = me?.team ?? 'spectator';
  const canEndTurn =
    game?.status === 'playing' &&
    (isHost || (me?.team === game.current_team && game.turn_phase === 'guess'));

  const redScore = cards.filter((c) => c.color === 'red' && !c.revealed).length;
  const blueScore = cards.filter((c) => c.color === 'blue' && !c.revealed).length;

  // Spieler beitreten oder nach Reload aktualisieren
  useEffect(() => {
    if (!game?.id || !localPlayer.id || !localPlayer.name) return;

    const joinOrRefresh = async () => {
      const { data: existing } = await supabase
        .from('players')
        .select('id')
        .eq('game_id', game.id)
        .eq('local_player_id', localPlayer.id)
        .maybeSingle();

      if (existing) {
        // Nur Name und last_seen aktualisieren — Team/Rolle nicht überschreiben
        await supabase
          .from('players')
          .update({ name: localPlayer.name, last_seen: new Date().toISOString() })
          .eq('game_id', game.id)
          .eq('local_player_id', localPlayer.id);
      } else {
        // Spielerlimit prüfen
        const { count } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('game_id', game.id);

        if ((count ?? 0) >= 16) {
          setJoinError('Dieser Raum ist voll (max. 16 Spieler).');
          return;
        }

        const { error: insertError } = await supabase.from('players').insert({
          game_id: game.id,
          local_player_id: localPlayer.id,
          name: localPlayer.name,
          team: 'spectator',
          role: 'operative',
          last_seen: new Date().toISOString(),
        });

        if (insertError) {
          setJoinError('Fehler beim Beitreten. Bitte Seite neu laden.');
        }
      }
    };

    joinOrRefresh();
  }, [game?.id, localPlayer.id, localPlayer.name]);

  // last_seen Heartbeat alle 30 Sekunden
  useEffect(() => {
    if (!localPlayer.id || !game?.id) return;

    const update = () => {
      supabase
        .from('players')
        .update({ last_seen: new Date().toISOString() })
        .eq('game_id', game.id)
        .eq('local_player_id', localPlayer.id)
        .then(() => {});
    };

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [localPlayer.id, game?.id]);

  const handleRevealCard = async (card: Card) => {
    if (!game || !me) return;
    await supabase.rpc('reveal_card', {
      p_local_player_id: localPlayer.id,
      p_game_id: game.id,
      p_card_id: card.id,
    });
  };

  const handleStartGame = async () => {
    if (!game || !isHost) return;
    const { error } = await supabase
      .from('games')
      .update({ status: 'playing' })
      .eq('id', game.id);
    if (error) alert('Fehler beim Starten des Spiels.');
  };

  const handleGiveClue = async (word: string, number: number) => {
    if (!game || !me) return;
    await supabase.rpc('give_clue', {
      p_local_player_id: localPlayer.id,
      p_game_id: game.id,
      p_word: word,
      p_number: number,
    });
  };

  const handleEndTurn = async () => {
    if (!game || !canEndTurn) return;
    const nextTeam = game.current_team === 'red' ? 'blue' : 'red';
    const { error } = await supabase
      .from('games')
      .update({
        current_team: nextTeam,
        turn_phase: 'clue',
        current_clue_word: null,
        current_clue_number: null,
        guesses_remaining: null,
      })
      .eq('id', game.id);
    if (error) alert('Fehler beim Beenden des Zugs.');
  };

  const handleRestartGame = async () => {
    if (!game || !isHost) return;
    if (!window.confirm('Neues Spiel mit gleichen Spielern starten?')) return;

    // Wörter synchron aus State lesen, BEVOR DELETE den Listener triggert
    const currentWords = [...cards]
      .sort((a, b) => a.position - b.position)
      .map((c) => c.word);

    const { error: deleteError } = await supabase
      .from('cards')
      .delete()
      .eq('game_id', game.id);

    if (deleteError) {
      alert('Fehler beim Zurücksetzen der Karten.');
      return;
    }

    const colors = distributeColors();
    const { error: insertError } = await supabase.from('cards').insert(
      currentWords.map((word, i) => ({
        game_id: game.id,
        word,
        color: colors[i],
        position: i,
      }))
    );

    if (insertError) {
      alert('Fehler beim Erstellen neuer Karten.');
      return;
    }

    const { error: resetError } = await supabase
      .from('games')
      .update({
        status: 'playing',
        current_team: 'red',
        winner: null,
        end_reason: null,
        turn_phase: 'clue',
        current_clue_word: null,
        current_clue_number: null,
        guesses_remaining: null,
      })
      .eq('id', game.id);

    if (resetError) {
      alert('Fehler beim Zurücksetzen des Spiels.');
    }
  };

  const handleUpdatePlayer = async (
    playerId: string,
    patch: Partial<Pick<Player, 'team' | 'role'>>
  ) => {
    await supabase.from('players').update(patch).eq('id', playerId);
  };

  if (gameLoading) {
    return (
      <div className="page-center">
        <p className="text-muted">Lade Spiel…</p>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="page-center">
        <div className="error-box">
          <p>{gameError ?? 'Spiel nicht gefunden.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (!localPlayer.name) {
    return (
      <div className="page-center">
        <div className="error-box">
          <p>Bitte gib deinen Namen ein, bevor du dem Spiel beitrittst.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="page-center">
        <div className="error-box">
          <p>{joinError}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout">
      <div className="board-area">
        {cards.length > 0 ? (
          <Board
            cards={cards}
            isSpymaster={isSpymaster ?? false}
            game={game}
            myTeam={myTeam}
            onReveal={handleRevealCard}
          />
        ) : (
          <p className="text-muted">Lade Karten…</p>
        )}
      </div>

      <Sidebar
        game={game}
        redScore={redScore}
        blueScore={blueScore}
        isHost={isHost}
        isSpymaster={isSpymaster ?? false}
        myTeam={myTeam}
        canEndTurn={canEndTurn ?? false}
        onStartGame={handleStartGame}
        onEndTurn={handleEndTurn}
        onRestartGame={handleRestartGame}
        onGiveClue={handleGiveClue}
      >
        <PlayerList
          players={players}
          localPlayerId={localPlayer.id}
          onUpdatePlayer={handleUpdatePlayer}
        />
      </Sidebar>
    </div>
  );
}
