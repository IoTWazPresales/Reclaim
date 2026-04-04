/**
 * Per-user dismissal for one-time post-onboarding home guidance (Dashboard).
 * Scoped by userId — no global theme or navigation changes.
 */
import { getItemScoped, setItemScoped } from '@/persistence/ScopedStorage';

const POST_ONBOARDING_HOME_GUIDE_KEY = 'guide:post_onboarding_home:v1';

export async function isPostOnboardingHomeGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const v = await getItemScoped(userId, POST_ONBOARDING_HOME_GUIDE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function dismissPostOnboardingHomeGuide(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await setItemScoped(userId, POST_ONBOARDING_HOME_GUIDE_KEY, '1');
  } catch {
    // non-fatal
  }
}
