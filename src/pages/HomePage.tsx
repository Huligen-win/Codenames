import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLocalPlayerContext } from '../context/LocalPlayerContext';

export function HomePage() {
  const navigate = useNavigate();
  const { localPlayer, setName } = useLocalPlayerContext();

  const [nameInput, setNameInput] = useState(localPlayer.name);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateName = (): boolean => {
    if (!nameInput.trim()) {
      setError('Bitte gib deinen Namen ein.');
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    setError(null);
    if (!validateName()) return;
    setName(nameInput.trim());
    navigate('/create');
  };

  const handleJoin = async () => {
    setError(null);
    if (!validateName()) return;
    if (!roomCodeInput.trim()) {
      setError('Bitte gib einen Raumcode ein.');
      return;
    }

    setLoading(true);
    setName(nameInput.trim());

    const { data, error: fetchError } = await supabase
      .from('games')
      .select('id')
      .eq('room_code', roomCodeInput.trim().toUpperCase())
      .maybeSingle();

    setLoading(false);

    if (fetchError) {
      setError('Fehler bei der Suche. Bitte erneut versuchen.');
      return;
    }
    if (!data) {
      setError('Raum nicht gefunden. Bitte Raumcode prüfen.');
      return;
    }

    navigate(`/game/${roomCodeInput.trim().toUpperCase()}`);
  };

  return (
    <div className="page-center">
      <div className="home-card">
        <h1 className="home-title">Codenames</h1>
        <p className="home-subtitle">Multiplayer-Wortspiel für den Kurs</p>

        <div className="form-group">
          <label className="form-label" htmlFor="name-input">
            Dein Name
          </label>
          <input
            id="name-input"
            className="input"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Name eingeben…"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="btn btn-primary btn-full"
          onClick={handleCreate}
          disabled={loading}
        >
          Neues Spiel erstellen
        </button>

        <div className="divider">oder</div>

        <div className="form-group">
          <label className="form-label" htmlFor="room-code-input">
            Raumcode eingeben
          </label>
          <input
            id="room-code-input"
            className="input input-mono"
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            placeholder="z. B. AB3CD7"
            maxLength={6}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <button
          className="btn btn-secondary btn-full"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Suchen…' : 'Spiel beitreten'}
        </button>
      </div>
    </div>
  );
}
