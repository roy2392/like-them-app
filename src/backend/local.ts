/**
 * Demo backend: no server needed. Accounts and progress live in localStorage,
 * the session lives in sessionStorage (so every browser tab can be a different
 * player), and the bar is shared between tabs with BroadcastChannel.
 * A few clearly-labelled demo regulars keep the bar lively.
 */
import { DRINKS, VENUES } from '../game/catalog';
import { levelFromXp, XP } from '../game/progression';
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
import type { Backend, RoomConnection, RoomHandlers, Session } from './types';

interface Db {
  users: Record<string, { id: string; hash: string }>;
  characters: Record<string, Character>;
  offers: DrinkOffer[];
  invites: DateInvite[];
  messages: DateMessage[];
  blocks: Record<string, string[]>;
  reports: { reporter: string; reported: string; reason: string; at: string }[];
  checkins: Record<string, number>;
}

/** Storage that falls back to memory when the browser blocks it (private mode, sandboxed frames). */
function safeStorage(get: () => Storage): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const mem = new Map<string, string>();
  const real = () => {
    try {
      return get();
    } catch {
      return null;
    }
  };
  return {
    getItem: (k) => {
      try {
        return real()?.getItem(k) ?? mem.get(k) ?? null;
      } catch {
        return mem.get(k) ?? null;
      }
    },
    setItem: (k, v) => {
      mem.set(k, v);
      try {
        real()?.setItem(k, v);
      } catch {
        /* memory only */
      }
    },
    removeItem: (k) => {
      mem.delete(k);
      try {
        real()?.removeItem(k);
      } catch {
        /* memory only */
      }
    },
  };
}
const local = safeStorage(() => localStorage);
const sessionStore = safeStorage(() => sessionStorage);

const DB_KEY = 'likethem-demo-db-v1';
const SESSION_KEY = 'likethem-demo-session';

function load(): Db {
  try {
    const raw = local.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* fall through */
  }
  return { users: {}, characters: {}, offers: [], invites: [], messages: [], blocks: {}, reports: [], checkins: {} };
}
function save(db: Db) {
  local.setItem(DB_KEY, JSON.stringify(db));
}
function mutate<T>(fn: (db: Db) => T): T {
  const db = load();
  const out = fn(db);
  save(db);
  return out;
}

