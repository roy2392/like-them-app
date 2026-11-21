import { memo } from 'react';

const BOTTLE_COLORS = ['#3ec7a7', '#f4c542', '#e8436f', '#7c4dff', '#ff8a3d', '#a3e635', '#38bdf8', '#f472b6'];

function Bottles({ y, count, seed }: { y: number; count: number; seed: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = 330 + i * (940 / count) + ((i * seed) % 9);
        const h = 34 + ((i * 7 + seed) % 4) * 8;
        const c = BOTTLE_COLORS[(i + seed) % BOTTLE_COLORS.length];
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x="-7" y={-h} width="14" height={h} rx="4" fill={c} opacity="0.85" />
            <rect x="-3" y={-h - 12} width="6" height="14" rx="2" fill={c} opacity="0.85" />
            <rect x="-5" y={-h + 10} width="10" height="10" rx="1" fill="#fff" opacity="0.6" />
            <rect x="-5" y={-h + 2} width="3" height={h - 6} rx="1.5" fill="#fff" opacity="0.25" />
          </g>
        );
      })}
    </g>
  );
}

function Stool({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 362)`}>
      <rect x="-3" y="0" width="6" height="34" fill="#3b2a22" />
      <ellipse cx="0" cy="34" rx="16" ry="4" fill="#2a1c17" />
      <ellipse cx="0" cy="0" rx="20" ry="7" fill="#7a1f3d" />
      <ellipse cx="0" cy="-2" rx="18" ry="5" fill="#9b2a50" />
    </g>
  );
}

function Booth({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="110" cy="150" rx="120" ry="18" fill="rgba(0,0,0,0.35)" />
      <path d="M0 20 Q0 0 20 0 L200 0 Q220 0 220 20 L220 70 L0 70 Z" fill="#6b1530" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${12 + i * 52} 10 L${56 + i * 52} 10 L${56 + i * 52} 62 L${12 + i * 52} 62 Z`} fill="#7f1d3a" stroke="#5a1027" strokeWidth="2" rx="8" />
      ))}
      <rect x="0" y="64" width="220" height="38" rx="10" fill="#8a2142" />
      {/* table */}
      <ellipse cx="110" cy="122" rx="70" ry="20" fill="#2c1b14" />
      <ellipse cx="110" cy="116" rx="70" ry="20" fill="#5a3826" />
      <ellipse cx="110" cy="114" rx="64" ry="16" fill="#6e4630" />
      {/* candle */}
      <rect x="104" y="96" width="12" height="16" rx="3" fill="#f6efe3" />
      <ellipse cx="110" cy="92" rx="3.5" ry="6" fill="#ffcf5a" className="flicker" />
      <circle cx="110" cy="100" r="40" fill="url(#candleGlow)" />
    </g>
  );
}

function HighTable({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="62" rx="34" ry="8" fill="rgba(0,0,0,0.35)" />
      <rect x="-4" y="0" width="8" height="60" fill="#2a1c17" />
      <ellipse cx="0" cy="60" rx="20" ry="5" fill="#2a1c17" />
      <ellipse cx="0" cy="2" rx="40" ry="13" fill="#3a2418" />
      <ellipse cx="0" cy="-2" rx="40" ry="13" fill="#7a5034" />
      <ellipse cx="0" cy="-3" rx="34" ry="9" fill="#8c5d3d" />
      <rect x="-4" y="-16" width="8" height="10" rx="2" fill="#f6efe3" />
      <ellipse cx="0" cy="-19" rx="2.5" ry="4.5" fill="#ffcf5a" className="flicker" />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="40" rx="30" ry="7" fill="rgba(0,0,0,0.4)" />
      {[-60, -35, -10, 15, 40, 65].map((a, i) => (
        <ellipse key={a} cx="0" cy="-30" rx="10" ry="38" fill={i % 2 ? '#2f7a4f' : '#256b43'} transform={`rotate(${a} 0 10)`} />
      ))}
      <path d="M-20 10 L20 10 L16 40 L-16 40 Z" fill="#b5653f" />
      <rect x="-22" y="6" width="44" height="8" rx="3" fill="#c8754d" />
    </g>
  );
}

