import type { CardColor } from './types';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function distributeColors(): CardColor[] {
  const colors: CardColor[] = [
    ...Array<CardColor>(9).fill('red'),
    ...Array<CardColor>(8).fill('blue'),
    ...Array<CardColor>(7).fill('neutral'),
    'assassin',
  ];
  return shuffleArray(colors);
}
