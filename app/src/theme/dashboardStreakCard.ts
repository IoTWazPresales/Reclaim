/**
 * Streak card surface — Signal-module teal shell (aligned with Daily Signal / insight modules).
 * Keep streak content; drop ember-only treatment that clashed with Home Signal.
 */
import {
  BINAXIS_INK_750,
  BINAXIS_INK_850_LIGHT,
  BINAXIS_INK_750_LIGHT,
  BINAXIS_INK_PAGE,
  BINAXIS_PRIMARY_LIGHT,
  BINAXIS_PRIMARY_DARK,
} from './binaxisColors';

/** Restorative teal lead — matches Signal / insight chrome */
export const BINAXIS_STREAK_SIGNAL = BINAXIS_PRIMARY_LIGHT;

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
      top: '#111a2e',
      bottom: BINAXIS_INK_750,
      page: BINAXIS_INK_PAGE,
      emberLeadOpacity: 0.14,
      emberTailOpacity: 0.03,
      edgeHighlight: 'rgba(83, 201, 202, 0.10)',
      satinUpper: 'rgba(83, 201, 202, 0.04)',
      innerBorder: 'rgba(83, 201, 202, 0.18)',
      orbTrack: 'rgba(148, 163, 184, 0.22)',
      orbInactiveBorder: 'rgba(148, 163, 184, 0.38)',
    };
  }
  return {
    top: BINAXIS_INK_750_LIGHT,
    bottom: BINAXIS_INK_850_LIGHT,
    page: '#f8fafc',
    emberLeadOpacity: 0.2,
    emberTailOpacity: 0.04,
    edgeHighlight: 'rgba(83, 201, 202, 0.18)',
    satinUpper: 'rgba(255,255,255,0.35)',
    innerBorder: 'rgba(83, 201, 202, 0.14)',
    orbTrack: 'rgba(100, 116, 139, 0.18)',
    orbInactiveBorder: 'rgba(100, 116, 139, 0.32)',
  };
}

export const dashboardStreakCardTokens = {
  ember: BINAXIS_STREAK_SIGNAL,
  signal: BINAXIS_PRIMARY_DARK,
  sheenAngleDeg: 8,
  orbGlowScaleMax: 1.06,
  orbGlowDurationMs: 3000,
  centerNumberSize: 28,
  centerNumberWeight: '800' as const,
} as const;
