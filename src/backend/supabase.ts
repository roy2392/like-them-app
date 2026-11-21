/**
 * Production backend: Supabase Auth (multi-user accounts), Postgres (characters,
 * drinks, dates, messages — protected by row level security) and Realtime
 * (presence + broadcast for the live bar).
 * Schema: supabase/migrations/0001_init.sql
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
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
import type { Backend, RoomConnection, Session } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const toCharacter = (r: Row): Character => ({
  id: r.id,
  name: r.name,
  gender: r.gender,
  lookingFor: r.looking_for,
  age: r.age,
  bio: r.bio ?? '',
  appearance: r.appearance,
  xp: r.xp,
  drinksShared: r.drinks_shared,
  dates: r.dates,
  nights: r.nights,
});
const toOffer = (r: Row): DrinkOffer => ({ id: r.id, fromId: r.from_id, toId: r.to_id, drink: r.drink, status: r.status, createdAt: r.created_at });
const toInvite = (r: Row): DateInvite => ({ id: r.id, fromId: r.from_id, toId: r.to_id, venue: r.venue, status: r.status, createdAt: r.created_at });
const toMessage = (r: Row): DateMessage => ({ id: String(r.id), inviteId: r.invite_id, senderId: r.sender_id, body: r.body, createdAt: r.created_at });

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey);
  let cachedSession: Session | null = null;

  const toSession = (s: { user: { id: string; email?: string } } | null): Session | null =>
    s ? { userId: s.user.id, email: s.user.email ?? '' } : null;

  const me = async (): Promise<string> => {
    if (cachedSession) return cachedSession.userId;
    const { data } = await sb.auth.getSession();
    cachedSession = toSession(data.session);
    if (!cachedSession) throw new Error('Not signed in');
    return cachedSession.userId;
  };

  return {
    mode: 'supabase',

    async getSession() {
      const { data } = await sb.auth.getSession();
      cachedSession = toSession(data.session);
      return cachedSession;
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => {
        cachedSession = toSession(s);
        cb(cachedSession);
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) throw new Error(error.message);
      return { needsConfirmation: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async getMyCharacter() {
      const id = await me();
      const data = check<Row | null>(await sb.from('characters').select('*').eq('id', id).maybeSingle());
      return data ? toCharacter(data) : null;
    },
    async getCharacters(ids) {
      if (!ids.length) return [];
      return check(await sb.from('characters').select('*').in('id', ids)).map(toCharacter);
    },
    async createCharacter(input: CharacterInput) {
      const id = await me();
      const row = { id, name: input.name, gender: input.gender, looking_for: input.lookingFor, age: input.age, bio: input.bio, appearance: input.appearance };
      return toCharacter(check(await sb.from('characters').insert(row).select('*').single()));
    },
    async updateCharacter(patch: CharacterPatch) {
      const id = await me();
      const row: Row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.lookingFor !== undefined) row.looking_for = patch.lookingFor;
      if (patch.bio !== undefined) row.bio = patch.bio;
      if (patch.appearance !== undefined) row.appearance = patch.appearance;
      return toCharacter(check(await sb.from('characters').update(row).eq('id', id).select('*').single()));
    },
    async checkIn() {
      // The server enforces at most one check-in per 10 minutes.
      check<unknown>(await sb.rpc('check_in'));
    },

    async sendDrink(toId, drink) {
      const id = await me();
      return toOffer(check(await sb.from('drink_offers').insert({ from_id: id, to_id: toId, drink }).select('*').single()));
    },
    async answerDrink(offerId, accept) {
      return toOffer(
        check(await sb.from('drink_offers').update({ status: accept ? 'accepted' : 'declined' }).eq('id', offerId).select('*').single()),
      );
    },
    async drinksSince(sinceIso) {
      const id = await me();
      return check(
        await sb
          .from('drink_offers')
          .select('*')
          .eq('status', 'accepted')
          .gte('created_at', sinceIso)
          .or(`from_id.eq.${id},to_id.eq.${id}`),
      ).map(toOffer);
    },

    async sendInvite(toId, venue) {
      const id = await me();
      return toInvite(check(await sb.from('date_invites').insert({ from_id: id, to_id: toId, venue }).select('*').single()));
    },
    async answerInvite(inviteId, accept) {
      return toInvite(
        check(await sb.from('date_invites').update({ status: accept ? 'accepted' : 'declined' }).eq('id', inviteId).select('*').single()),
      );
    },
    async listInvites() {
      return check(await sb.from('date_invites').select('*').order('created_at', { ascending: false }).limit(100)).map(toInvite);
    },

    async listMessages(inviteId) {
      return check(await sb.from('messages').select('*').eq('invite_id', inviteId).order('id').limit(500)).map(toMessage);
    },
    async sendMessage(inviteId, body) {
      const id = await me();
      check(await sb.from('messages').insert({ invite_id: inviteId, sender_id: id, body: body.slice(0, 500) }));
    },
    subscribeMessages(inviteId, cb) {
      const ch = sb
        .channel('messages:' + inviteId)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `invite_id=eq.${inviteId}` }, (p) =>
          cb(toMessage(p.new as Row)),
        )
        .subscribe();
      return () => void sb.removeChannel(ch);
    },

    async listBlocked() {
      return check(await sb.from('blocks').select('blocked_id')).map((r: Row) => r.blocked_id as string);
    },
    async block(userId) {
      const id = await me();
      check(await sb.from('blocks').upsert({ blocker_id: id, blocked_id: userId }));
    },
    async report(userId, reason) {
      const id = await me();
      check(await sb.from('reports').insert({ reporter_id: id, reported_id: userId, reason }));
    },

    joinRoom(roomId, meState, h): RoomConnection {
      let self: PlayerState = { ...meState };
      const ch: RealtimeChannel = sb.channel('bar:' + roomId, {
        config: { private: true, presence: { key: self.id }, broadcast: { self: false } },
      });

      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<PlayerState>();
        const players: PlayerState[] = [];
        for (const [key, metas] of Object.entries(state)) {
          if (key === self.id || !metas.length) continue;
          // The newest meta wins if someone has two tabs open.
          players.push(metas.reduce((a, b) => (b.t > a.t ? b : a)));
        }
        h.onPlayers(players);
      })
        .on('broadcast', { event: 'move' }, ({ payload }) => h.onMove(payload.id, payload.x, payload.y, payload.t))
        .on('broadcast', { event: 'chat' }, ({ payload }) => h.onChat(payload as ChatMessage))
        .on('broadcast', { event: 'emote' }, ({ payload }) => h.onEmote(payload.id, payload.emote))
        .on('broadcast', { event: 'drink' }, ({ payload }) => h.onDrinkHeld(payload.id, payload.drink))
        .on('broadcast', { event: 'offer' }, ({ payload }) => payload.toId === self.id && h.onOffer(payload as DrinkOffer))
        .on('broadcast', { event: 'answered' }, ({ payload }) => payload.fromId === self.id && h.onOfferAnswered(payload as DrinkOffer))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') void ch.track(self);
        });

      let trackTimer: ReturnType<typeof setTimeout> | undefined;
      const retrack = () => {
        clearTimeout(trackTimer);
        trackTimer = setTimeout(() => void ch.track(self), 400);
      };
      const send = (event: string, payload: unknown) => void ch.send({ type: 'broadcast', event, payload });

      return {
        move(x, y) {
          const t = Date.now();
          self = { ...self, x, y, t };
          send('move', { id: self.id, x, y, t });
          retrack();
        },
        chat(text) {
          send('chat', { id: crypto.randomUUID(), from: self.id, name: self.name, text: text.slice(0, 200), ts: Date.now() } satisfies ChatMessage);
        },
        emote(emote) {
          send('emote', { id: self.id, emote });
        },
        holdDrink(drink) {
          self = { ...self, drink };
          send('drink', { id: self.id, drink });
          retrack();
        },
        notifyOffer(offer) {
          send('offer', offer);
        },
        notifyOfferAnswered(offer) {
          send('answered', offer);
        },
        leave() {
          clearTimeout(trackTimer);
          void ch.untrack();
          void sb.removeChannel(ch);
        },
      };
    },
  };
}
