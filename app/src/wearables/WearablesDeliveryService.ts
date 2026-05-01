/**
 * Wearables Delivery Service - interfaces for delivering glance cards to watch platforms.
 * Phase 9: Interfaces and method stubs only. No native watchOS/Wear OS code.
 */

import { logger } from '@/lib/logger';
import type { WearableGlanceModel } from './models';

/**
 * Adapter interface for delivering cards to a wearable platform.
 * Implementations would handle platform-specific APIs (watchOS Complication, Wear OS tiles, etc.).
 */
export interface IWearablesDeliveryAdapter {
  /** Platform identifier */
  platform: 'apple_watch' | 'wear_os';
  /** Deliver cards to the platform. Returns success count. */
  deliver(cards: WearableGlanceModel[]): Promise<number>;
}

/**
 * Apple Watch adapter - stub only. No native watchOS implementation.
 */
export class AppleWatchDeliveryAdapter implements IWearablesDeliveryAdapter {
  platform = 'apple_watch' as const;

  async deliver(cards: WearableGlanceModel[]): Promise<number> {
    logger.debug('[WEAR_PROJ] Apple Watch delivery stub', { cardCount: cards.length });
    return 0;
  }
}

/**
 * Wear OS adapter - stub only. No native Wear OS implementation.
 */
export class WearOSDeliveryAdapter implements IWearablesDeliveryAdapter {
  platform = 'wear_os' as const;

  async deliver(cards: WearableGlanceModel[]): Promise<number> {
    logger.debug('[WEAR_PROJ] Wear OS delivery stub', { cardCount: cards.length });
    return 0;
  }
}
