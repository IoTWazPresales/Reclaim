import { supabase } from '@/lib/supabase';
import { markOnboardingComplete } from '@/lib/onboardingService';
import { logger } from '@/lib/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Marks onboarding complete via onboardingService, and flags the
 * current session as "just onboarded" for UI hints (Dashboard chip).
 */
export async function completeOnboarding(): Promise<void> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (e: any) {
    logger.warn('[completeOnboarding] getUser failed:', e?.message);
  }

  if (userId) {
    await markOnboardingComplete(userId);
  } else {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await markOnboardingComplete(user.id);
      }
    } catch {
      logger.warn('[completeOnboarding] Could not mark complete: userId unavailable');
    }
  }

  try {
    await AsyncStorage.setItem('@reclaim/just_onboarded_hint', '1');
  } catch {
    // ignore
  }

  // Signal Dashboard to show post-onboarding hint once
  (globalThis as any).__justOnboarded = true;

  // Trigger RootNavigator to re-check onboarding status
  // RootNavigator will read from SecureStore (which we just set) and update state
  if ((globalThis as any).__refreshOnboarding) {
    (globalThis as any).__refreshOnboarding();
  }
}


