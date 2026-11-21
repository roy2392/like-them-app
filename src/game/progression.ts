import type { Character } from '../types';

/** XP needed to reach each level (index 0 => level 1). Keep in sync with supabase migration. */
export const LEVEL_XP = [0, 50, 120, 220, 350, 520, 750, 1000, 1300, 1700];
export const MAX_LEVEL = LEVEL_XP.length;

export const XP = {
  drinkSent: 5,
  drinkAccepted: 20,
  dateAccepted: 50,
  nightOut: 10,
} as const;

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; pct: number } {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, needed: 0, pct: 1 };
  const base = LEVEL_XP[level - 1];
  const next = LEVEL_XP[level];
  return { level, into: xp - base, needed: next - base, pct: (xp - base) / (next - base) };
}

const TITLES = ['Newcomer', 'Newcomer', 'Regular', 'Regular', 'Charmer', 'Charmer', 'Smooth Operator', 'Heartthrob', 'Heartthrob', 'Legend of the Night'];
export function titleForLevel(level: number): string {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  hint: string;
  earned: boolean;
}

export function badgesFor(c: Character): Badge[] {
  const level = levelFromXp(c.xp);
  return [
    { id: 'first-round', emoji: '🍸', label: 'First Round', hint: 'Share your first drink', earned: c.drinksShared >= 1 },
    { id: 'butterfly', emoji: '🦋', label: 'Social Butterfly', hint: 'Share 10 drinks', earned: c.drinksShared >= 10 },
    { id: 'date-night', emoji: '🌙', label: 'Date Night', hint: 'Go on your first date', earned: c.dates >= 1 },
    { id: 'romantic', emoji: '💌', label: 'Hopeless Romantic', hint: 'Go on 5 dates', earned: c.dates >= 5 },
    { id: 'regular', emoji: '🗝️', label: 'The Regular', hint: 'Spend 5 nights at the bar', earned: c.nights >= 5 },
    { id: 'charmer', emoji: '✨', label: 'Charmer', hint: 'Reach level 5', earned: level >= 5 },
    { id: 'legend', emoji: '👑', label: 'Legend', hint: 'Reach level 10', earned: level >= 10 },
  ];
}
