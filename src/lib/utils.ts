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

export function distributeColors(size: 16 | 25 = 25): CardColor[] {
  const colors: CardColor[] =
    size === 16
      ? [...Array<CardColor>(5).fill('red'), ...Array<CardColor>(4).fill('blue'), ...Array<CardColor>(6).fill('neutral'), 'assassin']
      : [...Array<CardColor>(9).fill('red'), ...Array<CardColor>(8).fill('blue'), ...Array<CardColor>(7).fill('neutral'), 'assassin'];
  return shuffleArray(colors);
}
