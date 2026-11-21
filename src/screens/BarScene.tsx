import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { backend } from '../backend';
import type { RoomConnection } from '../backend/types';
import { Avatar } from '../components/Avatar';
import { BarBackdrop, BarCounter, FloorProps, Vignette } from '../components/BarBackdrop';
import { Modal } from '../components/Modal';
import { DRINKS, EMOTES, drinkById, isCompatible } from '../game/catalog';
import { formatRemaining, nightClock } from '../game/night';
import { levelFromXp, levelProgress, titleForLevel } from '../game/progression';
import { unlocksAt } from '../game/unlocks';
import type { Character, ChatMessage, DrinkOffer, PlayerState } from '../types';
import { EndOfNight } from './EndOfNight';

const ROOM = 'main';
const BOUNDS = { minX: 70, maxX: 1530, minY: 390, maxY: 930 };
const SPEED = 230; // units per second

interface ScenePlayer extends PlayerState {
  facing: 1 | -1;
  duration: number; // seconds of the current walk
  walkUntil: number;
}

interface Bubble {
  text: string;
  until: number;
}

interface FloatFx {
  id: number;
  x: number;
  y: number;
  text: string;
}

const BARTENDER: Pick<PlayerState, 'appearance' | 'gender'> = {
  gender: 'man',
  appearance: { skin: '#c98d62', hairStyle: 'quiff', hairColor: '#1b1414', eyeColor: '#2b1a12', outfit: 'tux', outfitColor: '#c0304a', accessory: 'none' },
};

const depthScale = (y: number) => 0.92 + ((y - BOUNDS.minY) / (BOUNDS.maxY - BOUNDS.minY)) * 0.32;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function toScene(prev: ScenePlayer | undefined, p: PlayerState): ScenePlayer {
  if (!prev) return { ...p, facing: 1, duration: 0, walkUntil: 0 };
  const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
  const duration = dist / SPEED;
  return {
    ...prev,
    ...p,
    facing: p.x === prev.x ? prev.facing : p.x < prev.x ? -1 : 1,
    duration,
    walkUntil: dist > 1 ? Date.now() + duration * 1000 : prev.walkUntil,
  };
}

function playerFromCharacter(c: Character, x: number, y: number, drink: string | null): PlayerState {
  return {
    id: c.id, name: c.name, gender: c.gender, lookingFor: c.lookingFor, age: c.age, bio: c.bio,
    appearance: c.appearance, level: levelFromXp(c.xp), x, y, t: Date.now(), drink,
  };
}

function DanceFloor() {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBeat((b) => b + 1), 650);
    return () => clearInterval(t);
  }, []);
  return <FloorProps beat={beat} />;
}

const PlayerSprite = memo(function PlayerSprite({
  p, me, compatible, bubble, emote, onSelect,
}: {
  p: ScenePlayer;
  me: boolean;
  compatible: boolean;
  bubble?: string;
  emote?: string;
  onSelect?: (id: string) => void;
}) {
  const s = depthScale(p.y);
  const walking = p.walkUntil > Date.now();
  const drink = drinkById(p.drink);
  const label = p.isBot ? `${p.name} · demo` : p.name;
  const heart = compatible && !me;
  const tagW = Math.max(70, label.length * 8 + 46 + (heart ? 18 : 0));
  return (
    <g
      className={`player ${me ? 'is-me' : ''}`}
      style={{ transform: `translate(${p.x}px, ${p.y}px) scale(${s})`, transition: `transform ${p.duration}s linear` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(p.id);
      }}
    >
      {me && <ellipse cx="0" cy="0" rx="34" ry="9" className="me-ring" />}
      <g transform={`scale(${p.facing} 1) translate(-50 -154)`}>
        <Avatar embedded appearance={p.appearance} gender={p.gender} level={p.level} drinkEmoji={drink?.emoji} walking={walking} />
      </g>
      <g transform="translate(0 -172)" className="nametag">
        <rect x={-tagW / 2} y="-13" width={tagW} height="24" rx="12" className={me ? 'tag-bg me' : 'tag-bg'} />
        <text x={-tagW / 2 + 16} y="4" className="tag-level">{p.level}</text>
        <text x={-tagW / 2 + 32} y="4" className="tag-name">
          {label}
        </text>
        {heart && <text x={tagW / 2 - 15} y="5" fontSize="12" textAnchor="middle">💗</text>}
      </g>
      {bubble && (
        <g transform="translate(0 -200)" className="bubble">
          <rect x={-Math.min(260, bubble.length * 7 + 24) / 2} y="-26" width={Math.min(260, bubble.length * 7 + 24)} height="30" rx="14" />
          <path d="M-6 3 L0 12 L6 3 Z" />
          <text y="-6" textAnchor="middle">{bubble.length > 34 ? bubble.slice(0, 33) + '…' : bubble}</text>
        </g>
      )}
      {emote && (
        <text y="-205" textAnchor="middle" fontSize="34" className="emote-pop">
          {emote}
        </text>
      )}
    </g>
  );
});

