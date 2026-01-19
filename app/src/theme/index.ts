import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';

const baseLight = MD3LightTheme;
const baseDark = MD3DarkTheme;

// Design system tokens
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
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
} as const;

const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;

export const appLightTheme = {
  ...baseLight,
  colors: {
    ...baseLight.colors,
    primary: '#2563eb',
    onPrimary: '#ffffff',
    secondary: '#2563eb',
    onSecondary: '#ffffff',
    primaryContainer: '#dbeafe',
    onPrimaryContainer: '#1e3a8a',
    secondaryContainer: '#e0f2fe',
    onSecondaryContainer: '#0c4a6e',
    background: '#f8fafc',
    onBackground: '#0f172a',
    surface: '#ffffff',
    surfaceVariant: '#e2e8f0',
    outline: '#cbd5f5',
    outlineVariant: '#d6dbe9',
    onSurface: '#0f172a',
    onSurfaceVariant: '#475569',
    inverseSurface: '#1f2937',
    inverseOnSurface: '#e2e8f0',
    error: '#ef4444',
    onError: '#ffffff',
  },
  spacing,
  borderRadius,
  typography,
} as const;

export const appDarkTheme = {
  ...baseDark,
  colors: {
    ...baseDark.colors,

    // Brand / accent
    primary: '#60a5fa',
    onPrimary: '#0b1220',
    secondary: '#60a5fa',
    onSecondary: '#0b1220',

    // Containers (tonal surfaces for emphasis)
    primaryContainer: '#1e3a8a',
    onPrimaryContainer: '#dbeafe',
    secondaryContainer: '#0c4a6e',
    onSecondaryContainer: '#e0f2fe',

    // Core surfaces (dark-first; avoid pure black)
    background: '#0B1220',
    onBackground: '#e5e7eb',
    surface: '#162036',
    surfaceVariant: '#162036',
    onSurface: '#e5e7eb',
    onSurfaceVariant: '#cbd5e1',

    // Outlines / dividers
    outline: '#24304A',
    outlineVariant: '#1C2640',

    // Inverse (used for chips/code blocks, etc.)
    inverseSurface: '#e5e7eb',
    inverseOnSurface: '#0b1220',

    // Errors (define containers so components don't need fallbacks)
    error: '#ef4444',
    onError: '#0b1220',
    errorContainer: '#7f1d1d',
    onErrorContainer: '#fecaca',

    // Backdrop (modals/overlays)
    backdrop: 'rgba(0,0,0,0.6)',
  },
  spacing,
  borderRadius,
  typography,
} as const;

export type AppTheme = typeof appLightTheme;

export const useAppTheme = () => useTheme() as AppTheme;

