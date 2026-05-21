import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateRoomCode, distributeColors, shuffleArray } from '../lib/utils';
import { useLocalPlayerContext } from '../context/LocalPlayerContext';

export function CreateGamePage() {
  const navigate = useNavigate();
  const { localPlayer } = useLocalPlayerContext();

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<16 | 25>(25);

  const handleCreate = async () => {
    setError(null);

    if (!localPlayer.name.trim()) {
      setError('Bitte gib zuerst deinen Namen auf der Startseite ein.');
      return;
    }

    setCreating(true);

    const { data: wordRows, error: wordError } = await supabase
      .from('word_pool')
      .select('word');

    if (wordError || !wordRows || wordRows.length < boardSize) {
      setError(
        wordRows && wordRows.length < boardSize
          ? `Nicht genug Wörter in der Datenbank (${wordRows?.length ?? 0} vorhanden, ${boardSize} benötigt).`
          : 'Fehler beim Laden der Wörter. Bitte erneut versuchen.'
      );
      setCreating(false);
      return;
    }

    const selected = shuffleArray(wordRows.map((r) => r.word)).slice(0, boardSize);

    // Raumcode mit Kollisionsbehandlung (max. 3 Versuche)
    let roomCode = generateRoomCode();
    let gameId: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          host_id: localPlayer.id,
          status: 'waiting',
          current_team: 'red',
        })
        .select('id')
        .single();

      if (!gameError) {
        gameId = game.id;
        break;
      }
      if (gameError.code === '23505') {
        roomCode = generateRoomCode();
        continue;
      }
      setError('Fehler beim Erstellen des Spiels. Bitte erneut versuchen.');
      setCreating(false);
      return;
    }

    if (!gameId) {
      setError('Raumcode konnte nicht erstellt werden. Bitte erneut versuchen.');
      setCreating(false);
      return;
    }

    // Host als Spieler eintragen
    const { error: playerError } = await supabase.from('players').insert({
      game_id: gameId,
      local_player_id: localPlayer.id,
      name: localPlayer.name,
      team: 'red',
      role: 'spymaster',
    });

    if (playerError) {
      setError('Fehler beim Eintragen als Spieler. Bitte erneut versuchen.');
      setCreating(false);
      return;
    }

    // Karten erzeugen
    const colors = distributeColors(boardSize);
    const { error: cardsError } = await supabase.from('cards').insert(
      selected.map((word, i) => ({
        game_id: gameId,
        word,
        color: colors[i],
        position: i,
      }))
    );

    if (cardsError) {
      setError('Fehler beim Erstellen der Karten. Bitte erneut versuchen.');
      setCreating(false);
      return;
    }

    navigate(`/game/${roomCode}`);
  };

  return (
    <div className="page-padded">
      <div className="create-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Zurück
        </button>
        <h1>Neues Spiel erstellen</h1>
      </div>

      <p className="create-hint">
        Zufällige Begriffe aus dem Kurs-Wortschatz werden automatisch ausgewählt.
      </p>

      <div className="board-size-selector">
        <div className="board-size-label">Spielfeldgröße</div>
        <div className="board-size-options">
          <button
            className={`board-size-btn${boardSize === 25 ? ' board-size-btn-active' : ''}`}
            onClick={() => setBoardSize(25)}
            type="button"
          >
            <span className="board-size-grid">5×5</span>
            <span className="board-size-desc">25 Karten</span>
          </button>
          <button
            className={`board-size-btn${boardSize === 16 ? ' board-size-btn-active' : ''}`}
            onClick={() => setBoardSize(16)}
            type="button"
          >
            <span className="board-size-grid">4×4</span>
            <span className="board-size-desc">16 Karten</span>
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        className="btn btn-primary btn-create"
        onClick={handleCreate}
        disabled={creating}
      >
        {creating ? 'Erstelle Spiel…' : 'Spiel erstellen'}
      </button>
    </div>
  );
}
