import type { ColorSchemeName } from 'react-native';

import { appDarkTheme, appLightTheme, type AppTheme } from './appThemes';

export type AppearanceMode = 'system' | 'light' | 'dark';

/** Resolve Paper theme from user preference and OS colour scheme. */
export function resolveAppTheme(
  appearanceMode: AppearanceMode | undefined,
  systemColorScheme: ColorSchemeName,
): AppTheme {
  const mode = appearanceMode ?? 'system';
  if (mode === 'light') return appLightTheme;
  if (mode === 'dark') return appDarkTheme;
  return systemColorScheme === 'light' ? appLightTheme : appDarkTheme;
}
