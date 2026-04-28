import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Player } from '../lib/types';

export function usePlayers(gameId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at');

      if (data) setPlayers(data as Player[]);
      setLoading(false);

      channel = supabase
        .channel(`players-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setPlayers((prev) => [...prev, payload.new as Player]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setPlayers((prev) =>
              prev.map((p) => (p.id === (payload.new as Player).id ? (payload.new as Player) : p))
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setPlayers((prev) => prev.filter((p) => p.id !== (payload.old as { id: string }).id));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      channel?.unsubscribe();
    };
  }, [gameId]);

  return { players, loading };
}
