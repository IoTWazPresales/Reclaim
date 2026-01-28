/**
 * Central map of cache domains → React Query keys for sync-related invalidations.
 * Use via SyncManager only; screens should not invalidate ad-hoc for sync.
 */

export const CACHE_DOMAINS = {
  sleep: ['sleep:last', 'sleep:sessions:30d'],
  dashboard: ['dashboard:lastSleep'],
  sleep_settings: ['sleep:settings'],
  mood: ['mood:local', 'mood:daily:supabase', 'mood:checkins:7d'],
  meditation: ['meditations'],
  training: ['training:sessions', 'training:profile', 'training:activeProgram'],
} as const;

export type CacheDomain = keyof typeof CACHE_DOMAINS;

/**
 * Returns query keys to invalidate for the given domains.
 * Each entry is a query key (string or string[]).
 */
export function getInvalidationKeys(domains: CacheDomain[]): (string | string[])[] {
  const keys: (string | string[])[] = [];
  const seen = new Set<string>();
  for (const d of domains) {
    const domainKeys = CACHE_DOMAINS[d];
    if (!domainKeys) continue;
    for (const k of domainKeys) {
      const qk = [k] as string[];
      const sig = JSON.stringify(qk);
      if (seen.has(sig)) continue;
      seen.add(sig);
      keys.push(qk.length === 1 ? qk[0] : qk);
    }
  }
  return keys;
}
