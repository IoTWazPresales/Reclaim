/**
 * Home tiles — neutral matte shells; accent lives in localized visuals, not broad card tint.
 */

export type HomeTileAccentKey = 'prediction' | 'sleep' | 'mood' | 'training';

/** Shared dark/light bases — per-accent deltas removed to avoid muddy in-between colors */
const SURFACE_DARK = '#0a0c10';
const SURFACE_LIGHT = '#e8eaef';

export const dashboardHomeTileTokens = {
  surface: (_accent: HomeTileAccentKey, dark: boolean) => (dark ? SURFACE_DARK : SURFACE_LIGHT),

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
    glowViolet: (dark: boolean) => (dark ? 'rgba(139, 92, 246, 0.16)' : 'rgba(109, 40, 217, 0.1)'),
    glowCyan: (dark: boolean) => (dark ? 'rgba(34, 211, 238, 0.12)' : 'rgba(8, 145, 178, 0.09)'),
    field0: (dark: boolean) => (dark ? 'rgba(139, 92, 246, 0.14)' : 'rgba(124, 58, 237, 0.12)'),
    field1: (dark: boolean) => (dark ? 'rgba(34, 211, 238, 0.1)' : 'rgba(6, 182, 212, 0.1)'),
    trajectory: (dark: boolean) => (dark ? 'rgba(186, 230, 253, 0.85)' : 'rgba(8, 108, 132, 0.78)'),
    trajectoryDim: (dark: boolean) => (dark ? 'rgba(125, 211, 252, 0.35)' : 'rgba(14, 165, 233, 0.32)'),
    now: (dark: boolean) => (dark ? '#e0f2fe' : '#0e7490'),
  },

  sleep: {
    nightWash: (dark: boolean) => (dark ? 'rgba(30, 41, 59, 0.42)' : 'rgba(51, 65, 85, 0.06)'),
    nightTeal: (dark: boolean) => (dark ? 'rgba(13, 148, 136, 0.09)' : 'rgba(13, 148, 136, 0.05)'),
    guide: (dark: boolean) => (dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(71, 85, 105, 0.12)'),
    connector: (dark: boolean) => (dark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(71, 85, 105, 0.32)'),
    trace: (dark: boolean) => (dark ? 'rgba(94, 234, 212, 0.42)' : 'rgba(13, 148, 136, 0.45)'),
    fillTop: (dark: boolean) => (dark ? 'rgba(45, 212, 191, 0.14)' : 'rgba(13, 148, 136, 0.12)'),
    fillBot: (dark: boolean) => (dark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(241, 245, 249, 0.85)'),
    awake: (dark: boolean) => (dark ? 'rgba(251, 191, 36, 0.55)' : 'rgba(180, 83, 9, 0.45)'),
    light: (dark: boolean) => (dark ? 'rgba(45, 212, 191, 0.5)' : 'rgba(13, 148, 136, 0.42)'),
    deep: (dark: boolean) => (dark ? 'rgba(99, 102, 241, 0.55)' : 'rgba(67, 56, 202, 0.42)'),
    rem: (dark: boolean) => (dark ? 'rgba(56, 189, 248, 0.5)' : 'rgba(2, 132, 199, 0.4)'),
    default: (dark: boolean) => (dark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(37, 99, 235, 0.38)'),
  },
} as const;
