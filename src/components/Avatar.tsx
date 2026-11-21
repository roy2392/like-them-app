import { memo, useId } from 'react';
import type { Appearance, Gender } from '../types';

interface Props {
  appearance: Appearance;
  gender: Gender;
  level?: number;
  drinkEmoji?: string | null;
  /** Render as an embedded <g> (inside the bar scene) instead of a standalone <svg>. */
  embedded?: boolean;
  size?: number;
  walking?: boolean;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const DENIM = '#2d3b5c';
const DARK = '#1c1d24';

/** Hair drawn behind the head. */
function HairBack({ style, color }: { style: string; color: string }) {
  const d = shade(color, -0.12);
  switch (style) {
    case 'long':
      return <path d="M26 46 Q24 22 50 20 Q76 22 74 46 L77 104 Q64 112 50 108 Q36 112 23 104 Z" fill={d} />;
    case 'wavy':
      return (
        <path
          d="M26 44 Q24 20 50 20 Q76 20 74 44 Q80 56 74 66 Q80 78 72 88 Q62 96 50 92 Q38 96 28 88 Q20 78 26 66 Q20 56 26 44 Z"
          fill={d}
        />
      );
    case 'bob':
      return <path d="M25 46 Q24 20 50 20 Q76 20 75 46 L76 70 Q66 76 50 74 Q34 76 24 70 Z" fill={d} />;
    case 'afro':
      return <circle cx="50" cy="40" r="32" fill={color} />;
    case 'curly':
      return (
        <g fill={d}>
          {[[28, 52], [72, 52], [26, 64], [74, 64]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="8" />)}
        </g>
      );
    case 'ponytail':
      return <path d="M66 34 Q90 40 84 74 Q80 88 74 92 Q78 70 68 52 Z" fill={d} />;
    default:
      return null;
  }
}

/** Hair drawn over the head. */
function HairFront({ style, color }: { style: string; color: string }) {
  const hi = shade(color, 0.12);
  switch (style) {
    case 'buzz':
      return <path d="M29 42 Q30 22 50 21 Q70 22 71 42 Q62 32 50 32 Q38 32 29 42 Z" fill={color} opacity="0.92" />;
    case 'short':
      return (
        <g>
          <path d="M27 46 Q24 18 50 17 Q78 18 73 46 Q70 34 62 30 Q52 36 36 33 Q30 38 27 46 Z" fill={color} />
          <path d="M40 22 Q52 18 64 24" stroke={hi} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'quiff':
      return (
        <g>
          <path d="M27 46 Q22 22 44 14 Q60 6 74 18 Q80 30 73 46 Q70 34 62 31 Q50 36 36 33 Q30 38 27 46 Z" fill={color} />
          <path d="M44 16 Q58 10 70 20" stroke={hi} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'mohawk':
      return (
        <g>
          <path d="M30 42 Q30 24 50 22 Q70 24 70 42 Q60 34 50 34 Q40 34 30 42 Z" fill={color} opacity="0.35" />
          <path d="M44 34 L40 18 L47 22 L50 6 L53 22 L60 18 L56 34 Z" fill={color} />
        </g>
      );
    case 'bob':
    case 'long':
    case 'wavy':
      return (
        <g>
          <path d="M26 48 Q22 16 50 16 Q78 16 74 48 Q72 34 64 28 Q54 38 34 36 Q28 40 26 48 Z" fill={color} />
          <path d="M38 22 Q50 16 62 22" stroke={hi} strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'ponytail':
      return (
        <g>
          <path d="M27 46 Q24 17 50 17 Q76 17 73 46 Q70 32 60 28 Q48 34 34 34 Q29 38 27 46 Z" fill={color} />
          <circle cx="70" cy="34" r="3.5" fill="#ff4fa3" />
        </g>
      );
    case 'bun':
      return (
        <g>
          <circle cx="50" cy="12" r="10" fill={color} />
          <path d="M27 46 Q24 18 50 18 Q76 18 73 46 Q70 32 60 29 Q48 33 34 33 Q29 38 27 46 Z" fill={color} />
        </g>
      );
    case 'afro':
      return <path d="M26 44 Q26 22 50 22 Q74 22 74 44 Q66 34 50 34 Q34 34 26 44 Z" fill={hi} opacity="0.5" />;
    case 'curly':
      return (
        <g fill={color}>
          {[[32, 30], [42, 22], [54, 20], [65, 26], [71, 36], [29, 40], [38, 30], [60, 28], [50, 27]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="8" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Outfit({ outfit, color, skin, gender }: { outfit: string; color: string; skin: string; gender: Gender }) {
  const dark = shade(color, -0.15);
  const light = shade(color, 0.12);
  const legs = (pants: string, shoes = DARK) => (
    <g>
      <path d="M37 116 L36 150 L47 150 L49 118 Z" fill={pants} />
      <path d="M63 116 L64 150 L53 150 L51 118 Z" fill={pants} />
      <ellipse cx="41" cy="152" rx="7.5" ry="3.6" fill={shoes} />
      <ellipse cx="59" cy="152" rx="7.5" ry="3.6" fill={shoes} />
    </g>
  );
  const bareLegs = (heel: string) => (
    <g>
      <path d="M40 128 L40 150 L46 150 L47 128 Z" fill={skin} />
      <path d="M60 128 L60 150 L54 150 L53 128 Z" fill={skin} />
      <path d="M38 150 L47 150 L47 154 L38 154 Z" fill={heel} rx="2" />
      <path d="M53 150 L62 150 L62 154 L53 154 Z" fill={heel} />
    </g>
  );
  const torso = (fill: string) => <path d="M30 76 Q50 70 70 76 L68 118 Q50 122 32 118 Z" fill={fill} />;
  const arms = (sleeve: string, long: boolean) => (
    <g>
      <path d="M30 77 Q22 80 22 96 L22 110 L29 111 L31 92 Z" fill={long ? sleeve : skin} />
      <path d="M70 77 Q78 80 78 96 L78 110 L71 111 L69 92 Z" fill={long ? sleeve : skin} />
      {!long && (
        <>
          <path d="M30 77 Q22 80 22 92 L30 92 Z" fill={sleeve} />
          <path d="M70 77 Q78 80 78 92 L70 92 Z" fill={sleeve} />
        </>
      )}
      <circle cx="25.5" cy="113" r="4.2" fill={skin} />
      <circle cx="74.5" cy="113" r="4.2" fill={skin} />
    </g>
  );

  switch (outfit) {
    case 'dress':
    case 'sequin':
      return (
        <g>
          {bareLegs(outfit === 'sequin' ? '#d4af37' : dark)}
          <path d="M33 76 Q50 72 67 76 L66 100 L76 132 Q50 140 24 132 L34 100 Z" fill={color} />
          <path d="M34 100 Q50 104 66 100" stroke={dark} strokeWidth="2" fill="none" />
          {outfit === 'sequin' && (
            <g fill="#fff" opacity="0.75">
              {Array.from({ length: 22 }, (_, i) => (
                <circle key={i} cx={30 + ((i * 37) % 40)} cy={80 + ((i * 23) % 52)} r={i % 3 === 0 ? 1.4 : 0.9} className="sparkle" style={{ animationDelay: `${(i % 7) * 0.3}s` }} />
              ))}
            </g>
          )}
          {arms(color, false)}
          <path d="M33 76 Q30 77 30 80" stroke={skin} strokeWidth="5" fill="none" />
          <path d="M67 76 Q70 77 70 80" stroke={skin} strokeWidth="5" fill="none" />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          {legs('#2a2a33', '#f3f3f3')}
          {torso(color)}
          {arms(color, true)}
          <path d="M38 74 Q50 86 62 74" stroke={dark} strokeWidth="3" fill="none" />
          <path d="M38 102 L62 102 L60 114 L40 114 Z" fill={dark} opacity="0.5" />
          <line x1="46" y1="80" x2="45" y2="92" stroke="#fff" strokeWidth="1.2" />
          <line x1="54" y1="80" x2="55" y2="92" stroke="#fff" strokeWidth="1.2" />
        </g>
      );
    case 'blazer':
    case 'suit':
    case 'tux': {
      const jacket = outfit === 'tux' ? '#15161c' : color;
      const pants = outfit === 'blazer' ? (gender === 'woman' ? '#1f2433' : DENIM) : outfit === 'tux' ? '#15161c' : shade(color, -0.1);
      return (
        <g>
          {legs(pants)}
          {torso(jacket)}
          <path d="M42 74 L50 104 L58 74 Z" fill="#f7f4ef" />
          {outfit === 'suit' && <path d="M48 80 L52 80 L54 100 L50 104 L46 100 Z" fill={outfit === 'suit' && color === '#1f2937' ? '#e8436f' : shade(color, 0.35)} />}
          {outfit === 'tux' && <path d="M43 78 L50 81 L57 78 L57 85 L50 82 L43 85 Z" fill={color} />}
          <path d="M42 74 L50 104 L40 90 L36 78 Z" fill={outfit === 'tux' ? '#2b2d36' : dark} />
          <path d="M58 74 L50 104 L60 90 L64 78 Z" fill={outfit === 'tux' ? '#2b2d36' : dark} />
          <circle cx="50" cy="110" r="1.6" fill={outfit === 'tux' ? '#888' : light} />
          {arms(jacket, true)}
        </g>
      );
    }
    case 'leather':
      return (
        <g>
          {legs(DENIM)}
          {torso('#1b1b22')}
          <path d="M42 75 L58 75 L56 118 L44 118 Z" fill={color} />
          <path d="M42 75 L44 118 L36 116 L34 82 Z" fill="#26262f" />
          <path d="M58 75 L56 118 L64 116 L66 82 Z" fill="#26262f" />
          <line x1="44" y1="84" x2="44" y2="116" stroke="#9aa" strokeWidth="0.8" />
          {arms('#1b1b22', true)}
        </g>
      );
    case 'tee':
    default:
      return (
        <g>
          {legs(DENIM, '#f3f3f3')}
          {torso(color)}
          {arms(color, false)}
          <path d="M42 75 Q50 82 58 75" stroke={dark} strokeWidth="2" fill="none" />
        </g>
      );
  }
}

function Accessory({ id, hairColor }: { id: string; hairColor: string }) {
  switch (id) {
    case 'glasses':
      return (
        <g stroke="#2a2a2a" strokeWidth="1.6" fill="rgba(255,255,255,0.15)">
          <circle cx="41" cy="50" r="6.5" />
          <circle cx="59" cy="50" r="6.5" />
          <line x1="47.5" y1="50" x2="52.5" y2="50" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="33" y="45" width="15" height="9" rx="4" fill="#111" />
          <rect x="52" y="45" width="15" height="9" rx="4" fill="#111" />
          <line x1="48" y1="48" x2="52" y2="48" stroke="#111" strokeWidth="2" />
          <path d="M36 47 L41 47" stroke="#fff" strokeWidth="1.2" opacity="0.6" />
          <path d="M55 47 L60 47" stroke="#fff" strokeWidth="1.2" opacity="0.6" />
        </g>
      );
    case 'earrings':
      return (
        <g fill="#f5c542" stroke="#c99a1a" strokeWidth="0.6">
          <circle cx="27.5" cy="60" r="2.6" />
          <circle cx="72.5" cy="60" r="2.6" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(31 27)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-5" rx="3.2" ry="5" fill="#ff6fa8" transform={`rotate(${a})`} />
          ))}
          <circle r="2.6" fill="#ffd84d" />
        </g>
      );
    case 'bowtie':
      return <path d="M42 72 L50 76 L58 72 L58 80 L50 76 L42 80 Z" fill="#c0304a" />;
    case 'hat':
      return (
        <g>
          <ellipse cx="50" cy="26" rx="30" ry="6" fill="#2a2320" />
          <path d="M34 26 Q34 8 50 8 Q66 8 66 26 Z" fill="#3a302b" />
          <rect x="34" y="20" width="32" height="4" fill="#c0304a" />
          <path d="M46 10 Q50 14 54 10" stroke={hairColor} strokeWidth="0" fill="none" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M36 22 L38 8 L44 16 L50 4 L56 16 L62 8 L64 22 Z" fill="#f5c542" stroke="#c99a1a" strokeWidth="1" />
          <circle cx="50" cy="13" r="2" fill="#e8436f" />
        </g>
      );
    default:
      return null;
  }
}

function AvatarBody({ appearance: a, gender, level = 1, drinkEmoji, walking }: Props) {
  const gid = useId().replace(/:/g, '');
  const skinShade = shade(a.skin, -0.08);
  return (
    <g className={walking ? 'avatar-walk' : 'avatar-idle'}>
      <defs>
        <radialGradient id={`aura${gid}`}>
          <stop offset="0%" stopColor={level >= 8 ? '#ffd76a' : '#ff6fb5'} stopOpacity="0.55" />
          <stop offset="100%" stopColor={level >= 8 ? '#ffd76a' : '#ff6fb5'} stopOpacity="0" />
        </radialGradient>
      </defs>
      {level >= 5 && <ellipse cx="50" cy="90" rx="46" ry="74" fill={`url(#aura${gid})`} className="aura" />}
      <ellipse cx="50" cy="154" rx="24" ry="5" fill="rgba(0,0,0,0.35)" />
      <HairBack style={a.hairStyle} color={a.hairColor} />
      <Outfit outfit={a.outfit} color={a.outfitColor} skin={a.skin} gender={gender} />
      {/* neck */}
      <path d="M44 62 L56 62 L56 76 Q50 80 44 76 Z" fill={skinShade} />
      {/* ears */}
      <ellipse cx="28" cy="52" rx="4" ry="6" fill={skinShade} />
      <ellipse cx="72" cy="52" rx="4" ry="6" fill={skinShade} />
      {/* head */}
      <ellipse cx="50" cy="46" rx="22.5" ry="23.5" fill={a.skin} />
      {/* face */}
      <g>
        <path d="M35 42 Q41 39 46 42" stroke={shade(a.hairColor, -0.1)} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M54 42 Q59 39 65 42" stroke={shade(a.hairColor, -0.1)} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <g className="blink">
          <ellipse cx="41" cy="50" rx="3.3" ry="4" fill={a.eyeColor} />
          <ellipse cx="59" cy="50" rx="3.3" ry="4" fill={a.eyeColor} />
          <circle cx="42.2" cy="48.6" r="1.2" fill="#fff" />
          <circle cx="60.2" cy="48.6" r="1.2" fill="#fff" />
        </g>
        {gender === 'woman' && (
          <g stroke="#1b1414" strokeWidth="1.1" strokeLinecap="round">
            <line x1="37.5" y1="47" x2="35.5" y2="45.5" />
            <line x1="62.5" y1="47" x2="64.5" y2="45.5" />
          </g>
        )}
        <ellipse cx="36" cy="58" rx="4" ry="2.4" fill="#ff7b9c" opacity="0.35" />
        <ellipse cx="64" cy="58" rx="4" ry="2.4" fill="#ff7b9c" opacity="0.35" />
        <path d="M44.5 59 Q50 64 55.5 59" stroke="#7a2f2f" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
      <HairFront style={a.hairStyle} color={a.hairColor} />
      <Accessory id={a.accessory} hairColor={a.hairColor} />
      {drinkEmoji && (
        <text x="80" y="116" fontSize="17" textAnchor="middle" className="held-drink">
          {drinkEmoji}
        </text>
      )}
    </g>
  );
}

export const Avatar = memo(function Avatar(props: Props) {
  if (props.embedded) return <AvatarBody {...props} />;
  const size = props.size ?? 160;
  return (
    <svg viewBox="-6 -6 112 168" width={(size * 112) / 168} height={size} className="avatar-svg" aria-hidden>
      <AvatarBody {...props} />
    </svg>
  );
});
