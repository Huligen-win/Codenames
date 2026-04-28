import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Game } from '../lib/types';

export function useGame(roomCode: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode)
        .maybeSingle();

      if (fetchError) {
        setError('Fehler beim Laden des Spiels.');
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Raum nicht gefunden.');
        setLoading(false);
        return;
      }

      setGame(data as Game);
      setLoading(false);

      channel = supabase
        .channel(`game-${data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${data.id}`,
          },
          (payload) => {
            setGame(payload.new as Game);
          }
        )
        .subscribe();
    };

    init();

    return () => {
      channel?.unsubscribe();
    };
  }, [roomCode]);

  return { game, loading, error };
}
