import { ACCESSORIES, DRINKS, HAIR_STYLES, OUTFITS, VENUES } from './catalog';

/** Everything that becomes available at exactly this level. */
export function unlocksAt(level: number): string[] {
  const out: string[] = [];
  for (const d of DRINKS) if (d.minLevel === level) out.push(`${d.emoji} ${d.label}`);
  for (const v of VENUES) if (v.minLevel === level) out.push(`${v.emoji} ${v.label} dates`);
  for (const o of OUTFITS) if (o.minLevel === level) out.push(`👗 ${o.label}`);
  for (const h of HAIR_STYLES) if (h.minLevel === level) out.push(`💇 ${h.label} hair`);
  for (const a of ACCESSORIES) if (a.minLevel === level) out.push(`✨ ${a.label}`);
  if (level === 5) out.push('🌟 A glowing aura');
  if (level === 8) out.push('👑 A golden aura');
  return out;
}
