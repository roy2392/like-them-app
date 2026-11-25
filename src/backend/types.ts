import type {
  Character,
  CharacterInput,
  CharacterPatch,
  ChatMessage,
  DateInvite,
  DateMessage,
  DrinkOffer,
  PlayerState,
} from '../types';

export interface Session {
  userId: string;
  email: string;
}

export interface AdminOverview {
  players: number;
  women: number;
  men: number;
  drinks_accepted: number;
  dates: number;
  reports: number;
}

export interface AdminReport {
  id: number;
  created_at: string;
  reason: string;
  reporter_name: string | null;
  reported_id: string;
  reported_name: string | null;
}

export interface RoomHandlers {
  /** Full list of players currently present (excluding self). */
  onPlayers(players: PlayerState[]): void;
  onMove(id: string, x: number, y: number, t: number): void;
  onChat(msg: ChatMessage): void;
  onEmote(id: string, emote: string): void;
  onDrinkHeld(id: string, drink: string | null): void;
  /** An offer addressed to me arrived. */
  onOffer(offer: DrinkOffer): void;
  /** Someone answered an offer I sent. */
  onOfferAnswered(offer: DrinkOffer): void;
}

export interface RoomConnection {
  move(x: number, y: number): void;
  chat(text: string): void;
  emote(emote: string): void;
  holdDrink(drink: string | null): void;
  notifyOffer(offer: DrinkOffer): void;
  notifyOfferAnswered(offer: DrinkOffer): void;
  leave(): void;
}

export interface Backend {
  mode: 'demo' | 'supabase';

  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  getMyCharacter(): Promise<Character | null>;
  getCharacters(ids: string[]): Promise<Character[]>;
  createCharacter(input: CharacterInput): Promise<Character>;
  updateCharacter(patch: CharacterPatch): Promise<Character>;
  /** Counts a night out (at most once per night). */
  checkIn(nightId: number): Promise<void>;

  sendDrink(toId: string, drink: string): Promise<DrinkOffer>;
  answerDrink(offerId: string, accept: boolean): Promise<DrinkOffer>;
  /** Accepted drinks I shared since the given time. */
  drinksSince(sinceIso: string): Promise<DrinkOffer[]>;

  sendInvite(toId: string, venue: string): Promise<DateInvite>;
  answerInvite(inviteId: string, accept: boolean): Promise<DateInvite>;
  listInvites(): Promise<DateInvite[]>;

  listMessages(inviteId: string): Promise<DateMessage[]>;
  sendMessage(inviteId: string, body: string): Promise<void>;
  subscribeMessages(inviteId: string, cb: (m: DateMessage) => void): () => void;

  listBlocked(): Promise<string[]>;
  block(userId: string): Promise<void>;
  report(userId: string, reason: string): Promise<void>;

  isAdmin(): Promise<boolean>;
  adminOverview(): Promise<AdminOverview>;
  adminReports(): Promise<AdminReport[]>;

  joinRoom(roomId: string, me: PlayerState, handlers: RoomHandlers): RoomConnection;
}
