/**
 * Per-user dismissal for one-time first-use guidance (Dashboard Home, Sleep, etc.).
 * Scoped by userId — no global theme or navigation changes.
 */
import { getItemScoped, setItemScoped } from '@/persistence/ScopedStorage';

const POST_ONBOARDING_HOME_GUIDE_KEY = 'guide:post_onboarding_home:v1';
const SLEEP_FIRST_VISIT_GUIDE_KEY = 'guide:sleep_first_visit:v1';
const TRAINING_FIRST_VISIT_GUIDE_KEY = 'guide:training_first_visit:v1';
const MOOD_FIRST_VISIT_GUIDE_KEY = 'guide:mood_first_visit:v1';
const MEDS_FIRST_VISIT_GUIDE_KEY = 'guide:meds_first_visit:v1';
const MINDFULNESS_FIRST_VISIT_GUIDE_KEY = 'guide:mindfulness_first_visit:v1';
const MEDITATION_FIRST_VISIT_GUIDE_KEY = 'guide:meditation_first_visit:v1';
const ANALYTICS_FIRST_VISIT_GUIDE_KEY = 'guide:analytics_first_visit:v1';

async function isGuideDismissed(userId: string | null | undefined, key: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const v = await getItemScoped(userId, key);
    return v === '1';
  } catch {
    return false;
  }
}

async function dismissGuide(userId: string | null | undefined, key: string): Promise<void> {
  if (!userId) return;
  try {
    await setItemScoped(userId, key, '1');
  } catch {
    // non-fatal
  }
}

export async function isPostOnboardingHomeGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, POST_ONBOARDING_HOME_GUIDE_KEY);
}

export async function dismissPostOnboardingHomeGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, POST_ONBOARDING_HOME_GUIDE_KEY);
}

export async function isSleepFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, SLEEP_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissSleepFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, SLEEP_FIRST_VISIT_GUIDE_KEY);
}

export async function isTrainingFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, TRAINING_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissTrainingFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, TRAINING_FIRST_VISIT_GUIDE_KEY);
}

export async function isMoodFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, MOOD_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissMoodFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, MOOD_FIRST_VISIT_GUIDE_KEY);
}

export async function isMedsFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, MEDS_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissMedsFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, MEDS_FIRST_VISIT_GUIDE_KEY);
}

export async function isMindfulnessFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, MINDFULNESS_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissMindfulnessFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, MINDFULNESS_FIRST_VISIT_GUIDE_KEY);
}

export async function isMeditationFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, MEDITATION_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissMeditationFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, MEDITATION_FIRST_VISIT_GUIDE_KEY);
}

export async function isAnalyticsFirstVisitGuideDismissed(userId: string | null | undefined): Promise<boolean> {
  return isGuideDismissed(userId, ANALYTICS_FIRST_VISIT_GUIDE_KEY);
}

export async function dismissAnalyticsFirstVisitGuide(userId: string | null | undefined): Promise<void> {
  return dismissGuide(userId, ANALYTICS_FIRST_VISIT_GUIDE_KEY);
}
