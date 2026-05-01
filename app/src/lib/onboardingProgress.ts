/**
 * Persists last onboarding route so users can resume after app kill.
 * Cleared when onboarding completes (see completeOnboarding).
 */
import { getItemScoped, removeItemScoped, setItemScoped } from '@/persistence/ScopedStorage';

const ROUTE_KEY = 'onboarding:active_route:v1';
const MOOD_HINT_KEY = 'onboarding:mood_saved_hint:v1';

export const ONBOARDING_ROUTE_ORDER = [
  'Welcome',
  'Capabilities',
  'MoodCheckin',
  'Reset',
  'Meds',
  'Sleep',
  'Finish',
] as const;

export type OnboardingRouteName = (typeof ONBOARDING_ROUTE_ORDER)[number];

function isOnboardingRoute(name: string): name is OnboardingRouteName {
  return (ONBOARDING_ROUTE_ORDER as readonly string[]).includes(name);
}

export async function saveOnboardingStep(
  userId: string | null | undefined,
  route: OnboardingRouteName,
): Promise<void> {
  if (!userId) return;
  await setItemScoped(userId, ROUTE_KEY, route);
}

export async function loadOnboardingStep(userId: string | null | undefined): Promise<OnboardingRouteName> {
  if (!userId) return 'Welcome';
  try {
    const v = await getItemScoped(userId, ROUTE_KEY);
    if (v && isOnboardingRoute(v)) return v;
  } catch {
    /* ignore */
  }
  return 'Welcome';
}

export async function clearOnboardingStep(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await removeItemScoped(userId, ROUTE_KEY);
  } catch {
    /* ignore */
  }
}

export async function setOnboardingMoodSavedHint(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  await setItemScoped(userId, MOOD_HINT_KEY, '1');
}

export async function clearOnboardingMoodSavedHint(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await removeItemScoped(userId, MOOD_HINT_KEY);
  } catch {
    /* ignore */
  }
}

export async function hasOnboardingMoodSavedHint(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    return (await getItemScoped(userId, MOOD_HINT_KEY)) === '1';
  } catch {
    return false;
  }
}