const uid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function hash(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function award(db: Db, id: string, xp: number, extra: Partial<Pick<Character, 'drinksShared' | 'dates' | 'nights'>> = {}) {
  const c = db.characters[id];
  if (!c || c.isBot) return;
  c.xp += xp;
  if (extra.drinksShared) c.drinksShared += extra.drinksShared;
  if (extra.dates) c.dates += extra.dates;
  if (extra.nights) c.nights += extra.nights;
}

// ---------------------------------------------------------------- demo regulars

const BOTS: Character[] = [
  {
    id: 'bot-maya', name: 'Maya', gender: 'woman', lookingFor: 'men', age: 27, isBot: true,
    bio: 'Architect by day, karaoke menace by night. Ask me about my favourite bridge.',
    appearance: { skin: '#e8b088', hairStyle: 'wavy', hairColor: '#1b1414', eyeColor: '#4a3020', outfit: 'dress', outfitColor: '#e8436f', accessory: 'earrings' },
    xp: 400, drinksShared: 0, dates: 0, nights: 0,
  },
  {
    id: 'bot-leo', name: 'Leo', gender: 'man', lookingFor: 'women', age: 30, isBot: true,
    bio: 'Chef. I will judge your cocktail garnish, lovingly.',
    appearance: { skin: '#a5683f', hairStyle: 'quiff', hairColor: '#1b1414', eyeColor: '#2b1a12', outfit: 'leather', outfitColor: '#f4c542', accessory: 'none' },
    xp: 260, drinksShared: 0, dates: 0, nights: 0,
  },
  {
    id: 'bot-sofia', name: 'Sofia', gender: 'woman', lookingFor: 'everyone', age: 25, isBot: true,
    bio: 'Vinyl collector, terrible dancer, great listener.',
    appearance: { skin: '#fde0cc', hairStyle: 'bob', hairColor: '#c0304a', eyeColor: '#3f7a4a', outfit: 'blazer', outfitColor: '#7c4dff', accessory: 'glasses' },
    xp: 130, drinksShared: 0, dates: 0, nights: 0,
  },
  {
    id: 'bot-daniel', name: 'Daniel', gender: 'man', lookingFor: 'women', age: 29, isBot: true,
    bio: 'Surf instructor. Yes, I own more than one Hawaiian shirt.',
    appearance: { skin: '#f5c9a6', hairStyle: 'curly', hairColor: '#d9a35b', eyeColor: '#2f5d8a', outfit: 'tee', outfitColor: '#3ec7a7', accessory: 'sunglasses' },
    xp: 60, drinksShared: 0, dates: 0, nights: 0,
  },
  {
    id: 'bot-noa', name: 'Noa', gender: 'woman', lookingFor: 'men', age: 28, isBot: true,
    bio: 'Product designer. Collecting sunsets and bad puns.',
    appearance: { skin: '#7a4a2a', hairStyle: 'afro', hairColor: '#1b1414', eyeColor: '#2b1a12', outfit: 'sequin', outfitColor: '#f4c542', accessory: 'flower' },
    xp: 560, drinksShared: 0, dates: 0, nights: 0,
  },
  {
    id: 'bot-omar', name: 'Omar', gender: 'man', lookingFor: 'everyone', age: 32, isBot: true,
    bio: 'Jazz pianist. I take requests (within reason).',
    appearance: { skin: '#c98d62', hairStyle: 'short', hairColor: '#3b2417', eyeColor: '#4a3020', outfit: 'suit', outfitColor: '#1f2937', accessory: 'bowtie' },
    xp: 900, drinksShared: 0, dates: 0, nights: 0,
  },
];

const BOT_SPOTS = [
  [420, 400], [560, 395], [700, 400], [880, 395], [1040, 400], [1180, 400],
  [250, 560], [240, 780], [700, 640], [760, 680], [960, 760], [900, 800],
  [560, 840], [610, 880], [1300, 650], [1420, 720], [1340, 820], [1460, 880], [820, 520],
];

const BOT_LINES = [
  'This song is a vibe 🎶', 'Who picked the jukebox? Respect.', 'The bartender makes a mean martini.',
  'Anyone up for the dance floor?', 'First time here?', 'Cheers everyone! 🥂', 'Okay, who wants to dance?',
  'I love the lights in here.', 'Best spot in town, honestly.', 'Try the mai tai, trust me.',
];

const BOT_REPLIES = [
  'Haha, I was just thinking the same thing 😄', 'Tell me more!', 'Okay, that is adorable.',
  'Honestly this is the best part of my week.', 'So what do you do when you are not charming strangers at bars?',
  'Wait, really? 😂', 'I could stay here all night.', 'You have great taste, you know that?',
];

function hashNum(n: number): number {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Deterministic from the clock, so every tab sees the regulars in the same place. */
function botState(bot: Character, i: number, now = Date.now()): PlayerState {
  const period = 14_000 + i * 2_300;
  const slot = Math.floor((now + i * 5_000) / period);
  const [x, y] = BOT_SPOTS[hashNum(slot * 31 + i * 7) % BOT_SPOTS.length];
  const drinkSlot = Math.floor(now / 40_000) + i;
  const drink = hashNum(drinkSlot) % 3 === 0 ? null : DRINKS[hashNum(drinkSlot) % 5].id;
  return {
    id: bot.id, name: bot.name, gender: bot.gender, lookingFor: bot.lookingFor, age: bot.age, bio: bot.bio,
    appearance: bot.appearance, level: levelFromXp(bot.xp), x: x + ((i * 17) % 30) - 15, y: y + ((i * 11) % 16) - 8,
    t: slot * period, drink, isBot: true,
  };
}

// ---------------------------------------------------------------- backend

export function createLocalBackend(): Backend {
  const authListeners = new Set<(s: Session | null) => void>();
  const dbChannel = new BroadcastChannel('likethem-demo-db');
  const msgListeners = new Map<string, Set<(m: DateMessage) => void>>();
  let activeRoom: RoomHandlers | null = null;

  dbChannel.onmessage = (e) => {
    if (e.data?.type === 'msg') msgListeners.get(e.data.m.inviteId)?.forEach((cb) => cb(e.data.m));
  };

  const session = (): Session | null => {
    const raw = sessionStore.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  };
  const me = (): Session => {
    const s = session();
    if (!s) throw new Error('Not signed in');
    return s;
  };
  const setSession = (s: Session | null) => {
    if (s) sessionStore.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStore.removeItem(SESSION_KEY);
    authListeners.forEach((cb) => cb(s));
  };

  // Ensure bots exist in the db.
  mutate((db) => {
    for (const b of BOTS) if (!db.characters[b.id]) db.characters[b.id] = b;
  });

  const pushMessage = (m: DateMessage) => {
    mutate((db) => db.messages.push(m));
    dbChannel.postMessage({ type: 'msg', m });
    msgListeners.get(m.inviteId)?.forEach((cb) => cb(m));
  };

  const backend: Backend = {
    mode: 'demo',

    async getSession() {
      return session();
    },
    onAuthChange(cb) {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    async signUp(email, password) {
      email = email.trim().toLowerCase();
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      const h = await hash(email + ':' + password);
      const id = mutate((db) => {
        if (db.users[email]) throw new Error('That email already has an account. Try signing in.');
        const id = uid();
        db.users[email] = { id, hash: h };
        return id;
      });
      setSession({ userId: id, email });
      return { needsConfirmation: false };
    },
    async signIn(email, password) {
      email = email.trim().toLowerCase();
      const h = await hash(email + ':' + password);
      const u = load().users[email];
      if (!u || u.hash !== h) throw new Error('Wrong email or password.');
      setSession({ userId: u.id, email });
    },
    async signOut() {
      setSession(null);
    },

    async getMyCharacter() {
      const s = session();
      return s ? (load().characters[s.userId] ?? null) : null;
    },
    async getCharacters(ids) {
      const db = load();
      return ids.map((id) => db.characters[id]).filter(Boolean);
    },
    async createCharacter(input: CharacterInput) {
      const { userId } = me();
      return mutate((db) => {
        const c: Character = { ...input, id: userId, xp: 0, drinksShared: 0, dates: 0, nights: 0 };
        db.characters[userId] = c;
        return c;
      });
    },
    async updateCharacter(patch: CharacterPatch) {
      const { userId } = me();
      return mutate((db) => {
        const c = db.characters[userId];
        Object.assign(c, patch);
        return c;
      });
    },
    async checkIn(nightId) {
      const { userId } = me();
      mutate((db) => {
        if (db.checkins[userId] === nightId) return;
        db.checkins[userId] = nightId;
        award(db, userId, XP.nightOut, { nights: 1 });
      });
    },

    async sendDrink(toId, drink) {
      const { userId } = me();
      const offer: DrinkOffer = { id: uid(), fromId: userId, toId, drink, status: 'pending', createdAt: nowIso() };
      mutate((db) => {
        db.offers.push(offer);
        award(db, userId, XP.drinkSent);
      });
      if (toId.startsWith('bot-')) {
        // Demo regulars answer after a moment.
        void (async () => {
          await wait(1800 + Math.random() * 1800);
          const accepted = Math.random() < 0.85;
          const done = mutate((db) => {
            const o = db.offers.find((x) => x.id === offer.id)!;
            o.status = accepted ? 'accepted' : 'declined';
            if (accepted) award(db, userId, XP.drinkAccepted, { drinksShared: 1 });
            return { ...o };
          });
          activeRoom?.onOfferAnswered(done);
          if (accepted) activeRoom?.onDrinkHeld(toId, drink);
        })();
      }
      return offer;
    },
    async answerDrink(offerId, accept) {
      const { userId } = me();
      return mutate((db) => {
        const o = db.offers.find((x) => x.id === offerId);
        if (!o || o.toId !== userId) throw new Error('Offer not found');
        if (o.status !== 'pending') return { ...o };
        o.status = accept ? 'accepted' : 'declined';
        if (accept) {
          award(db, o.toId, XP.drinkAccepted, { drinksShared: 1 });
          award(db, o.fromId, XP.drinkAccepted, { drinksShared: 1 });
        }
        return { ...o };
      });
    },
    async drinksSince(sinceIso) {
      const { userId } = me();
      return load().offers.filter(
        (o) => o.status === 'accepted' && o.createdAt >= sinceIso && (o.fromId === userId || o.toId === userId),
      );
    },

    async sendInvite(toId, venue) {
      const { userId } = me();
      const db = load();
      const shared = db.offers.some(
        (o) => o.status === 'accepted' && ((o.fromId === userId && o.toId === toId) || (o.fromId === toId && o.toId === userId)),
      );
      if (!shared) throw new Error('Share a drink first.');
      const inv: DateInvite = { id: uid(), fromId: userId, toId, venue, status: 'pending', createdAt: nowIso() };
      mutate((d) => d.invites.push(inv));
      if (toId.startsWith('bot-')) {
        void (async () => {
          await wait(2500);
          mutate((d) => {
            const i = d.invites.find((x) => x.id === inv.id)!;
            i.status = 'accepted';
            award(d, userId, XP.dateAccepted, { dates: 1 });
          });
          const bot = BOTS.find((b) => b.id === toId)!;
          const v = VENUES.find((x) => x.id === venue)!;
          pushMessage({ id: uid(), inviteId: inv.id, senderId: toId, body: `${v.label}? I'd love that ${v.emoji} — ${bot.name}`, createdAt: nowIso() });
        })();
      }
      return inv;
    },
    async answerInvite(inviteId, accept) {
      const { userId } = me();
      return mutate((db) => {
        const i = db.invites.find((x) => x.id === inviteId);
        if (!i || i.toId !== userId) throw new Error('Invite not found');
        if (i.status !== 'pending') return { ...i };
        i.status = accept ? 'accepted' : 'declined';
        if (accept) {
          award(db, i.toId, XP.dateAccepted, { dates: 1 });
          award(db, i.fromId, XP.dateAccepted, { dates: 1 });
        }
        return { ...i };
      });
    },
    async listInvites() {
      const { userId } = me();
      return load()
        .invites.filter((i) => i.fromId === userId || i.toId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async listMessages(inviteId) {
      return load().messages.filter((m) => m.inviteId === inviteId);
    },
    async sendMessage(inviteId, body) {
      const { userId } = me();
      const inv = load().invites.find((i) => i.id === inviteId);
      if (!inv || inv.status !== 'accepted') throw new Error('This date is not on.');
      pushMessage({ id: uid(), inviteId, senderId: userId, body: body.slice(0, 500), createdAt: nowIso() });
      const other = inv.fromId === userId ? inv.toId : inv.fromId;
      if (other.startsWith('bot-')) {
        await wait(1500 + Math.random() * 2000);
        pushMessage({ id: uid(), inviteId, senderId: other, body: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)], createdAt: nowIso() });
      }
    },
    subscribeMessages(inviteId, cb) {
      if (!msgListeners.has(inviteId)) msgListeners.set(inviteId, new Set());
      msgListeners.get(inviteId)!.add(cb);
      return () => msgListeners.get(inviteId)?.delete(cb);
    },

    async listBlocked() {
      const s = session();
      return s ? (load().blocks[s.userId] ?? []) : [];
    },
    async block(userId) {
      const { userId: mine } = me();
      mutate((db) => {
        db.blocks[mine] = [...new Set([...(db.blocks[mine] ?? []), userId])];
      });
    },
    async report(userId, reason) {
      const { userId: mine } = me();
      mutate((db) => db.reports.push({ reporter: mine, reported: userId, reason, at: nowIso() }));
    },

    joinRoom(roomId, meState, h): RoomConnection {
      const ch = new BroadcastChannel('likethem-room-' + roomId);
      const peers = new Map<string, { state: PlayerState; seen: number }>();
      let self = { ...meState };
      let closed = false;
      activeRoom = h;

      const emit = () => {
        const bots = BOTS.map((b, i) => botState(b, i));
        h.onPlayers([...[...peers.values()].map((p) => p.state), ...bots]);
      };
      const post = (m: unknown) => !closed && ch.postMessage(m);

      ch.onmessage = (e) => {
        const m = e.data;
        switch (m.type) {
          case 'hello':
          case 'state': {
            const isNew = !peers.has(m.state.id);
            peers.set(m.state.id, { state: m.state, seen: Date.now() });
            if (m.type === 'hello') post({ type: 'state', state: self });
            if (isNew) emit();
            break;
          }
          case 'bye':
            peers.delete(m.id);
            emit();
            break;
          case 'move': {
            const p = peers.get(m.id);
            if (p) Object.assign(p.state, { x: m.x, y: m.y, t: m.t });
            h.onMove(m.id, m.x, m.y, m.t);
            break;
          }
          case 'chat':
            h.onChat(m.msg);
            break;
          case 'emote':
            h.onEmote(m.id, m.emote);
            break;
          case 'drink': {
            const p = peers.get(m.id);
            if (p) p.state.drink = m.drink;
            h.onDrinkHeld(m.id, m.drink);
            break;
          }
          case 'offer':
            if (m.offer.toId === self.id) h.onOffer(m.offer);
            break;
          case 'answered':
            if (m.offer.fromId === self.id) h.onOfferAnswered(m.offer);
            break;
        }
      };

      post({ type: 'hello', state: self });
      emit();

      // Heartbeat + prune.
      const beat = setInterval(() => {
        post({ type: 'state', state: self });
        let changed = false;
        for (const [id, p] of peers) if (Date.now() - p.seen > 7000) (peers.delete(id), (changed = true));
        if (changed) emit();
      }, 2000);

      // Regulars wander and chat.
      let lastPos = BOTS.map((b, i) => botState(b, i));
      let chatSlot = Math.floor(Date.now() / 11_000);
      const botTick = setInterval(() => {
        const now = Date.now();
        BOTS.forEach((b, i) => {
          const s = botState(b, i, now);
          if (s.x !== lastPos[i].x || s.y !== lastPos[i].y) h.onMove(s.id, s.x, s.y, now);
          if (s.drink !== lastPos[i].drink) h.onDrinkHeld(s.id, s.drink ?? null);
          lastPos[i] = s;
        });
        const slot = Math.floor(now / 11_000);
        if (slot !== chatSlot) {
          chatSlot = slot;
          if (hashNum(slot) % 2 === 0) {
            const bot = BOTS[hashNum(slot + 3) % BOTS.length];
            h.onChat({ id: 'botchat-' + slot, from: bot.id, name: bot.name, text: BOT_LINES[hashNum(slot + 9) % BOT_LINES.length], ts: now });
          }
        }
      }, 1000);

      // Occasionally a compatible regular sends you a drink.
      const myChar = load().characters[self.id];
      let botOfferTimer: ReturnType<typeof setTimeout>;
      const scheduleBotOffer = (delay: number) => {
        botOfferTimer = setTimeout(() => {
          if (closed) return;
          const candidates = BOTS.filter((b) => !myChar || b.lookingFor === 'everyone' || (b.lookingFor === 'women') === (myChar.gender === 'woman'));
          const bot = candidates[Math.floor(Math.random() * candidates.length)];
          if (bot) {
            const offer: DrinkOffer = { id: uid(), fromId: bot.id, toId: self.id, drink: DRINKS[Math.floor(Math.random() * 5)].id, status: 'pending', createdAt: nowIso() };
            mutate((db) => db.offers.push(offer));
            h.onOffer(offer);
          }
          scheduleBotOffer(60_000 + Math.random() * 60_000);
        }, delay);
      };
      scheduleBotOffer(20_000 + Math.random() * 15_000);

      const onUnload = () => post({ type: 'bye', id: self.id });
      window.addEventListener('beforeunload', onUnload);

      return {
        move(x, y) {
          const t = Date.now();
          self = { ...self, x, y, t };
          post({ type: 'move', id: self.id, x, y, t });
        },
        chat(text) {
          post({ type: 'chat', msg: { id: uid(), from: self.id, name: self.name, text, ts: Date.now() } satisfies ChatMessage });
        },
        emote(emote) {
          post({ type: 'emote', id: self.id, emote });
        },
        holdDrink(drink) {
          self = { ...self, drink };
          post({ type: 'drink', id: self.id, drink });
        },
        notifyOffer(offer) {
          post({ type: 'offer', offer });
        },
        notifyOfferAnswered(offer) {
          post({ type: 'answered', offer });
        },
        leave() {
          post({ type: 'bye', id: self.id });
          closed = true;
          clearInterval(beat);
          clearInterval(botTick);
          clearTimeout(botOfferTimer);
          window.removeEventListener('beforeunload', onUnload);
          ch.close();
          if (activeRoom === h) activeRoom = null;
        },
      };
    },
  };
  return backend;
}
