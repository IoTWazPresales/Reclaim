/**
 * Binaxis Core colour tokens — hex equivalents of the oklch spec in reclaim-reskin.brief.md.
 * React Native / Paper consume hex; oklch is the design-source reference.
 */

/** oklch(0.770 0.105 196) — restorative teal */
export const BINAXIS_PRIMARY_LIGHT = '#53c9ca' as const;
/** Brighter teal for dark surfaces */
export const BINAXIS_PRIMARY_DARK = '#72d7d8' as const;
/** oklch(0.660 0.180 22) — calm, desaturated critical */
export const BINAXIS_ERROR = '#ec5a5e' as const;

/** Elevated ink ramp — tiles sit above page background (#0B1220). */
export const BINAXIS_INK_750 = '#1A2742' as const;
export const BINAXIS_INK_850 = '#162036' as const;
export const BINAXIS_INK_700 = '#1E3150' as const;
export const BINAXIS_INK_PAGE = '#0B1220' as const;

/** Light-mode tile ramp */
export const BINAXIS_INK_750_LIGHT = '#eef1f6' as const;
export const BINAXIS_INK_850_LIGHT = '#e4e8ef' as const;

export type DomainAccentKey = 'mood' | 'sleep' | 'meds' | 'training' | 'breath' | 'insights';

export type DomainAccents = Record<DomainAccentKey, string>;

/** Teal-anchored domain palette (hue offsets from primary 196°). */
export const domainAccentsLight: DomainAccents = {
  mood: '#53c9ca',
  sleep: '#58c5de',
  meds: '#62cab0',
  training: '#ef9f67',
  breath: '#53c7d4',
  insights: '#d5a0d0',
};

export const domainAccentsDark: DomainAccents = {
  mood: '#65d9da',
  sleep: '#69d6ef',
  meds: '#73dbc0',
  training: '#ffaf76',
  breath: '#65d8e4',
  insights: '#e6afe0',
};

export function domainAccentFor(
  accents: DomainAccents,
  key: keyof DomainAccents | 'medication',
): string {
  if (key === 'medication') return accents.meds;
  return accents[key];
}