export function BarScene({
  character,
  onCharacter,
  onExit,
}: {
  character: Character;
  onCharacter: (c: Character) => void;
  onExit: () => void;
}) {
  const [players, setPlayers] = useState<Map<string, ScenePlayer>>(new Map());
  const [meP, setMeP] = useState<ScenePlayer>(() =>
    toScene(undefined, playerFromCharacter(character, 740 + Math.random() * 120, 800, null)),
  );
  const [bubbles, setBubbles] = useState<Map<string, Bubble>>(new Map());
  const [emotes, setEmotes] = useState<Map<string, Bubble>>(new Map());
  const [log, setLog] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<DrinkOffer[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [fx, setFx] = useState<FloatFx[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [clock, setClock] = useState(nightClock());
  const [ended, setEnded] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState('');
  const [showHint, setShowHint] = useState(true);
  const [sentTo, setSentTo] = useState<Map<string, number>>(new Map());

  const roomRef = useRef<RoomConnection | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const meRef = useRef(meP);
  meRef.current = meP;
  const playersRef = useRef(players);
  playersRef.current = players;
  const charRef = useRef(character);
  charRef.current = character;
  const joinedAt = useRef(new Date().toISOString());
  const joinedNight = useRef(clock.nightId);
  const fxId = useRef(0);

  const toast = useCallback((text: string) => {
    const id = ++fxId.current;
    setToasts((t) => [...t.slice(-3), { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const floatAt = useCallback((x: number, y: number, text: string) => {
    const id = ++fxId.current;
    setFx((f) => [...f, { id, x, y, text }]);
    setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), 2200);
  }, []);

  const refreshCharacter = useCallback(async () => {
    const before = levelFromXp(charRef.current.xp);
    const c = await backend.getMyCharacter();
    if (!c) return;
    onCharacter(c);
    const after = levelFromXp(c.xp);
    if (after > before) setLevelUp(after);
    setMeP((m) => ({ ...m, level: after }));
  }, [onCharacter]);

  const showBubble = useCallback((id: string, text: string) => {
    setBubbles((b) => new Map(b).set(id, { text, until: Date.now() + 5500 }));
  }, []);

  const holdDrink = useCallback((drink: string) => {
    setMeP((m) => ({ ...m, drink }));
    roomRef.current?.holdDrink(drink);
  }, []);

  // Join the room.
  useEffect(() => {
    let cancelled = false;
    backend.listBlocked().then((ids) => !cancelled && setBlocked(new Set(ids)));
    backend.checkIn(joinedNight.current).then(() => {
      if (!cancelled) void refreshCharacter();
    });

    const room = backend.joinRoom(ROOM, meRef.current, {
      onPlayers(list) {
        setPlayers((prev) => {
          const next = new Map<string, ScenePlayer>();
          for (const p of list) {
            const old = prev.get(p.id);
            // Keep the freshest known position.
            next.set(p.id, old && old.t >= p.t ? { ...old, ...p, x: old.x, y: old.y, t: old.t } : toScene(old, p));
          }
          return next;
        });
      },
      onMove(id, x, y, t) {
        setPlayers((prev) => {
          const old = prev.get(id);
          if (!old || old.t > t) return prev;
          return new Map(prev).set(id, toScene(old, { ...old, x, y, t }));
        });
      },
      onChat(msg) {
        setLog((l) => [...l.slice(-40), msg]);
        showBubble(msg.from, msg.text);
      },
      onEmote(id, emote) {
        setEmotes((e) => new Map(e).set(id, { text: emote, until: Date.now() + 2200 }));
      },
      onDrinkHeld(id, drink) {
        setPlayers((prev) => {
          const old = prev.get(id);
          return old ? new Map(prev).set(id, { ...old, drink }) : prev;
        });
      },
      onOffer(offer) {
        setIncoming((list) => (list.some((o) => o.id === offer.id) ? list : [...list, offer]));
      },
      onOfferAnswered(offer) {
        const other = playersRef.current.get(offer.toId);
        const name = other?.name ?? 'They';
        const d = drinkById(offer.drink);
        if (offer.status === 'accepted') {
          toast(`${name} accepted your ${d?.emoji} ${d?.label}! Cheers 🥂`);
          holdDrink(offer.drink);
          const m = meRef.current;
          floatAt(m.x, m.y - 190, '+20 XP');
          if (other) floatAt(other.x, other.y - 190, '🥂');
        } else {
          toast(`${name} politely passed on the ${d?.label?.toLowerCase()}.`);
        }
        void refreshCharacter();
      },
    });
    roomRef.current = room;
    return () => {
      cancelled = true;
      room.leave();
      roomRef.current = null;
    };
  }, [floatAt, holdDrink, refreshCharacter, showBubble, toast]);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 15_000);
    return () => clearTimeout(t);
  }, []);

  // Camera: on narrow (portrait) screens, show a slice of the bar that follows you.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let camX = -1;
    let raf = 0;
    const tick = () => {
      const { width, height } = svg.getBoundingClientRect();
      const aspect = width / Math.max(1, height);
      const vw = Math.min(1600, Math.max(460, 1000 * aspect));
      if (vw >= 1600) {
        svg.setAttribute('viewBox', '0 0 1600 1000');
        camX = -1;
      } else {
        const target = clamp(meRef.current.x - vw / 2, 0, 1600 - vw);
        camX = camX < 0 ? target : camX + (target - camX) * 0.06;
        svg.setAttribute('viewBox', `${camX.toFixed(1)} 0 ${vw.toFixed(1)} 1000`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Clock + cleanup tick.
  useEffect(() => {
    const t = setInterval(() => {
      const c = nightClock();
      setClock(c);
      if (c.nightId !== joinedNight.current) setEnded(true);
      const now = Date.now();
      setBubbles((b) => {
        const n = new Map([...b].filter(([, v]) => v.until > now));
        return n.size === b.size ? b : n;
      });
      setEmotes((b) => {
        const n = new Map([...b].filter(([, v]) => v.until > now));
        return n.size === b.size ? b : n;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const moveTo = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const x = clamp(p.x, BOUNDS.minX, BOUNDS.maxX);
    const y = clamp(p.y, BOUNDS.minY, BOUNDS.maxY);
    setMeP((m) => toScene(m, { ...m, x, y, t: Date.now() }));
    roomRef.current?.move(x, y);
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatText.trim().slice(0, 200);
    if (!text) return;
    roomRef.current?.chat(text);
    const msg: ChatMessage = { id: crypto.randomUUID(), from: character.id, name: character.name, text, ts: Date.now() };
    setLog((l) => [...l.slice(-40), msg]);
    showBubble(character.id, text);
    setChatText('');
  };

  const sendEmote = (emote: string) => {
    roomRef.current?.emote(emote);
    setEmotes((e) => new Map(e).set(character.id, { text: emote, until: Date.now() + 2200 }));
  };

  const buyDrink = async (toId: string, drinkId: string) => {
    const target = players.get(toId);
    try {
      const offer = await backend.sendDrink(toId, drinkId);
      roomRef.current?.notifyOffer(offer);
      setSentTo((m) => new Map(m).set(toId, Date.now()));
      const d = drinkById(drinkId)!;
      toast(`You sent ${target?.name ?? 'them'} a ${d.emoji} ${d.label}. Fingers crossed…`);
      if (target) floatAt(target.x, target.y - 200, d.emoji);
      setSelected(null);
      void refreshCharacter();
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const answer = async (offer: DrinkOffer, accept: boolean) => {
    setIncoming((l) => l.filter((o) => o.id !== offer.id));
    try {
      const done = await backend.answerDrink(offer.id, accept);
      roomRef.current?.notifyOfferAnswered(done);
      if (accept) {
        holdDrink(offer.drink);
        const from = players.get(offer.fromId);
        const m = meRef.current;
        floatAt(m.x, m.y - 190, '+20 XP');
        if (from) floatAt(from.x, from.y - 190, '🥂');
        toast(`Cheers! You're sharing a drink with ${from?.name ?? 'them'} 🥂`);
        void refreshCharacter();
      }
    } catch (err) {
      toast((err as Error).message);
    }
  };

  const doBlock = async (id: string) => {
    await backend.block(id);
    setBlocked((b) => new Set(b).add(id));
    setSelected(null);
    toast('Blocked. You won’t see each other anymore.');
  };

  const doReport = async (id: string) => {
    if (!reportText.trim()) return;
    await backend.report(id, reportText.trim());
    setReporting(false);
    setReportText('');
    toast('Thanks — our team will review this report.');
  };

  const visible = useMemo(() => [...players.values()].filter((p) => !blocked.has(p.id)), [players, blocked]);
  const sorted = useMemo(() => [...visible, meP].sort((a, b) => a.y - b.y), [visible, meP]);
  const sel = selected ? players.get(selected) : undefined;
  const prog = levelProgress(character.xp);
  const myLevel = prog.level;
  const visibleIncoming = incoming.filter((o) => !blocked.has(o.fromId));
  const online = visible.filter((p) => !p.isBot).length + 1;

  if (ended) {
    return <EndOfNight since={joinedAt.current} character={character} onDone={onExit} />;
  }

  return (
    <div className="bar-screen">
      <svg
        ref={svgRef}
        className="bar-svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid meet"
        onClick={(e) => moveTo(e.clientX, e.clientY)}
      >
        <BarBackdrop />
        <g transform="translate(752 112) scale(0.98)" className="bartender">
          <Avatar embedded appearance={BARTENDER.appearance} gender={BARTENDER.gender} level={1} />
        </g>
        <BarCounter />
        <DanceFloor />
        {sorted.map((p) => (
          <PlayerSprite
            key={p.id}
            p={p}
            me={p.id === character.id}
            compatible={p.id !== character.id && isCompatible(character, p)}
            bubble={bubbles.get(p.id)?.text}
            emote={emotes.get(p.id)?.text}
            onSelect={p.id === character.id ? undefined : setSelected}
          />
        ))}
        {fx.map((f) => (
          <text key={f.id} x={f.x} y={f.y} className="float-fx" textAnchor="middle">
            {f.text}
          </text>
        ))}
        <Vignette />
      </svg>

      {/* ---------------- HUD ---------------- */}
      <div className="hud-top">
        <div className={`glass clock ${clock.lastCall ? 'last-call' : ''}`}>
          <div className="clock-row">
            <span className="clock-time">🌙 {clock.barTime}</span>
            <span className="muted">{online} here now</span>
          </div>
          <div className="bar-progress">
            <div style={{ width: `${clock.progress * 100}%` }} />
          </div>
          <div className="muted small">
            {clock.lastCall ? '🔔 Last call! ' : ''}Night ends in {formatRemaining(clock.remainingMs)}
          </div>
        </div>

        <div className="glass me-card">
          <Avatar appearance={character.appearance} gender={character.gender} level={myLevel} size={54} />
          <div className="me-info">
            <div className="me-name">
              {character.name} <span className="lvl-pill">Lv {myLevel}</span>
            </div>
            <div className="muted small">{titleForLevel(myLevel)}</div>
            <div className="xp-bar">
              <div style={{ width: `${prog.pct * 100}%` }} />
            </div>
          </div>
          <button className="btn ghost small" onClick={() => setEnded(true)}>
            Call it a night
          </button>
        </div>
      </div>

      {clock.lastCall && <div className="last-call-banner">🔔 Last call — make your move!</div>}

      {showHint && <div className="hud-hint glass small">Tap the floor to walk · tap someone to say hi or buy them a drink</div>}

      <div className="hud-bottom">
        <div className="glass chat">
          <div className="chat-log">
            {log.slice(-6).map((m) => (
              <div key={m.id} className="chat-line">
                <b>{m.name}</b> {m.text}
              </div>
            ))}
            {!log.length && <div className="muted small">Say hi to the room 👋</div>}
          </div>
          <form onSubmit={sendChat} className="chat-form">
            <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Say something…" maxLength={200} />
            <button className="btn primary small" type="submit">Send</button>
          </form>
        </div>
        <div className="glass emotes">
          {EMOTES.map((e) => (
            <button key={e} onClick={() => sendEmote(e)} aria-label={`emote ${e}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="toasts">
        {visibleIncoming.map((o) => {
          const from = players.get(o.fromId);
          const d = drinkById(o.drink);
          return (
            <div key={o.id} className="glass offer-card">
              {from && <Avatar appearance={from.appearance} gender={from.gender} level={from.level} size={58} />}
              <div>
                <div>
                  <b>{from?.name ?? 'Someone'}</b> sent you a
                </div>
                <div className="offer-drink">
                  {d?.emoji} {d?.label}
                </div>
                <div className="row gap">
                  <button className="btn primary small" onClick={() => answer(o, true)}>Accept 🥂</button>
                  <button className="btn ghost small" onClick={() => answer(o, false)}>No thanks</button>
                </div>
              </div>
            </div>
          );
        })}
        {toasts.map((t) => (
          <div key={t.id} className="glass toast">{t.text}</div>
        ))}
      </div>

      {sel && (
        <Modal onClose={() => {
          setSelected(null);
          setReporting(false);
        }}>
          <div className="profile-card">
            <div className="profile-head">
              <div className="avatar-stage small">
                <Avatar appearance={sel.appearance} gender={sel.gender} level={sel.level} size={150} drinkEmoji={drinkById(sel.drink)?.emoji} />
              </div>
              <div>
                <h2>
                  {sel.name}, {sel.age}
                </h2>
                <div className="row gap wrap">
                  <span className="lvl-pill">Lv {sel.level} · {titleForLevel(sel.level)}</span>
                  {isCompatible(character, sel) && <span className="pill pink">💗 You match each other’s vibe</span>}
                  {sel.isBot && <span className="pill">Demo regular</span>}
                </div>
                <p className="bio">{sel.bio || 'Mysterious. No bio yet.'}</p>
                <div className="muted small">Looking for {sel.lookingFor}</div>
              </div>
            </div>

            <h3>Buy {sel.name} a drink</h3>
            {sentTo.get(sel.id) && Date.now() - sentTo.get(sel.id)! < 30_000 ? (
              <p className="muted">Drink sent — give them a moment to answer.</p>
            ) : (
              <div className="drink-grid">
                {DRINKS.map((d) => {
                  const locked = d.minLevel > myLevel;
                  return (
                    <button key={d.id} className={`drink ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => buyDrink(sel.id, d.id)}>
                      <span className="drink-emoji">{d.emoji}</span>
                      <span>{d.label}</span>
                      {locked && <span className="lock">🔒 Lv {d.minLevel}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="row gap wrap" style={{ marginTop: 16 }}>
              <button className="btn ghost small" onClick={() => {
                  setSelected(null);
                  walkNear(sel);
                }}>
                Walk over
              </button>
              <button className="btn ghost small" onClick={() => sendEmote('👋')}>
                Wave 👋
              </button>
              <span className="spacer" />
              {!sel.isBot && (
                <>
                  <button className="btn link small" onClick={() => setReporting((r) => !r)}>Report</button>
                  <button className="btn link small danger" onClick={() => doBlock(sel.id)}>Block</button>
                </>
              )}
            </div>
            {reporting && (
              <div className="report">
                <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="What happened?" maxLength={500} />
                <button className="btn primary small" onClick={() => doReport(sel.id)}>Send report</button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {levelUp && (
        <LevelUpModal level={levelUp} onClose={() => setLevelUp(null)} />
      )}
    </div>
  );

  function walkNear(p: ScenePlayer) {
    const x = clamp(p.x + (p.x > meP.x ? -70 : 70), BOUNDS.minX, BOUNDS.maxX);
    const y = clamp(p.y + 4, BOUNDS.minY, BOUNDS.maxY);
    setMeP((m) => toScene(m, { ...m, x, y, t: Date.now() }));
    roomRef.current?.move(x, y);
  }
}


function LevelUpModal({ level, onClose }: { level: number; onClose: () => void }) {
  const items = unlocksAt(level);
  return (
    <Modal onClose={onClose}>
      <div className="levelup">
        <div className="levelup-burst">✨</div>
        <h2>Level {level}!</h2>
        <p className="muted">You’re now a <b>{titleForLevel(level)}</b>.</p>
        {items.length > 0 && (
          <>
            <h3>Unlocked</h3>
            <ul className="unlock-list">
              {items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </>
        )}
        <button className="btn primary" onClick={onClose}>Back to the bar</button>
      </div>
    </Modal>
  );
}
