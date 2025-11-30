import { MD3LightTheme, useTheme } from 'react-native-paper';

const baseLight = MD3LightTheme;

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

export type AppTheme = typeof appLightTheme;

export const useAppTheme = () => useTheme() as AppTheme;

