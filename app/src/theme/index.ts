import { MD3LightTheme, useTheme } from 'react-native-paper';

const baseLight = MD3LightTheme;

export const appLightTheme = {
  ...baseLight,
  colors: {
    ...baseLight.colors,
    primary: '#2563eb',
    onPrimary: '#ffffff',
    secondary: '#2563eb',
    onSecondary: '#ffffff',
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
} as const;

export type AppTheme = typeof appLightTheme;

export const useAppTheme = () => useTheme() as AppTheme;

