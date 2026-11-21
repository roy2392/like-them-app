import { useState } from 'react';
import { backend } from '../backend';
import { Avatar } from '../components/Avatar';
import type { Appearance } from '../types';

const SHOWCASE: { a: Appearance; g: 'woman' | 'man'; lvl: number; d: string }[] = [
  { g: 'woman', lvl: 6, d: '🍸', a: { skin: '#e8b088', hairStyle: 'wavy', hairColor: '#1b1414', eyeColor: '#4a3020', outfit: 'sequin', outfitColor: '#e8436f', accessory: 'earrings' } },
  { g: 'man', lvl: 3, d: '🥃', a: { skin: '#a5683f', hairStyle: 'quiff', hairColor: '#1b1414', eyeColor: '#2b1a12', outfit: 'suit', outfitColor: '#1f2937', accessory: 'none' } },
  { g: 'woman', lvl: 2, d: '🍷', a: { skin: '#fde0cc', hairStyle: 'bob', hairColor: '#c0304a', eyeColor: '#3f7a4a', outfit: 'blazer', outfitColor: '#7c4dff', accessory: 'glasses' } },
];

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (mode === 'signup' && !adult) return setError('You need to be 18 or older to join.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await backend.signUp(email, password);
        if (needsConfirmation) setInfo('Check your inbox to confirm your email, then sign in.');
      } else {
        await backend.signIn(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen auth">
      <div className="auth-hero">
        <div className="neon-title">Like Them</div>
        <p className="tagline">Make a character. Walk into the bar. Buy someone a drink.<br />If the night goes well — take it somewhere new.</p>
        <div className="showcase">
          {SHOWCASE.map((s, i) => (
            <div key={i} className="showcase-item" style={{ animationDelay: `${i * 0.4}s` }}>
              <Avatar appearance={s.a} gender={s.g} level={s.lvl} size={170} drinkEmoji={s.d} />
            </div>
          ))}
        </div>
      </div>

      <form className="panel glass auth-panel" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Join
          </button>
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>
            Sign in
          </button>
        </div>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </label>
        {mode === 'signup' && (
          <label className="check">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
            I’m 18 or older and I’ll be kind to the people I meet.
          </label>
        )}
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        <button className="btn primary block" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {backend.mode === 'demo' && (
          <p className="muted small demo-note">
            Demo mode: accounts are stored in this browser only. Open a second tab and sign up as someone else to see multiplayer in action.
          </p>
        )}
      </form>
    </div>
  );
}
