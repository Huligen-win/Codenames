import { createContext, useContext } from 'react';
import type { LocalPlayer } from '../lib/types';

interface LocalPlayerContextValue {
  localPlayer: LocalPlayer;
  setName: (name: string) => void;
}

export const LocalPlayerContext = createContext<LocalPlayerContextValue | null>(null);

export function useLocalPlayerContext(): LocalPlayerContextValue {
  const ctx = useContext(LocalPlayerContext);
  if (!ctx) throw new Error('useLocalPlayerContext muss innerhalb von LocalPlayerContext.Provider verwendet werden');
  return ctx;
}
