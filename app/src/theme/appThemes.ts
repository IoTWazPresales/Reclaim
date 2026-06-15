import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

import {
  BINAXIS_ERROR,
  BINAXIS_PRIMARY_DARK,
  BINAXIS_PRIMARY_LIGHT,
  domainAccentsDark,
  domainAccentsLight,
} from './binaxisColors';
import { RECLAIM_BODY_FONT, RECLAIM_DISPLAY_FONT } from './reclaimFontFamilies';
import { reclaimPaperFonts } from './reclaimPaperFonts';

const baseLight = MD3LightTheme;
const baseDark = MD3DarkTheme;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 14,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

const typography = {
  h1: {
    fontFamily: RECLAIM_DISPLAY_FONT.extraBold,
    fontSize: 38,
    fontWeight: '400' as const,
    letterSpacing: -0.3,
    lineHeight: 46,
  },
  h2: {
    fontFamily: RECLAIM_DISPLAY_FONT.bold,
    fontSize: 30,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
    lineHeight: 38,
  },
  h3: {
    fontFamily: RECLAIM_BODY_FONT.semiBold,
    fontSize: 22,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 30,
  },
  body: {
    fontFamily: RECLAIM_BODY_FONT.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: RECLAIM_BODY_FONT.regular,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontFamily: RECLAIM_BODY_FONT.medium,
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 14,
  },
} as const;

/** Attach custom Paper fonts once expo-font has finished loading. */
export function withReclaimFonts<T extends { fonts: typeof baseLight.fonts }>(theme: T, fontsReady: boolean): T {
  if (!fontsReady) return theme;
  return { ...theme, fonts: reclaimPaperFonts };
}

export const appLightTheme = {
  ...baseLight,
  roundness: 14,
  colors: {
    ...baseLight.colors,
    primary: BINAXIS_PRIMARY_LIGHT,
    onPrimary: '#ffffff',
    secondary: BINAXIS_PRIMARY_LIGHT,
    onSecondary: '#ffffff',
    primaryContainer: '#c7eded',
    onPrimaryContainer: '#004748',
    secondaryContainer: '#d4f0f0',
    onSecondaryContainer: '#004748',
    background: '#f8fafc',
    onBackground: '#0f172a',
    surface: '#ffffff',
    surfaceVariant: '#e2e8f0',
    outline: '#b8d4d5',
    outlineVariant: '#d6e8e8',
    onSurface: '#0f172a',
    onSurfaceVariant: '#475569',
    inverseSurface: '#1f2937',
    inverseOnSurface: '#e2e8f0',
    tertiary: domainAccentsLight.meds,
    onTertiary: '#ffffff',
    tertiaryContainer: '#b8e8d8',
    onTertiaryContainer: '#0a3d32',
    error: BINAXIS_ERROR,
    onError: '#ffffff',
    errorContainer: '#ffd6d3',
    onErrorContainer: '#5d2727',
    elevation: {
      level0: '#f8fafc',
      level1: '#ffffff',
      level2: '#f0fafa',
      level3: '#e8f6f6',
      level4: '#e0f2f2',
      level5: '#d8eeee',
    },
  },
  domainAccents: domainAccentsLight,
  spacing,
  borderRadius,
  typography,
} as const;

export const appDarkTheme = {
  ...baseDark,
  roundness: 14,
  colors: {
    ...baseDark.colors,
    primary: BINAXIS_PRIMARY_DARK,
    onPrimary: '#0b1220',
    secondary: BINAXIS_PRIMARY_DARK,
    onSecondary: '#0b1220',
    primaryContainer: '#0d4a4b',
    onPrimaryContainer: '#c7eded',
    secondaryContainer: '#0a3d45',
    onSecondaryContainer: '#d4f0f0',
    background: '#0B1220',
    onBackground: '#e5e7eb',
    surface: '#1A2742',
    surfaceVariant: '#17233C',
    onSurface: '#e5e7eb',
    onSurfaceVariant: '#cbd5e1',
    outline: '#24304A',
    outlineVariant: '#1C2640',
    inverseSurface: '#e5e7eb',
    inverseOnSurface: '#0b1220',
    tertiary: domainAccentsDark.meds,
    onTertiary: '#0b1220',
    tertiaryContainer: '#0a3d32',
    onTertiaryContainer: '#b8e8d8',
    error: BINAXIS_ERROR,
    onError: '#0b1220',
    errorContainer: '#5d2727',
    onErrorContainer: '#ffd6d3',
    backdrop: 'rgba(0,0,0,0.6)',
    elevation: {
      level0: '#0B1220',
      level1: '#162036',
      level2: '#1A2742',
      level3: '#1E2C4A',
      level4: '#223255',
      level5: '#273962',
    },
  },
  domainAccents: domainAccentsDark,
  spacing,
  borderRadius,
  typography,
} as const;

export type AppTheme = typeof appLightTheme | typeof appDarkTheme;
