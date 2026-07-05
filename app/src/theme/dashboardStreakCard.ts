/**
 * Streak card surface — ember accent + ink sheen (CelebrateRow only).
 * Mirrors home-tile ink ramp: dark ink in dark mode, light ink in light mode.
 */
import {
  BINAXIS_INK_700,
  BINAXIS_INK_750,
  BINAXIS_INK_850_LIGHT,
  BINAXIS_INK_750_LIGHT,
  BINAXIS_INK_PAGE,
} from './binaxisColors';

/** oklch(0.80 0.12 60) — warm ember, streak card only */
export const BINAXIS_STREAK_EMBER = '#e8b86d' as const;

export type StreakCardSurface = {
  top: string;
  bottom: string;
  page: string;
  emberLeadOpacity: number;
  emberTailOpacity: number;
  edgeHighlight: string;
  satinUpper: string;
  innerBorder: string;
  orbTrack: string;
  orbInactiveBorder: string;
};

export function streakCardSurface(dark: boolean): StreakCardSurface {
  if (dark) {
    return {
      top: BINAXIS_INK_750,
      bottom: BINAXIS_INK_700,
      page: BINAXIS_INK_PAGE,
      emberLeadOpacity: 0.16,
      emberTailOpacity: 0.03,
      edgeHighlight: 'rgba(255,255,255,0.04)',
      satinUpper: 'rgba(255,255,255,0.012)',
      innerBorder: 'rgba(148, 170, 205, 0.10)',
      orbTrack: 'rgba(148, 163, 184, 0.22)',
      orbInactiveBorder: 'rgba(148, 163, 184, 0.38)',
    };
  }
  return {
    top: BINAXIS_INK_750_LIGHT,
    bottom: BINAXIS_INK_850_LIGHT,
    page: '#f8fafc',
    emberLeadOpacity: 0.28,
    emberTailOpacity: 0.05,
    edgeHighlight: 'rgba(255,255,255,0.55)',
    satinUpper: 'rgba(255,255,255,0.28)',
    innerBorder: 'rgba(15, 23, 42, 0.07)',
    orbTrack: 'rgba(100, 116, 139, 0.18)',
    orbInactiveBorder: 'rgba(100, 116, 139, 0.32)',
  };
}

export const dashboardStreakCardTokens = {
  ember: BINAXIS_STREAK_EMBER,
  sheenAngleDeg: 8,
  orbGlowScaleMax: 1.06,
  orbGlowDurationMs: 3000,
  centerNumberSize: 28,
  centerNumberWeight: '800' as const,
} as const;