function Pendant({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} y1="0" x2={x} y2="150" stroke="#111" strokeWidth="2" />
      <path d={`M${x - 22} 170 L${x - 10} 148 L${x + 10} 148 L${x + 22} 170 Z`} fill="#c9933c" />
      <ellipse cx={x} cy="170" rx="22" ry="5" fill="#ffe7a8" />
      <path d={`M${x - 22} 172 L${x - 150} 520 L${x + 150} 520 L${x + 22} 172 Z`} fill="url(#lightCone)" className="cone" />
    </g>
  );
}

export const BarBackdrop = memo(function BarBackdrop() {
  return (
    <g className="backdrop">
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0f24" />
          <stop offset="1" stopColor="#2b1530" />
        </linearGradient>
        <pattern id="brick" width="80" height="36" patternUnits="userSpaceOnUse">
          <rect width="80" height="36" fill="transparent" />
          <path d="M0 18 H80 M40 0 V18 M0 18 V36 M80 18 V36" stroke="#ffffff" strokeOpacity="0.035" strokeWidth="2" />
        </pattern>
        <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2219" />
          <stop offset="1" stopColor="#1e120e" />
        </linearGradient>
        <pattern id="planks" width="220" height="44" patternUnits="userSpaceOnUse">
          <path d="M0 44 H220 M70 0 V44 M180 0 V44" stroke="#000" strokeOpacity="0.25" strokeWidth="2" />
          <path d="M0 2 H220" stroke="#fff" strokeOpacity="0.03" strokeWidth="2" />
        </pattern>
        <linearGradient id="counterTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a8693e" />
          <stop offset="1" stopColor="#6e3f22" />
        </linearGradient>
        <linearGradient id="counterFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b2616" />
          <stop offset="1" stopColor="#2a140c" />
        </linearGradient>
        <linearGradient id="shelfGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.0" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id="lightCone" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="candleGlow">
          <stop offset="0" stopColor="#ffb347" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </radialGradient>
        <radialGradient id="discoSpot">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id="neon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b1" />
          <feGaussianBlur stdDeviation="12" result="b2" in="SourceGraphic" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* walls & floor */}
      <rect width="1600" height="330" fill="url(#wall)" />
      <rect width="1600" height="330" fill="url(#brick)" />
      <rect y="300" width="1600" height="700" fill="url(#floor)" />
      <rect y="300" width="1600" height="700" fill="url(#planks)" />

      {/* back shelves */}
      <rect x="300" y="40" width="1000" height="210" rx="6" fill="#140b10" />
      <rect x="300" y="40" width="1000" height="210" rx="6" fill="url(#shelfGlow)" />
      <rect x="300" y="128" width="1000" height="8" fill="#5b3a26" />
      <rect x="300" y="226" width="1000" height="8" fill="#5b3a26" />
      <Bottles y={128} count={22} seed={3} />
      <Bottles y={226} count={20} seed={5} />
      {/* mirror strip */}
      <rect x="300" y="40" width="1000" height="12" fill="#2b2030" />

      {/* neon signs */}
      <g filter="url(#neon)" className="neon-flicker">
        <text x="150" y="150" textAnchor="middle" fontFamily="'Yellowtail', cursive" fontSize="64" fill="#ff5fae" transform="rotate(-6 150 150)">
          Like Them
        </text>
        <path d="M110 186 q40 18 80 0" stroke="#ff5fae" strokeWidth="3" fill="none" />
      </g>
      <g filter="url(#neon)">
        <text x="1450" y="120" textAnchor="middle" fontFamily="'Monoton', cursive" fontSize="30" fill="#45f0d6">
          COCKTAILS
        </text>
        <path d="M1440 150 l-18 -22 h36 z M1440 150 v22 M1428 174 h24" stroke="#ffd166" strokeWidth="3" fill="none" />
      </g>

      {/* pendant lights */}
      {[440, 680, 920, 1160].map((x) => (
        <Pendant key={x} x={x} />
      ))}

      {/* bartender silhouette area is rendered by the scene; counter goes on top */}
    </g>
  );
});

