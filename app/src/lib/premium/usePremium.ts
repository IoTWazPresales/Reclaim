/**
 * usePremium.ts
 *
 * React hook for accessing premium status and RevenueCat integration.
 *
 * Usage:
 *   const { isPremium, isLoading, purchasePremium, restorePurchases } = usePremium();
 *
 * The hook initialises RevenueCat lazily on first call.
 * It caches the entitlement result in AsyncStorage so the premium state
 * is immediately available on next app launch (before the RC network call resolves).
 */

import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { logger } from '@/lib/logger';
import { RC_ENTITLEMENT_ID } from './premiumConfig';

const CACHE_KEY = 'premium:entitlement:v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type PremiumCache = {
  isPremium: boolean;
  cachedAt: number;
};

type PremiumState = {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
};

async function loadCache(): Promise<PremiumCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PremiumCache;
  } catch {
    return null;
  }
}

async function saveCache(isPremium: boolean): Promise<void> {
  try {
    const cache: PremiumCache = { isPremium, cachedAt: Date.now() };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // non-fatal
  }
}

/**
 * Lazy-import Purchases to avoid crashing on simulators/web
 * where the native module is absent.
 */
async function getPurchases() {
  try {
    const mod = await import('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

async function getApiKey(): Promise<string | null> {
  // Keys are injected at build time via app.config.ts extra / EAS secrets.
  // Fall back gracefully during development.
  const g = globalThis as any;
  if (Platform.OS === 'ios') {
    return g.REVENUECAT_API_KEY_IOS ?? null;
  }
  return g.REVENUECAT_API_KEY_ANDROID ?? null;
}

let _initialized = false;

async function ensureInitialised(): Promise<boolean> {
  if (_initialized) return true;
  const Purchases = await getPurchases();
  if (!Purchases) return false;

  const apiKey = await getApiKey();
  if (!apiKey) {
    logger.warn('[Premium] RevenueCat API key not set — operating in free tier');
    return false;
  }

  try {
    Purchases.configure({ apiKey });
    _initialized = true;
    return true;
  } catch (e) {
    logger.warn('[Premium] configure failed:', e);
    return false;
  }
}

async function fetchEntitlementStatus(): Promise<boolean> {
  const ok = await ensureInitialised();
  if (!ok) return false;

  const Purchases = await getPurchases();
  if (!Purchases) return false;

  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[RC_ENTITLEMENT_ID];
  } catch (e) {
    logger.warn('[Premium] getCustomerInfo failed:', e);
    return false;
  }
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      // Check cache first for instant feedback
      const cache = await loadCache();
      if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
        setState({ isPremium: cache.isPremium, isLoading: false, error: null });
        return;
      }

      const isPremium = await fetchEntitlementStatus();
      await saveCache(isPremium);
      setState({ isPremium, isLoading: false, error: null });
    } catch (e: any) {
      setState((p) => ({ ...p, isLoading: false, error: e?.message ?? 'Unknown error' }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      const ok = await ensureInitialised();
      if (!ok) throw new Error('RevenueCat not available');

      const Purchases = await getPurchases();
      if (!Purchases) throw new Error('Purchases module not available');

      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.[0];
      if (!pkg) throw new Error('No packages available');

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      await saveCache(isPremium);
      setState({ isPremium, isLoading: false, error: null });
      return isPremium;
    } catch (e: any) {
      // User cancelled = not an error
      if (e?.userCancelled) {
        setState((p) => ({ ...p, isLoading: false }));
        return false;
      }
      setState((p) => ({ ...p, isLoading: false, error: e?.message ?? 'Purchase failed' }));
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setState((p) => ({ ...p, isLoading: true, error: null }));
    try {
      const ok = await ensureInitialised();
      if (!ok) throw new Error('RevenueCat not available');

      const Purchases = await getPurchases();
      if (!Purchases) throw new Error('Purchases module not available');

      const customerInfo = await Purchases.restorePurchases();
      const isPremium = !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
      await saveCache(isPremium);
      setState({ isPremium, isLoading: false, error: null });
      return isPremium;
    } catch (e: any) {
      setState((p) => ({ ...p, isLoading: false, error: e?.message ?? 'Restore failed' }));
      return false;
    }
  }, []);

  return {
    isPremium: state.isPremium,
    isLoading: state.isLoading,
    error: state.error,
    purchasePremium,
    restorePurchases,
    refresh,
  };
}
