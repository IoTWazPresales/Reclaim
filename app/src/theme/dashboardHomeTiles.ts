/**
 * Home tiles — instrument-panel shells; domain glow + localized visuals.
 */

import {
  BINAXIS_INK_750,
  BINAXIS_INK_750_LIGHT,
  BINAXIS_INK_850,
  BINAXIS_INK_850_LIGHT,
  BINAXIS_INK_PAGE,
  type DomainAccents,
} from './binaxisColors';

export type HomeTileAccentKey = 'prediction' | 'sleep' | 'mood' | 'training';

/** Maps tile accent → theme.domainAccents key (prediction → insights violet). */
export function homeTileDomainAccent(accent: HomeTileAccentKey, domainAccents: DomainAccents): string {
  switch (accent) {
    case 'prediction':
      return domainAccents.insights;
    case 'sleep':
      return domainAccents.sleep;
    case 'mood':
      return domainAccents.mood;
    case 'training':
    default:
      return domainAccents.training;
  }
}

/** Secondary glow for sleep tile — indigo wash from insights accent. */
export function homeTileSecondaryGlow(accent: HomeTileAccentKey, domainAccents: DomainAccents): string | null {
  if (accent === 'sleep') return domainAccents.insights;
  if (accent === 'mood') return domainAccents.training;
  return null;
}

/** Faint radial glow centre opacity — sub-perceptual, domain-tinted. */
export function homeTileDomainGlowOpacity(dark: boolean): number {
  return dark ? 0.08 : 0.06;
}

export const homeTileTypography = {
  label: { fontSize: 10, letterSpacing: 1.2, opacity: 0.65, fontWeight: '600' as const },
  headline: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const },
  subline: { fontSize: 12, lineHeight: 16, opacity: 0.72 },
} as const;

export const homeTileLayout = {
  minHeight: 176,
  textPadding: 14,
  visualBandHeightRatio: 0.52,
  strokeWidth: 2,
  emptyVisualOpacity: 0.44,
  innerBorder: 'rgba(148, 170, 205, 0.10)',
  pressScale: 0.985,
  pressSpring: { damping: 22, stiffness: 520 },
} as const;

export function homeTileSurfaceGradient(dark: boolean): { top: string; bottom: string; page: string } {
  if (dark) {
    return { top: BINAXIS_INK_750, bottom: BINAXIS_INK_850, page: BINAXIS_INK_PAGE };
  }
  return { top: BINAXIS_INK_750_LIGHT, bottom: BINAXIS_INK_850_LIGHT, page: '#f8fafc' };
}

export const dashboardHomeTileTokens = {
  surfaceGradient: homeTileSurfaceGradient,

  border: (_accent: HomeTileAccentKey, dark: boolean) =>
    dark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.07)',

  edgeHighlight: (dark: boolean) => (dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)'),
  satinUpper: (dark: boolean) => (dark ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.28)'),

  chevron: (accent: HomeTileAccentKey, dark: boolean) => {
    if (!dark) {
      switch (accent) {
        case 'prediction':
          return 'rgba(91, 33, 182, 0.32)';
        case 'sleep':
          return 'rgba(13, 116, 106, 0.34)';
        case 'mood':
          return 'rgba(30, 64, 175, 0.32)';
        case 'training':
        default:
          return 'rgba(8, 91, 112, 0.34)';
      }
    }
    switch (accent) {
      case 'prediction':
        return 'rgba(167, 139, 250, 0.38)';
      case 'sleep':
        return 'rgba(45, 212, 191, 0.34)';
      case 'mood':
        return 'rgba(125, 162, 235, 0.38)';
      case 'training':
      default:
        return 'rgba(56, 189, 248, 0.4)';
    }
  },

  prediction: {
    glowUnderlay: (accent: string) => `${accent}1F`,
    trajectory: (dark: boolean) => (dark ? 'rgba(186, 230, 253, 0.85)' : 'rgba(8, 108, 132, 0.78)'),
    trajectoryDim: (dark: boolean) => (dark ? 'rgba(125, 211, 252, 0.35)' : 'rgba(14, 165, 233, 0.32)'),
    now: (dark: boolean) => (dark ? '#e0f2fe' : '#0e7490'),
  },

  sleep: {
    guide: (dark: boolean) => (dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.12)'),
    connector: (dark: boolean) => (dark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(71, 85, 105, 0.32)'),
    laneLabel: (dark: boolean) => (dark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(71, 85, 105, 0.58)'),
    awake: (dark: boolean) => (dark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(180, 83, 9, 0.45)'),
    light: (dark: boolean) => (dark ? 'rgba(45, 212, 191, 0.5)' : 'rgba(13, 148, 136, 0.42)'),
    deep: (dark: boolean) => (dark ? 'rgba(99, 102, 241, 0.55)' : 'rgba(67, 56, 202, 0.42)'),
    rem: (dark: boolean) => (dark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(2, 132, 199, 0.4)'),
    default: (dark: boolean) => (dark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(37, 99, 235, 0.38)'),
  },
} as const;
