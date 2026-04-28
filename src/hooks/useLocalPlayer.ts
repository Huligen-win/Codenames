import { useState } from 'react';
import type { LocalPlayer } from '../lib/types';

const STORAGE_KEY = 'codenames_local_player';

export function useLocalPlayer() {
  const [localPlayer, setLocalPlayer] = useState<LocalPlayer>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as LocalPlayer;
      } catch {
        // Beschädigter Eintrag — neu erstellen
      }
    }
    const fresh: LocalPlayer = { id: crypto.randomUUID(), name: '' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  });

  const setName = (name: string) => {
    const updated = { ...localPlayer, name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setLocalPlayer(updated);
  };

  return { localPlayer, setName };
}
