/**
 * Unified Reclaim chrome — one radius scale + soft elevation language (Phase 3.1).
 */
import type { AppTheme } from './appThemes';

export const RECLAIM_CHROME = {
  /** Standard content cards */
  cardRadius: 14,
  /** Bottom sheets, modals, paywall surfaces */
  sheetRadius: 20,
  /** Full-width section shells that match cards */
  sectionRadius: 14,
  /** Insight / expressive modules */
  moduleRadius: 20,
} as const;

export type ReclaimElevationTier = 'quiet' | 'raised' | 'sheet';

/** Hairline border + diffuse glow — theme-aware, low opacity */
export function reclaimChromeElevation(theme: AppTheme, tier: ReclaimElevationTier = 'quiet') {
  const dark = theme.dark;
  const glow = theme.colors.primary;

  if (tier === 'sheet') {
    return {
      shadowColor: dark ? '#000000' : glow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: dark ? 0.38 : 0.1,
      shadowRadius: 20,
      elevation: dark ? 10 : 6,
      borderWidth: 1,
      borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
    };
  }

  if (tier === 'raised') {
    return {
      shadowColor: dark ? '#000000' : glow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: dark ? 0.28 : 0.09,
      shadowRadius: 14,
      elevation: dark ? 6 : 4,
      borderWidth: 1,
      borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.07)',
    };
  }

  return {
    shadowColor: dark ? '#000000' : glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: dark ? 0.22 : 0.07,
    shadowRadius: 10,
    elevation: dark ? 4 : 3,
    borderWidth: 1,
    borderColor: dark ? 'rgba(255,255,255,0.045)' : 'rgba(15,23,42,0.06)',
  };
}

/** Frosted glass wash for premium overlays */
export function reclaimGlassWash(theme: AppTheme): object {
  const dark = theme.dark;
  return {
    backgroundColor: dark ? 'rgba(11, 18, 32, 0.92)' : 'rgba(248, 250, 252, 0.94)',
    borderWidth: 1,
    borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
  };
}
