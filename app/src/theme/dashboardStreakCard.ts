/** Streak card surface — ember accent + ink sheen (CelebrateRow only). */
import { BINAXIS_INK_700, BINAXIS_INK_750 } from './binaxisColors';

/** oklch(0.80 0.12 60) — warm ember, streak card only */
export const BINAXIS_STREAK_EMBER = '#e8b86d' as const;

export const dashboardStreakCardTokens = {
  ember: BINAXIS_STREAK_EMBER,
  sheenTop: BINAXIS_INK_750,
  sheenBottom: BINAXIS_INK_700,
  sheenAngleDeg: 8,
  orbGlowScaleMax: 1.06,
  orbGlowDurationMs: 3000,
  centerNumberSize: 28,
  centerNumberWeight: '800' as const,
} as const;
