import { useTheme } from 'react-native-paper';

export type { DomainAccentKey, DomainAccents } from './binaxisColors';
export { domainAccentFor, domainAccentsDark, domainAccentsLight } from './binaxisColors';
export { appDarkTheme, appLightTheme, type AppTheme } from './appThemes';
export { resolveAppTheme, type AppearanceMode } from './resolveAppTheme';
export { RECLAIM_CHROME, reclaimChromeElevation, reclaimGlassWash } from './reclaimChrome';

export const useAppTheme = () => useTheme() as import('./appThemes').AppTheme;
