/**
 * Every client derives the same "night" from the wall clock, so the whole bar
 * shares one timeline without needing a game server.
 * A night runs from 8:00 PM to 2:00 AM in bar time.
 */
const minutes = Number(import.meta.env.VITE_NIGHT_MINUTES ?? 20);
export const NIGHT_MS = Math.max(1, minutes) * 60_000;
export const LAST_CALL_AT = 0.88;

export interface NightClock {
  nightId: number;
  progress: number; // 0..1
  remainingMs: number;
  barTime: string; // "10:42 PM"
  lastCall: boolean;
}

export function nightClock(now = Date.now()): NightClock {
  const nightId = Math.floor(now / NIGHT_MS);
  const elapsed = now - nightId * NIGHT_MS;
  const progress = elapsed / NIGHT_MS;
  const barMinutes = 20 * 60 + progress * 6 * 60; // 20:00 -> 02:00
  const h24 = Math.floor(barMinutes / 60) % 24;
  const m = Math.floor(barMinutes % 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const barTime = `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 && h24 < 24 ? 'PM' : 'AM'}`;
  return { nightId, progress, remainingMs: NIGHT_MS - elapsed, barTime, lastCall: progress >= LAST_CALL_AT };
}

export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
