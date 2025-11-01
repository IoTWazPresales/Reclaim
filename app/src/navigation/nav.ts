// C:\Reclaim\app\src\navigation\nav.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

export const navRef = createNavigationContainerRef<RootStackParamList>();

/** -------- Safe navigate (overloads) -------- */
export function safeNavigate<Name extends keyof RootStackParamList>(name: Name): void;
export function safeNavigate<Name extends keyof RootStackParamList>(
  name: Name,
  params: RootStackParamList[Name]
): void;
export function safeNavigate(name: keyof RootStackParamList, params?: RootStackParamList[keyof RootStackParamList]) {
  if (!navRef.isReady()) return;
  navRef.navigate(name as never, params as never);
}

/** ----- Helpers (stack → tabs) ----- */
export function navigateToHome() {
  safeNavigate('Tabs', { screen: 'Home' });
}

export function navigateToMeds(focusMedId?: string) {
  safeNavigate('Tabs', { screen: 'Meds', params: focusMedId ? { focusMedId } : undefined });
}

export function navigateToMood() {
  safeNavigate('Tabs', { screen: 'Mood' });
}

export function navigateToSleep() {
  safeNavigate('Tabs', { screen: 'Sleep' });
}

export function navigateToMindfulness() {
  safeNavigate('Tabs', { screen: 'Mindfulness' });
}

export function navigateToInsights() {
  safeNavigate('Tabs', { screen: 'Insights' });
}

/** Optional: jump into onboarding explicitly */
export function navigateToOnboarding() {
  safeNavigate('Onboarding');
}
