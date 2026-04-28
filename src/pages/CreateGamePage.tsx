import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { generateRoomCode, distributeColors } from '../lib/utils';
import { useLocalPlayerContext } from '../context/LocalPlayerContext';

export function CreateGamePage() {
  const navigate = useNavigate();
  const { localPlayer } = useLocalPlayerContext();

  const [words, setWords] = useState<string[]>(Array(25).fill(''));
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWord = (index: number, value: string) => {
    const updated = [...words];
    updated[index] = value;
    setWords(updated);
  };

  const handleCreate = async () => {
    setError(null);

    if (!localPlayer.name.trim()) {
      setError('Bitte gib zuerst deinen Namen auf der Startseite ein.');
      return;
    }

    const trimmed = words.map((w) => w.trim());
    const emptyCount = trimmed.filter((w) => w === '').length;
    if (emptyCount > 0) {
      setError(`Bitte fülle alle 25 Felder aus. Noch ${emptyCount} leer.`);
      return;
    }

    const lower = trimmed.map((w) => w.toLowerCase());
    const unique = new Set(lower);
    if (unique.size < 25) {
      setError('Alle 25 Begriffe müssen einzigartig sein (Groß-/Kleinschreibung ignoriert).');
      return;
    }

    setCreating(true);

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
    const colors = distributeColors();
    const { error: cardsError } = await supabase.from('cards').insert(
      trimmed.map((word, i) => ({
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
        Gib genau 25 Begriffe ein — einen pro Feld. Alle Felder müssen ausgefüllt und einzigartig sein.
      </p>

      <div className="words-grid">
        {words.map((word, i) => (
          <input
            key={i}
            className="input word-input"
            type="text"
            value={word}
            onChange={(e) => updateWord(i, e.target.value)}
            placeholder={`${i + 1}`}
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const inputs = document.querySelectorAll<HTMLInputElement>('.word-input');
                inputs[i + 1]?.focus();
              }
            }}
          />
        ))}
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
