// Badge Manager - Centralized badge count management
import * as Notifications from 'expo-notifications';
import { logger } from '../logger';

/**
 * Set app icon badge count
 * This is the ONLY function that should call setBadgeCountAsync
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
    if (__DEV__) {
      logger.debug(`[BadgeManager] Set badge count to ${count}`);
    }
  } catch (error) {
    logger.warn('Failed to set badge count:', error);
  }
}

/**
 * Clear badge count (set to 0)
 * Call this when user opens the app
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Increment badge count
 */
export async function incrementBadge(by: number = 1): Promise<void> {
  try {
    const current = await Notifications.getBadgeCountAsync();
    await setBadgeCount(current + by);
  } catch (error) {
    logger.warn('Failed to increment badge:', error);
  }
}

/**
 * Get current badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    logger.warn('Failed to get badge count:', error);
    return 0;
  }
}
