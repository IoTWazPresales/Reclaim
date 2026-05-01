/**
 * Single service path for onboarding completion writes.
 * Routes through setHasOnboarded (monotonic) and profiles update.
 */

import { supabase } from '@/lib/supabase';
import { setHasOnboarded } from '@/state/onboarding';
import { ensureProfile } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Mark onboarding complete for user. Writes to local storage (monotonic) and Supabase profiles.
 */
export async function markOnboardingComplete(userId: string): Promise<void> {
  if (!userId) return;
  logger.debug('[ONBOARD_MONO] markOnboardingComplete userId=', userId);

  try {
    await ensureProfile();
  } catch (e: any) {
    logger.warn('[ONBOARD_MONO] ensureProfile failed:', e?.message);
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, has_onboarded: true }, { onConflict: 'id' });
    if (error) {
      logger.warn('[ONBOARD_MONO] profiles upsert error:', error.message);
    } else {
      logger.debug('[ONBOARD_MONO] profiles updated');
    }
  } catch (e: any) {
    logger.warn('[ONBOARD_MONO] profiles update exception:', e?.message);
  }

  await setHasOnboarded(userId, true);
  logger.debug('[ONBOARD_MONO] local set true');
}
