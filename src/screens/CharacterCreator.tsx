import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import {
  ACCESSORIES, EYE_COLORS, HAIR_COLORS, HAIR_STYLES, OUTFITS, OUTFIT_COLORS, SKIN_TONES,
  defaultAppearance, randomAppearance, type Item,
} from '../game/catalog';
import { levelFromXp } from '../game/progression';
import type { Appearance, Character, CharacterInput, Gender, LookingFor } from '../types';

interface Props {
  existing?: Character;
  onSave: (input: CharacterInput) => Promise<void>;
  onCancel?: () => void;
}

function Swatches({ colors, value, onChange, label }: { colors: string[]; value: string; onChange: (c: string) => void; label: string }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="swatches">
        {colors.map((c) => (
          <button key={c} type="button" className={`swatch ${c === value ? 'on' : ''}`} style={{ background: c }} onClick={() => onChange(c)} aria-label={`${label} ${c}`} />
        ))}
      </div>
    </div>
  );
}

function Chips({ items, value, onChange, label, level }: { items: Item[]; value: string; onChange: (v: string) => void; label: string; level: number }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="chips">
        {items.map((i) => {
          const locked = i.minLevel > level;
          return (
            <button key={i.id} type="button" disabled={locked} className={`chip ${i.id === value ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => onChange(i.id)}>
              {i.label}
              {locked && <span className="lock"> 🔒{i.minLevel}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CharacterCreator({ existing, onSave, onCancel }: Props) {
  const editing = !!existing;
  const level = existing ? levelFromXp(existing.xp) : 1;
  const [gender, setGender] = useState<Gender>(existing?.gender ?? 'woman');
  const [lookingFor, setLookingFor] = useState<LookingFor>(existing?.lookingFor ?? 'men');
  const [name, setName] = useState(existing?.name ?? '');
  const [age, setAge] = useState(existing?.age ?? 25);
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [a, setA] = useState<Appearance>(existing?.appearance ?? defaultAppearance('woman'));
  const [tab, setTab] = useState<'look' | 'style' | 'about'>(editing ? 'style' : 'about');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => setA((x) => ({ ...x, [k]: v }));

  const chooseGender = (g: Gender) => {
    setGender(g);
    if (!editing) {
      setA(defaultAppearance(g));
      setLookingFor(g === 'woman' ? 'men' : 'women');
    }
  };

  const submit = async () => {
    setError('');
    if (name.trim().length < 2) return setError('Pick a name with at least 2 characters.');
    if (age < 18) return setError('You need to be 18 or older.');
    setBusy(true);
    try {
      await onSave({ name: name.trim(), gender, lookingFor, age, bio: bio.trim(), appearance: a });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="screen creator">
      <div className="creator-stage">
        <div className="eyebrow">{editing ? 'Wardrobe' : 'Step 1 of 1'}</div>
        <h1 className="display">{editing ? 'Freshen up' : 'Who walks in tonight?'}</h1>
        <div className="avatar-stage">
          <div className="spotlight" />
          <Avatar appearance={a} gender={gender} level={level} size={330} />
        </div>
        <div className="stage-name">{name || 'Your name'}{age ? `, ${age}` : ''}</div>
        <button type="button" className="btn ghost small" onClick={() => setA(randomAppearance(gender))}>
          🎲 Surprise me
        </button>
      </div>

      <div className="panel glass creator-panel">
        <div className="tabs">
          <button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>About</button>
          <button className={tab === 'look' ? 'active' : ''} onClick={() => setTab('look')}>Look</button>
          <button className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')}>Style</button>
        </div>

        {tab === 'about' && (
          <div className="fields">
            <div className="field">
              <div className="field-label">I am a</div>
              <div className="seg">
                {(['woman', 'man'] as Gender[]).map((g) => (
                  <button key={g} type="button" disabled={editing} className={gender === g ? 'on' : ''} onClick={() => chooseGender(g)}>
                    {g === 'woman' ? '👩 Woman' : '👨 Man'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <div className="field-label">Interested in</div>
              <div className="seg">
                {(['women', 'men', 'everyone'] as LookingFor[]).map((l) => (
                  <button key={l} type="button" className={lookingFor === l ? 'on' : ''} onClick={() => setLookingFor(l)}>
                    {l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="row gap">
              <label className="grow">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="e.g. Maya" />
              </label>
              <label style={{ width: 90 }}>
                Age
                <input type="number" min={18} max={99} value={age} disabled={editing} onChange={(e) => setAge(Number(e.target.value))} />
              </label>
            </div>
            <label>
              Bio <span className="muted small">({160 - bio.length})</span>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} placeholder="Your opening line. Keep it fun." />
            </label>
            {editing && <p className="muted small">Gender and age are locked after creation.</p>}
          </div>
        )}

        {tab === 'look' && (
          <div className="fields">
            <Swatches label="Skin" colors={SKIN_TONES} value={a.skin} onChange={(v) => set('skin', v)} />
            <Chips label="Hair" items={HAIR_STYLES} value={a.hairStyle} onChange={(v) => set('hairStyle', v)} level={level} />
            <Swatches label="Hair colour" colors={HAIR_COLORS} value={a.hairColor} onChange={(v) => set('hairColor', v)} />
            <Swatches label="Eyes" colors={EYE_COLORS} value={a.eyeColor} onChange={(v) => set('eyeColor', v)} />
          </div>
        )}

        {tab === 'style' && (
          <div className="fields">
            <Chips label="Outfit" items={OUTFITS} value={a.outfit} onChange={(v) => set('outfit', v)} level={level} />
            <Swatches label="Outfit colour" colors={OUTFIT_COLORS} value={a.outfitColor} onChange={(v) => set('outfitColor', v)} />
            <Chips label="Accessory" items={ACCESSORIES} value={a.accessory} onChange={(v) => set('accessory', v)} level={level} />
            <p className="muted small">🔒 Items unlock as your character levels up at the bar.</p>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        <div className="row gap">
          {onCancel && (
            <button className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn primary grow" disabled={busy} onClick={submit}>
            {busy ? '…' : editing ? 'Save look' : 'Head to the bar →'}
          </button>
        </div>
      </div>
    </div>
  );
}
