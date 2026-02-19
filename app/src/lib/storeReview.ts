/**
 * storeReview.ts
 *
 * Requests an App Store / Google Play in-app review at the right moment —
 * specifically when a new streak badge is earned.
 *
 * Rules:
 *  - Only request if the OS reports it is available.
 *  - Never request more than once per 90 days (tracked in AsyncStorage).
 *  - Never request on the very first badge (wait for the 2nd+ badge event).
 *  - Uses expo-store-review so no native config is needed beyond the package.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { logger } from '@/lib/logger';

const LAST_PROMPTED_KEY = 'storeReview:lastPromptedAt';
const MIN_INTERVAL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

async function wasPromptedRecently(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PROMPTED_KEY);
    if (!raw) return false;
    const last = parseInt(raw, 10);
    return Date.now() - last < MIN_INTERVAL_MS;
  } catch {
    return false;
  }
}

async function markPrompted(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PROMPTED_KEY, String(Date.now()));
  } catch {
    // non-fatal
  }
}

/**
 * Attempt to show the in-app store review dialog.
 *
 * @param badgeCount - total number of badges the user has earned to date
 *                     (we skip the very first badge to avoid premature prompts)
 */
export async function maybeRequestStoreReview(badgeCount: number): Promise<void> {
  try {
    // Require at least 2 badges before asking
    if (badgeCount < 2) return;

    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    if (await wasPromptedRecently()) return;

    await StoreReview.requestReview();
    await markPrompted();
    logger.info('[StoreReview] review prompt displayed');
  } catch (e) {
    // Never crash the app over a review prompt
    logger.warn('[StoreReview] failed silently:', e);
  }
}