/** Counter drawn after the bartender so it hides their legs. */
export const BarCounter = memo(function BarCounter() {
  return (
    <g>
      <rect x="250" y="262" width="1100" height="26" rx="8" fill="url(#counterTop)" />
      <rect x="250" y="262" width="1100" height="4" rx="2" fill="#e0a26a" opacity="0.6" />
      <rect x="262" y="286" width="1076" height="62" fill="url(#counterFront)" />
      {Array.from({ length: 11 }, (_, i) => (
        <rect key={i} x={282 + i * 98} y="296" width="80" height="42" rx="4" fill="none" stroke="#6a3a22" strokeWidth="2" />
      ))}
      <rect x="262" y="344" width="1076" height="6" fill="#c9933c" opacity="0.7" />
      {/* glasses on counter */}
      {[360, 520, 760, 1010, 1230].map((x, i) => (
        <g key={x} transform={`translate(${x} 262)`}>
          <path d="M-7 -18 L7 -18 L4 -2 L-4 -2 Z" fill="#cfe8ff" opacity="0.5" />
          <path d="M-6 -14 L6 -14 L4 -4 L-4 -4 Z" fill={BOTTLE_COLORS[i]} opacity="0.7" />
        </g>
      ))}
      {[330, 440, 550, 660, 770, 880, 990, 1100, 1210].map((x) => (
        <Stool key={x} x={x} />
      ))}
    </g>
  );
});

export const FloorProps = memo(function FloorProps({ beat }: { beat: number }) {
  const tiles = [];
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) {
      const hue = (r * 47 + c * 83 + beat * 60) % 360;
      tiles.push(
        <rect
          key={`${r}-${c}`}
          x={1190 + c * 62}
          y={600 + r * 62}
          width="60"
          height="60"
          fill={`hsl(${hue} 85% 55%)`}
          opacity={(r + c + beat) % 3 === 0 ? 0.55 : 0.22}
          className="tile"
        />,
      );
    }
  return (
    <g>
      {/* dance floor */}
      <rect x="1184" y="594" width="380" height="318" rx="6" fill="#0d0a14" />
      {tiles}
      <text x="1374" y="580" textAnchor="middle" fontSize="15" letterSpacing="6" fill="#c9b8ff" opacity="0.6" fontFamily="Inter, sans-serif">
        DANCE FLOOR
      </text>
      {/* disco ball */}
      <line x1="1374" y1="0" x2="1374" y2="40" stroke="#222" strokeWidth="2" />
      <g className="disco">
        <circle cx="1374" cy="62" r="24" fill="#c9c9d6" />
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={1356 + (i % 4) * 9} y={44 + Math.floor(i / 4) * 9} width="7" height="7" fill={i % 3 ? '#ecebf5' : '#8f8fa3'} opacity="0.9" />
        ))}
      </g>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={1260 + ((beat * 97 + i * 130) % 300)} cy={650 + ((beat * 53 + i * 90) % 220)} rx="38" ry="14" fill="url(#discoSpot)" className="spot" />
      ))}

      {/* jukebox */}
      <g transform="translate(1500 330)">
        <ellipse cx="0" cy="118" rx="44" ry="8" fill="rgba(0,0,0,0.4)" />
        <path d="M-40 116 L-40 20 Q-40 -20 0 -20 Q40 -20 40 20 L40 116 Z" fill="#5a1e3b" />
        <path d="M-32 110 L-32 24 Q-32 -10 0 -10 Q32 -10 32 24 L32 110 Z" fill="#2a0f1d" />
        <path d="M-28 30 Q-28 -4 0 -4 Q28 -4 28 30" stroke="#ff8a3d" strokeWidth="5" fill="none" className="juke-glow" />
        <path d="M-20 34 Q-20 6 0 6 Q20 6 20 34" stroke="#45f0d6" strokeWidth="4" fill="none" className="juke-glow alt" />
        <rect x="-22" y="48" width="44" height="26" rx="4" fill="#f6d68a" opacity="0.8" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-18 + i * 10} y="84" width="6" height="18" rx="2" fill="#c0304a" />
        ))}
        <text x="0" y="66" textAnchor="middle" fontSize="12">🎵</text>
      </g>

      <Booth x={40} y={430} />
      <Booth x={40} y={690} />
      <HighTable x={700} y={600} />
      <HighTable x={960} y={720} />
      <HighTable x={560} y={830} />
      <Plant x={1130} y={430} s={0.9} />
      <Plant x={40} y={940} s={1.1} />
      <Plant x={1560} y={960} s={1} />

      {/* entrance */}
      <rect x="720" y="968" width="160" height="32" rx="6" fill="#4a1a2e" />
      <text x="800" y="990" textAnchor="middle" fontSize="13" letterSpacing="5" fill="#f3c6d6" opacity="0.7" fontFamily="Inter, sans-serif">
        WELCOME
      </text>
    </g>
  );
});

export const Vignette = () => <rect width="1600" height="1000" fill="url(#vignette)" pointerEvents="none" />;
