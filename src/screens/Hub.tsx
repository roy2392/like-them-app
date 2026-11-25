import { useCallback, useEffect, useState } from 'react';
import { backend } from '../backend';
import { AdminPanel } from '../components/AdminPanel';
import { Avatar } from '../components/Avatar';
import { venueById } from '../game/catalog';
import { formatRemaining, nightClock } from '../game/night';
import { badgesFor, levelFromXp, levelProgress, titleForLevel } from '../game/progression';
import type { Character, DateInvite } from '../types';

interface Props {
  character: Character;
  onEnterBar: () => void;
  onWardrobe: () => void;
  onOpenDate: (invite: DateInvite, other: Character) => void;
  onCharacter: (c: Character) => void;
}

export function Hub({ character, onEnterBar, onWardrobe, onOpenDate, onCharacter }: Props) {
  const [invites, setInvites] = useState<DateInvite[]>([]);
  const [people, setPeople] = useState<Map<string, Character>>(new Map());
  const [clock, setClock] = useState(nightClock());
  const [admin, setAdmin] = useState(false);
  const prog = levelProgress(character.xp);
  const badges = badgesFor(character);

  const load = useCallback(async () => {
    const list = await backend.listInvites();
    const ids = [...new Set(list.map((i) => (i.fromId === character.id ? i.toId : i.fromId)))];
    const chars = await backend.getCharacters(ids);
    setPeople(new Map(chars.map((c) => [c.id, c])));
    setInvites(list);
    const me = await backend.getMyCharacter();
    if (me && me.xp !== character.xp) onCharacter(me);
  }, [character.id, character.xp, onCharacter]);

  useEffect(() => {
    let alive = true;
    backend.isAdmin().then((a) => alive && setAdmin(a));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 6000);
    const c = setInterval(() => setClock(nightClock()), 1000);
    return () => (clearInterval(t), clearInterval(c));
  }, [load]);

  const answer = async (inv: DateInvite, accept: boolean) => {
    await backend.answerInvite(inv.id, accept);
    await load();
  };

  const other = (i: DateInvite) => people.get(i.fromId === character.id ? i.toId : i.fromId);
  const incoming = invites.filter((i) => i.status === 'pending' && i.toId === character.id);
  const outgoing = invites.filter((i) => i.status === 'pending' && i.fromId === character.id);
  const dates = invites.filter((i) => i.status === 'accepted');

  return (
    <div className="screen hub">
      <header className="hub-header">
        <div className="neon-title small">Like Them</div>
        <div className="row gap">
          {backend.mode === 'demo' && <span className="pill">Demo mode</span>}
          <button className="btn link small" onClick={() => backend.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="hub-grid">
        <section className="panel glass hero-card">
          <div className="avatar-stage">
            <div className="spotlight" />
            <Avatar appearance={character.appearance} gender={character.gender} level={prog.level} size={280} />
          </div>
          <h2 className="display">{character.name}</h2>
          <div className="muted">
            Lv {prog.level} · {titleForLevel(prog.level)}
          </div>
          <div className="xp-bar big">
            <div style={{ width: `${prog.pct * 100}%` }} />
          </div>
          <div className="muted small">
            {prog.needed ? `${prog.into} / ${prog.needed} XP to level ${prog.level + 1}` : 'Max level — legendary.'}
          </div>
          <div className="stats">
            <div>
              <b>{character.drinksShared}</b>
              <span>drinks shared</span>
            </div>
            <div>
              <b>{character.dates}</b>
              <span>dates</span>
            </div>
            <div>
              <b>{character.nights}</b>
              <span>nights out</span>
            </div>
          </div>
          <button className="btn ghost small" onClick={onWardrobe}>
            👗 Wardrobe
          </button>
        </section>

        <section className="hub-main">
          <div className="panel glass enter-card">
            <div>
              <div className="eyebrow">Tonight at the bar · {clock.barTime}</div>
              <h2 className="display">{clock.lastCall ? 'Last call — hurry!' : 'The night is young'}</h2>
              <p className="muted">
                Doors close in {formatRemaining(clock.remainingMs)}. Buy drinks, make friends, and if there’s a spark, invite them somewhere after.
              </p>
            </div>
            <button className="btn primary big" onClick={onEnterBar}>
              Enter the bar 🍸
            </button>
          </div>

          {admin && <AdminPanel />}

          {incoming.length > 0 && (
            <div className="panel glass">
              <h3>Invitations for you 💌</h3>
              {incoming.map((i) => {
                const o = other(i);
                const v = venueById(i.venue);
                return (
                  <div key={i.id} className="invite-row">
                    {o && <Avatar appearance={o.appearance} gender={o.gender} level={levelFromXp(o.xp)} size={64} />}
                    <div className="grow">
                      <b>{o?.name ?? 'Someone'}</b> wants to keep the night going
                      <div className="muted small">
                        {v.emoji} {v.label} — {v.blurb}
                      </div>
                    </div>
                    <button className="btn primary small" onClick={() => answer(i, true)}>
                      Yes!
                    </button>
                    <button className="btn ghost small" onClick={() => answer(i, false)}>
                      Not this time
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel glass">
            <h3>Your dates</h3>
            {dates.length === 0 && outgoing.length === 0 && (
              <p className="muted small">No dates yet. Share a drink at the bar, then invite them out at the end of the night.</p>
            )}
            <div className="date-cards">
              {dates.map((i) => {
                const o = other(i);
                const v = venueById(i.venue);
                if (!o) return null;
                return (
                  <button key={i.id} className={`date-card venue-${v.id}`} onClick={() => onOpenDate(i, o)}>
                    <Avatar appearance={o.appearance} gender={o.gender} level={levelFromXp(o.xp)} size={90} />
                    <div>
                      <b>{o.name}</b>
                      <div className="small">
                        {v.emoji} {v.label}
                      </div>
                      <div className="small open-hint">Open chat →</div>
                    </div>
                  </button>
                );
              })}
              {outgoing.map((i) => {
                const o = other(i);
                const v = venueById(i.venue);
                return (
                  <div key={i.id} className="date-card pending">
                    {o && <Avatar appearance={o.appearance} gender={o.gender} level={levelFromXp(o.xp)} size={90} />}
                    <div>
                      <b>{o?.name}</b>
                      <div className="small">
                        {v.emoji} {v.label}
                      </div>
                      <div className="small muted">Waiting for an answer…</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel glass">
            <h3>Badges</h3>
            <div className="badges">
              {badges.map((b) => (
                <div key={b.id} className={`badge ${b.earned ? 'earned' : ''}`} title={b.hint}>
                  <span className="badge-emoji">{b.earned ? b.emoji : '🔒'}</span>
                  <span className="badge-label">{b.label}</span>
                  <span className="badge-hint">{b.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
