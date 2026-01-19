// C:\Reclaim\app\src\navigation\nav.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';

export const navRef = createNavigationContainerRef<RootStackParamList>();

/**
 * -------- Safe navigate (deterministic, no retries) --------
 * Navigation either happens or logs why it didn't.
 * No timing guesses, no silent drops.
 */
export function safeNavigate<Name extends keyof RootStackParamList>(
  name: Name,
  params?: RootStackParamList[Name],
) {
  if (!navRef.isReady()) {
    if (__DEV__) {
      console.warn('[NAV] navRef not ready, navigation skipped:', name, params);
    }
    return;
  }

  try {
    // @ts-expect-error - Nested navigator typing is complex by design
    navRef.navigate(name, params);
  } catch (err) {
    if (__DEV__) {
      console.error('[NAV] navigation failed:', name, params, err);
    }
  }
}

/** ----- Helpers (stack → drawer/tabs) ----- */

export function navigateToHome() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Home' } });
}

export function navigateToAnalytics() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Analytics' } });
}

export function navigateToSettings() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Settings' } });
}

export function navigateToMeds(focusMedId?: string) {
  if (focusMedId) {
    safeNavigate('App', {
      screen: 'Meds',
      params: { screen: 'MedDetails', params: { id: focusMedId } },
    });
    return;
  }
  safeNavigate('App', { screen: 'Meds' });
}

/** ----- Drawer-first routes ----- */

export function navigateToMood() {
  safeNavigate('App', { screen: 'Mood' });
}

export function navigateToSleep() {
  safeNavigate('App', { screen: 'Sleep' });
}

export function navigateToMindfulness() {
  safeNavigate('App', { screen: 'Mindfulness' });
}

/** Optional: jump into onboarding explicitly */
export function navigateToOnboarding() {
  safeNavigate('Onboarding');
}
