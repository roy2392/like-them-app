export type Gender = 'woman' | 'man';
export type LookingFor = 'women' | 'men' | 'everyone';

export interface Appearance {
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  outfit: string;
  outfitColor: string;
  accessory: string;
}

export interface Character {
  id: string;
  name: string;
  gender: Gender;
  lookingFor: LookingFor;
  age: number;
  bio: string;
  appearance: Appearance;
  xp: number;
  drinksShared: number;
  dates: number;
  nights: number;
  isBot?: boolean;
}

export type CharacterInput = Pick<Character, 'name' | 'gender' | 'lookingFor' | 'age' | 'bio' | 'appearance'>;
export type CharacterPatch = Partial<Pick<Character, 'name' | 'lookingFor' | 'bio' | 'appearance'>>;

/** What everyone in a room sees about a player. */
export interface PlayerState {
  id: string;
  name: string;
  gender: Gender;
  lookingFor: LookingFor;
  age: number;
  bio: string;
  appearance: Appearance;
  level: number;
  x: number;
  y: number;
  /** ms timestamp of the last position change, used to resolve stale updates */
  t: number;
  drink?: string | null;
  isBot?: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
}

export type Status = 'pending' | 'accepted' | 'declined';

export interface DrinkOffer {
  id: string;
  fromId: string;
  toId: string;
  drink: string;
  status: Status;
  createdAt: string;
}

export interface DateInvite {
  id: string;
  fromId: string;
  toId: string;
  venue: string;
  status: Status;
  createdAt: string;
}

export interface DateMessage {
  id: string;
  inviteId: string;
  senderId: string;
  body: string;
  createdAt: string;
}
