import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Card } from '../lib/types';

export function useCards(gameId: string | null) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('game_id', gameId)
        .order('position');

      if (data) setCards(data as Card[]);
      setLoading(false);

      channel = supabase
        .channel(`cards-${gameId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setCards((prev) => {
              const exists = prev.some((c) => c.id === (payload.new as Card).id);
              if (exists) {
                return prev.map((c) => (c.id === (payload.new as Card).id ? (payload.new as Card) : c));
              }
              return [...prev, payload.new as Card].sort((a, b) => a.position - b.position);
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setCards((prev) =>
              prev.map((c) => (c.id === (payload.new as Card).id ? (payload.new as Card) : c))
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'cards', filter: `game_id=eq.${gameId}` },
          (payload) => {
            setCards((prev) => prev.filter((c) => c.id !== (payload.old as { id: string }).id));
          }
        )
        .subscribe();
    };

    init();

    return () => {
      channel?.unsubscribe();
    };
  }, [gameId]);

  return { cards, loading };
}
