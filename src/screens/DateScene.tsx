import { useEffect, useRef, useState } from 'react';
import { backend } from '../backend';
import { Avatar } from '../components/Avatar';
import { venueById } from '../game/catalog';
import { levelFromXp } from '../game/progression';
import type { Character, DateInvite, DateMessage } from '../types';

function VenueBackdrop({ venue }: { venue: string }) {
  switch (venue) {
    case 'rooftop':
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className="venue-svg">
          <defs>
            <linearGradient id="sky1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b0f2e" />
              <stop offset="1" stopColor="#4a1f5c" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#sky1)" />
          <circle cx="520" cy="70" r="22" fill="#fff4d6" opacity="0.9" />
          <circle cx="520" cy="70" r="40" fill="#fff4d6" opacity="0.08" />
          {Array.from({ length: 22 }, (_, i) => {
            const w = 30 + ((i * 37) % 50);
            const h = 80 + ((i * 53) % 160);
            const x = i * 38 - 10;
            return (
              <g key={i}>
                <rect x={x} y={330 - h} width={w} height={h} fill="#120d24" />
                {Array.from({ length: Math.floor(h / 22) }, (_, j) => (
                  <rect key={j} x={x + 6 + ((j * 13) % (w - 14))} y={340 - h + j * 20} width="5" height="7" fill="#ffd166" opacity={(i + j) % 3 ? 0.15 : 0.8} />
                ))}
              </g>
            );
          })}
          <rect y="320" width="800" height="80" fill="#2a1d2f" />
          {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={i * 52 + 20} cy={300 + Math.sin(i) * 8} r="5" fill="#ffd98a" className="flicker" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
          <path d="M0 300 Q200 320 400 300 T800 300" stroke="#444" fill="none" />
        </svg>
      );
    case 'diner':
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className="venue-svg">
          <rect width="800" height="400" fill="#1c2a3a" />
          <rect y="0" width="800" height="220" fill="#24384d" />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={20 + i * 100} y="40" width="80" height="120" rx="6" fill="#0d1622" stroke="#9fd8ff" strokeOpacity="0.3" />
          ))}
          <text x="400" y="110" textAnchor="middle" fontFamily="Monoton" fontSize="44" fill="#ff5f7e" className="neon-flicker">DINER</text>
          <rect y="220" width="800" height="180" fill="url(#checker)" />
          <defs>
            <pattern id="checker" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#e9e4da" />
              <rect width="20" height="20" fill="#1b1b1b" />
              <rect x="20" y="20" width="20" height="20" fill="#1b1b1b" />
            </pattern>
          </defs>
          <rect x="180" y="250" width="440" height="30" rx="8" fill="#c0304a" />
          <text x="300" y="245" fontSize="30">🍟</text>
          <text x="470" y="245" fontSize="30">🥤</text>
        </svg>
      );
    case 'beach':
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className="venue-svg">
          <defs>
            <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0a1030" />
              <stop offset="1" stopColor="#24406e" />
            </linearGradient>
          </defs>
          <rect width="800" height="400" fill="url(#sky2)" />
          <circle cx="330" cy="80" r="26" fill="#f9f1d8" />
          <rect y="200" width="800" height="110" fill="#14284f" />
          <path d="M300 210 L360 210 L380 300 L280 300 Z" fill="#f9f1d8" opacity="0.12" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M0 ${240 + i * 22} Q100 ${230 + i * 22} 200 ${240 + i * 22} T400 ${240 + i * 22} T600 ${240 + i * 22} T800 ${240 + i * 22}`} stroke="#9fd8ff" strokeOpacity="0.3" fill="none" className="wave" />
          ))}
          <rect y="300" width="800" height="100" fill="#c9a877" />
          <rect y="300" width="800" height="10" fill="#e8dcc0" opacity="0.5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" className="venue-svg">
          <rect width="800" height="400" fill="#120914" />
          <path d="M260 0 L180 400 L620 400 L540 0 Z" fill="#ffd98a" opacity="0.06" />
          <rect x="560" y="200" width="200" height="90" rx="10" fill="#0a0a0a" />
          <rect x="560" y="196" width="200" height="12" fill="#1d1d1d" />
          {Array.from({ length: 14 }, (_, i) => (
            <rect key={i} x={566 + i * 14} y="210" width="10" height="26" fill={i % 2 ? '#111' : '#eee'} />
          ))}
          <text x="140" y="150" fontSize="60">🎷</text>
          <rect y="300" width="800" height="100" fill="#2b1a12" />
        </svg>
      );
  }
}

export function DateScene({ invite, me, other, onBack }: { invite: DateInvite; me: Character; other: Character; onBack: () => void }) {
  const [messages, setMessages] = useState<DateMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const venue = venueById(invite.venue);

  useEffect(() => {
    let alive = true;
    backend.listMessages(invite.id).then((m) => alive && setMessages(m));
    const unsub = backend.subscribeMessages(invite.id, (m) =>
      setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m])),
    );
    return () => {
      alive = false;
      unsub();
    };
  }, [invite.id]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    setError('');
    try {
      await backend.sendMessage(invite.id, body);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const last = (id: string) => [...messages].reverse().find((m) => m.senderId === id && Date.now() - Date.parse(m.createdAt) < 8000);

  return (
    <div className="screen date-screen">
      <div className="date-stage">
        <VenueBackdrop venue={venue.id} />
        <div className="date-couple">
          {[me, other].map((c, idx) => {
            const b = last(c.id);
            return (
              <div key={c.id} className={`date-avatar ${idx === 1 ? 'flip' : ''}`}>
                {b && <div className="speech">{b.body.length > 60 ? b.body.slice(0, 58) + '…' : b.body}</div>}
                <Avatar appearance={c.appearance} gender={c.gender} level={levelFromXp(c.xp)} size={230} />
                <div className="date-name">{c.name}</div>
              </div>
            );
          })}
        </div>
        <button className="btn ghost small back" onClick={onBack}>
          ← Home
        </button>
        <div className="venue-title glass">
          {venue.emoji} {venue.label} with <b>{other.name}</b>
        </div>
      </div>

      <div className="panel glass date-chat">
        <div className="chat-scroll" ref={logRef}>
          {messages.length === 0 && <p className="muted small">It’s just the two of you now. Say something sweet.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.senderId === me.id ? 'mine' : ''}`}>
              {m.body}
            </div>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <form className="chat-form" onSubmit={send}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${other.name}…`} maxLength={500} />
          <button className="btn primary small">Send</button>
        </form>
      </div>
    </div>
  );
}
