/**
 * premiumConfig.ts
 *
 * Defines the Reclaim premium tier — what's free, what's premium,
 * and the RevenueCat entitlement/offering identifiers.
 *
 * To connect to RevenueCat:
 *   1. Set REVENUECAT_API_KEY_IOS and REVENUECAT_API_KEY_ANDROID in your .env / app.config.ts
 *   2. Create a product in App Store Connect / Google Play with identifier matching PRODUCT_ID
 *   3. Create a RevenueCat entitlement named "premium" with that product attached
 */

export const RC_ENTITLEMENT_ID = 'premium';
export const RC_OFFERING_ID = 'default';

/** Feature flags — what each tier unlocks */
export const PREMIUM_FEATURES = {
  /** Core: always free */
  moodLogging: 'free',
  sleepTracking: 'free',
  medicationTracking: 'free',
  dailySignalInsight: 'free',
  streaks: 'free',
  weeklyNarrativeNotification: 'free',

  /** Premium-gated features */
  insightHistory: 'premium',
  therapistExport: 'premium',
  advancedInsights: 'premium', // cross-domain, personalised baseline rules
  unlimitedRules: 'premium', // full 80+ rule set vs 10-rule free tier
  prioritySupport: 'premium',
} as const;

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

export const FREE_RULE_LIMIT = 10; // Free users see the top 10 insights only

/** Total rules shipped in insights.json — used for "10 of N" quota UI */
export const TOTAL_INSIGHT_RULE_COUNT = 88;

/**
 * Launch promotional period — full premium features without purchase.
 * Default ON until EXPO_PUBLIC_PROMOTIONAL_RUN is set to "0" or "false" in EAS/env.
 */
export function isPromotionalRunActive(): boolean {
  const raw = process.env.EXPO_PUBLIC_PROMOTIONAL_RUN;
  if (raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  return true;
}
