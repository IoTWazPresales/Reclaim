import { supabase } from '@/lib/supabase';
import { setHasOnboarded } from '@/state/onboarding';
import { logger } from '@/lib/logger';
import { ensureProfile } from '@/lib/api';
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
      
      // Ensure profile row exists before updating
      try {
        await ensureProfile();
      } catch (e: any) {
        if (__DEV__) {
          console.error('[completeOnboarding] ensureProfile failed:', {
            message: e?.message,
            code: (e as any)?.code,
            details: (e as any)?.details,
            hint: (e as any)?.hint,
            fullError: e,
          });
        }
        logger.warn('Failed to ensure profile exists:', e);
      }
      
      // Use upsert instead of update to handle missing row case
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, has_onboarded: true }, { onConflict: 'id' });
      
      if (error) {
        if (__DEV__) {
          console.error('[completeOnboarding] Supabase upsert error:', {
            message: error.message,
            code: (error as any).code,
            details: (error as any).details,
            hint: (error as any).hint,
            fullError: error,
            userId: user.id,
          });
        }
        logger.warn('Failed to upsert has_onboarded in profiles:', error);
      }
    }
  } catch (e: any) {
    if (__DEV__) {
      console.error('[completeOnboarding] Error updating profile:', {
        message: e?.message,
        code: (e as any)?.code,
        details: (e as any)?.details,
        hint: (e as any)?.hint,
        fullError: e,
      });
    }
    logger.warn('Error updating profile:', e);
  }

  // Set local SecureStore flag (this is the source of truth for RootNavigator)
  // Always attempt to set, even if userId is null (will be set when userId becomes available)
  // If userId is null, we'll retry via __refreshOnboarding when session is available
  if (userId) {
    await setHasOnboarded(userId, true);
  } else {
    // If userId is not available, try to get it again
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await setHasOnboarded(user.id, true);
      }
    } catch {
      // If still can't get userId, log but don't fail
      logger.warn('[completeOnboarding] Could not set local flag: userId unavailable');
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


