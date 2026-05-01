/**
 * Per-user dismissal for one-time first-use guidance (Dashboard Home, Sleep, etc.).
 * Scoped by userId — no global theme or navigation changes.
 */
import { getItemScoped, setItemScoped } from '@/persistence/ScopedStorage';

const POST_ONBOARDING_HOME_GUIDE_KEY = 'guide:post_onboarding_home:v1';
const SLEEP_FIRST_VISIT_GUIDE_KEY = 'guide:sleep_first_visit:v1';
const TRAINING_FIRST_VISIT_GUIDE_KEY = 'guide:training_first_visit:v1';

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

export async function isSleepFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const v = await getItemScoped(userId, SLEEP_FIRST_VISIT_GUIDE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function dismissSleepFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await setItemScoped(userId, SLEEP_FIRST_VISIT_GUIDE_KEY, '1');
  } catch {
    // non-fatal
  }
}

export async function isTrainingFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const v = await getItemScoped(userId, TRAINING_FIRST_VISIT_GUIDE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function dismissTrainingFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await setItemScoped(userId, TRAINING_FIRST_VISIT_GUIDE_KEY, '1');
  } catch {
    // non-fatal
  }
}
