import type { Appearance, Character, Gender, LookingFor } from '../types';

export interface Item {
  id: string;
  label: string;
  minLevel: number;
}

export const SKIN_TONES = ['#fde0cc', '#f5c9a6', '#e8b088', '#c98d62', '#a5683f', '#7a4a2a', '#563220'];
export const HAIR_COLORS = ['#1b1414', '#3b2417', '#6b3e22', '#a8642f', '#d9a35b', '#f1d58f', '#b8b8c2', '#c0304a', '#6d4bd8', '#2fa3a0', '#ff7eb6'];
export const EYE_COLORS = ['#2b1a12', '#4a3020', '#2f5d8a', '#3f7a4a', '#7a6a3a', '#5a5a66'];
export const OUTFIT_COLORS = ['#e8436f', '#ff8a3d', '#f4c542', '#3ec7a7', '#3b82f6', '#7c4dff', '#1f2937', '#f5f5f5', '#9b1d3a', '#0f766e'];

export const HAIR_STYLES: Item[] = [
  { id: 'short', label: 'Short', minLevel: 1 },
  { id: 'buzz', label: 'Buzz', minLevel: 1 },
  { id: 'bob', label: 'Bob', minLevel: 1 },
  { id: 'long', label: 'Long', minLevel: 1 },
  { id: 'wavy', label: 'Wavy', minLevel: 1 },
  { id: 'curly', label: 'Curly', minLevel: 1 },
  { id: 'ponytail', label: 'Ponytail', minLevel: 1 },
  { id: 'bun', label: 'Top bun', minLevel: 1 },
  { id: 'afro', label: 'Afro', minLevel: 1 },
  { id: 'quiff', label: 'Quiff', minLevel: 2 },
  { id: 'mohawk', label: 'Mohawk', minLevel: 3 },
];

export const OUTFITS: Item[] = [
  { id: 'tee', label: 'T-shirt & jeans', minLevel: 1 },
  { id: 'hoodie', label: 'Hoodie', minLevel: 1 },
  { id: 'dress', label: 'Cocktail dress', minLevel: 1 },
  { id: 'blazer', label: 'Smart blazer', minLevel: 1 },
  { id: 'leather', label: 'Leather jacket', minLevel: 2 },
  { id: 'suit', label: 'Sharp suit', minLevel: 3 },
  { id: 'sequin', label: 'Sequin dress', minLevel: 4 },
  { id: 'tux', label: 'Tuxedo', minLevel: 6 },
];

export const ACCESSORIES: Item[] = [
  { id: 'none', label: 'None', minLevel: 1 },
  { id: 'glasses', label: 'Glasses', minLevel: 1 },
  { id: 'earrings', label: 'Earrings', minLevel: 1 },
  { id: 'flower', label: 'Flower', minLevel: 1 },
  { id: 'bowtie', label: 'Bow tie', minLevel: 1 },
  { id: 'sunglasses', label: 'Shades', minLevel: 2 },
  { id: 'hat', label: 'Fedora', minLevel: 4 },
  { id: 'crown', label: 'Crown', minLevel: 8 },
];

export interface Drink extends Item {
  emoji: string;
}

export const DRINKS: Drink[] = [
  { id: 'mocktail', label: 'Virgin mojito', emoji: '🧃', minLevel: 1 },
  { id: 'beer', label: 'Craft beer', emoji: '🍺', minLevel: 1 },
  { id: 'wine', label: 'Glass of red', emoji: '🍷', minLevel: 1 },
  { id: 'martini', label: 'Martini', emoji: '🍸', minLevel: 1 },
  { id: 'whiskey', label: 'Old fashioned', emoji: '🥃', minLevel: 1 },
  { id: 'tropical', label: 'Mai tai', emoji: '🍹', minLevel: 2 },
  { id: 'champagne', label: 'Champagne', emoji: '🥂', minLevel: 3 },
  { id: 'signature', label: 'The "Like Them"', emoji: '💘', minLevel: 6 },
];

export interface Venue extends Item {
  emoji: string;
  blurb: string;
}

export const VENUES: Venue[] = [
  { id: 'rooftop', label: 'Rooftop terrace', emoji: '🌃', blurb: 'City lights and a quiet corner.', minLevel: 1 },
  { id: 'diner', label: 'Late-night diner', emoji: '🍟', blurb: 'Fries, milkshakes and real talk.', minLevel: 1 },
  { id: 'beach', label: 'Walk on the beach', emoji: '🌊', blurb: 'Moonlight, waves, bare feet.', minLevel: 2 },
  { id: 'jazz', label: 'Jazz club', emoji: '🎷', blurb: 'Low lights, slow songs.', minLevel: 4 },
];

export const EMOTES = ['👋', '😂', '😍', '🥂', '💃', '😉', '🔥', '🙈'];

export function drinkById(id: string | null | undefined): Drink | undefined {
  return DRINKS.find((d) => d.id === id);
}
export function venueById(id: string): Venue {
  return VENUES.find((v) => v.id === id) ?? VENUES[0];
}

export function defaultAppearance(gender: Gender): Appearance {
  return gender === 'woman'
    ? { skin: SKIN_TONES[1], hairStyle: 'long', hairColor: HAIR_COLORS[2], eyeColor: EYE_COLORS[1], outfit: 'dress', outfitColor: OUTFIT_COLORS[0], accessory: 'earrings' }
    : { skin: SKIN_TONES[2], hairStyle: 'short', hairColor: HAIR_COLORS[1], eyeColor: EYE_COLORS[0], outfit: 'blazer', outfitColor: OUTFIT_COLORS[4], accessory: 'none' };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomAppearance(gender: Gender): Appearance {
  const lvl1 = (items: Item[]) => items.filter((i) => i.minLevel === 1).map((i) => i.id);
  const outfits = lvl1(OUTFITS).filter((o) => (gender === 'man' ? o !== 'dress' : true));
  return {
    skin: pick(SKIN_TONES),
    hairStyle: pick(lvl1(HAIR_STYLES)),
    hairColor: pick(HAIR_COLORS.slice(0, 7)),
    eyeColor: pick(EYE_COLORS),
    outfit: pick(outfits),
    outfitColor: pick(OUTFIT_COLORS),
    accessory: pick(lvl1(ACCESSORIES)),
  };
}

/** Do two people's preferences match each other? */
export function isCompatible(a: { gender: Gender; lookingFor: LookingFor }, b: { gender: Gender; lookingFor: LookingFor }): boolean {
  const wants = (lf: LookingFor, g: Gender) => lf === 'everyone' || (lf === 'women' && g === 'woman') || (lf === 'men' && g === 'man');
  return wants(a.lookingFor, b.gender) && wants(b.lookingFor, a.gender);
}

export type { Character };
