import { useEffect, useState } from 'react';
import { backend } from '../backend';
import { Avatar } from '../components/Avatar';
import { VENUES, drinkById } from '../game/catalog';
import { levelFromXp } from '../game/progression';
import type { Character } from '../types';

interface Partner {
  character: Character;
  drinks: string[];
}

/** Last call is over: decide who you'd like to keep the night going with. */
export function EndOfNight({ since, character, onDone }: { since: string; character: Character; onDone: () => void }) {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const level = levelFromXp(character.xp);

  useEffect(() => {
    void (async () => {
      const drinks = await backend.drinksSince(since);
      const byPerson = new Map<string, string[]>();
      for (const d of drinks) {
        const other = d.fromId === character.id ? d.toId : d.fromId;
        byPerson.set(other, [...(byPerson.get(other) ?? []), d.drink]);
      }
      const chars = await backend.getCharacters([...byPerson.keys()]);
      setPartners(chars.map((c) => ({ character: c, drinks: byPerson.get(c.id)! })));
    })();
  }, [since, character.id]);

  const invite = async (toId: string, venue: string) => {
    setError('');
    try {
      await backend.sendInvite(toId, venue);
      setSent((s) => ({ ...s, [toId]: venue }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="screen center night-end">
      <div className="stars" />
      <div className="panel glass wide">
        <div className="eyebrow">2:00 AM · The lights come up</div>
        <h1 className="display">That’s a wrap on tonight</h1>
        {partners === null ? (
          <p className="muted">Counting the glasses…</p>
        ) : partners.length === 0 ? (
          <>
            <p className="muted">
              You didn’t share a drink with anyone tonight. No stress — the bar opens again soon, and every night out earns you XP.
            </p>
          </>
        ) : (
          <>
            <p className="muted">You shared drinks with {partners.length === 1 ? 'someone' : `${partners.length} people`}. Want to keep the night going? If they say yes, it’s a date.</p>
            <div className="partner-list">
              {partners.map(({ character: p, drinks }) => (
                <div key={p.id} className="partner glass">
                  <Avatar appearance={p.appearance} gender={p.gender} level={levelFromXp(p.xp)} size={110} />
                  <div className="partner-body">
                    <h3>
                      {p.name}, {p.age}
                    </h3>
                    <div className="muted small">
                      Shared: {drinks.map((d) => drinkById(d)?.emoji).join(' ')}
                    </div>
                    {sent[p.id] ? (
                      <div className="sent-note">
                        ✓ Invite sent for {VENUES.find((v) => v.id === sent[p.id])?.label.toLowerCase()} — check your invites.
                      </div>
                    ) : (
                      <div className="venue-row">
                        {VENUES.map((v) => {
                          const locked = v.minLevel > level;
                          return (
                            <button key={v.id} className={`venue ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => invite(p.id, v.id)} title={v.blurb}>
                              <span className="venue-emoji">{v.emoji}</span>
                              <span>{v.label}</span>
                              {locked && <span className="lock">🔒 Lv {v.minLevel}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {error && <div className="error">{error}</div>}
        <button className="btn primary" onClick={onDone}>
          Head home
        </button>
      </div>
    </div>
  );
}
