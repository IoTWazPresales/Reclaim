import { supabase } from '@/lib/supabase';
import { setHasOnboarded } from '@/state/onboarding';
import { logger } from '@/lib/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Marks onboarding complete both locally and in Supabase, and flags the
 * current session as "just onboarded" for UI hints (Dashboard chip).
 */
export async function completeOnboarding(): Promise<void> {
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      const { error } = await supabase
        .from('profiles')
        .update({ has_onboarded: true })
        .eq('id', user.id);
      if (error) {
        logger.warn('Failed to update has_onboarded in profiles:', error);
      }
    }
  } catch (e: any) {
    logger.warn('Error updating profile:', e);
  }

  await setHasOnboarded(userId, true);

  try {
    await AsyncStorage.setItem('@reclaim/just_onboarded_hint', '1');
  } catch {
    // ignore
  }

  // Signal Dashboard to show post-onboarding hint once
  (globalThis as any).__justOnboarded = true;

  // Trigger RootNavigator to re-check onboarding status
  if ((globalThis as any).__refreshOnboarding) {
    (globalThis as any).__refreshOnboarding();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}


