// C:\Reclaim\app\src\navigation\nav.ts
import { createNavigationContainerRef, NavigatorScreenParams } from '@react-navigation/native';

/** ----- Tabs ----- */
export type TabsParamList = {
  Meds: { focusMedId?: string } | undefined;
  Mood?: undefined;
  Sleep?: undefined;
  Mindfulness?: undefined;
  Home?: undefined;
};
/** ----- Root Stack ----- */
export type RootStackParamList = {
  Auth: undefined;
  Tabs: NavigatorScreenParams<TabsParamList>;
};

/** Global ref so we can navigate from non-component code (e.g., notifications) */
export const navRef = createNavigationContainerRef<RootStackParamList>();

/** -------- Safe navigate (overloads) --------
 * We use the object form of navigate({ name, params }) to dodge tuple typing issues.
 */
export function safeNavigate<Name extends keyof RootStackParamList>(name: Name): void;
export function safeNavigate<Name extends keyof RootStackParamList>(
  name: Name,
  params: RootStackParamList[Name]
): void;
export function safeNavigate(name: keyof RootStackParamList, params?: any) {
  if (!navRef.isReady()) return;
  // Object form keeps TS calm across undefined vs. defined param routes.
  navRef.navigate({ name: name as any, params });
}

/** ----- Helper functions ----- */
export function navigateToMeds(focusMedId?: string) {
  safeNavigate('Tabs', { screen: 'Meds', params: { focusMedId } });
}

export function navigateToMood() {
  safeNavigate('Tabs', { screen: 'Mood' });
}

export function navigateToHome() {
  safeNavigate('Tabs', { screen: 'Home' });
}

export function navigateToMindfulness() {
  safeNavigate('Tabs', { screen: 'Mindfulness' });
}
export function navigateToSleep() {
  if (!navRef.isReady()) return;
  navRef.navigate('Tabs', { screen: 'Sleep' as any });
}
