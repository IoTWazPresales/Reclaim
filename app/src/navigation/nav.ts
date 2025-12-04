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
  if (!navRef.isReady()) {
    // Wait a bit and try again if not ready (common during app startup)
    setTimeout(() => {
      if (navRef.isReady()) {
        // @ts-expect-error - Navigation typing is complex with nested stacks
        navRef.navigate(name, params);
      }
    }, 100);
    return;
  }
  try {
    // @ts-expect-error - Navigation typing is complex with nested stacks
    navRef.navigate(name, params);
  } catch (error) {
    // Silently fail - navigation might not be fully initialized
    // This is expected during navigation transitions
  }
}

/** ----- Helpers (stack → tabs) ----- */
export function navigateToHome() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Home' } });
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

export function navigateToMood() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Mood' } });
}

export function navigateToSleep() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Sleep' } });
}

export function navigateToMindfulness() {
  safeNavigate('App', { screen: 'Mindfulness' });
}

export function navigateToAnalytics() {
  safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Analytics' } });
}

/** Optional: jump into onboarding explicitly */
export function navigateToOnboarding() {
  safeNavigate('Onboarding');
}
