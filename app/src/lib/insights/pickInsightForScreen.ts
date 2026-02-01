// C:\Reclaim\app\src\lib\insights\pickInsightForScreen.ts

import { logger } from '@/lib/logger';
import type { InsightMatch, ScreenScope } from '@/lib/insights/InsightEngine';

// Re-export to keep existing imports stable
export type InsightScope = ScreenScope;

export type PickOptions = {
  preferredScopes: (ScreenScope | string)[];
  allowGlobalFallback?: boolean;
  allowCooldown?: boolean; // kept for compatibility; no-op here
  dashboardFirst?: boolean;
  /** Custom picker; when provided, used instead of scope-based pick. */
  customPicker?: (candidates: InsightMatch[]) => InsightMatch | null;
  /** Actual screen name for logging (dashboard, mood, sleep, meds). */
  screen?: string;
};

/** Cache fallbacks by id to avoid new objects every call (prevents setState loops). */
const fallbackCache = new Map<string, InsightMatch>();

function matchesScope(insight: InsightMatch, scope: ScreenScope | string, allowGlobal: boolean): boolean {
  const scopes = insight.scopes;
  if (Array.isArray(scopes) && scopes.length) {
    return scopes.includes(scope as ScreenScope) || (allowGlobal && scopes.includes('global'));
  }

  // No scopes: only allow if explicitly global is permitted
  return allowGlobal && scope === 'global';
}

function contextualFallback(scope: ScreenScope | string): InsightMatch {
  const key = `fallback-${scope || 'global'}`;
  let cached = fallbackCache.get(key);
  if (cached) return cached;

  const msgFor: Record<string, string> = {
    mood: 'Log your mood to unlock personalized trends.',
    sleep: 'Sync or log sleep to unlock better sleep nudges.',
    meds: 'Keep logging meds to get adherence tips.',
    dashboard: 'Keep logging to unlock personalized insights.',
    global: 'Keep logging to unlock personalized insights.',
  };

  cached = {
    id: key,
    priority: -999,
    message: msgFor[String(scope)] ?? msgFor.global,
    matchedConditions: [],
    scopes: [scope as ScreenScope],
  };
  fallbackCache.set(key, cached);
  return cached;
}

function universalFallback(): InsightMatch {
  const key = 'fallback-universal';
  let cached = fallbackCache.get(key);
  if (cached) return cached;

  cached = {
    id: key,
    priority: -1000,
    message: 'No insights yet — keep logging for better guidance.',
    matchedConditions: [],
    scopes: ['global'],
  };
  fallbackCache.set(key, cached);
  return cached;
}

/**
 * Mood-specific picker: prefer mood-tagged, then global, then cooldown, then first.
 * Used by MoodScreen (Phase 6 centralization).
 */
export function pickBySourceTag(
  candidates: InsightMatch[],
  tagOrder: string[] = ['mood', 'global', 'cooldown']
): InsightMatch | null {
  if (!candidates?.length) return null;
  const norm = (x: any) => String(x ?? '').toLowerCase().trim();
  const tagOf = (x: any) => norm(x?.sourceTag ?? x?.id ?? '');

  for (const tag of tagOrder) {
    const match = candidates.find((x) => {
      const t = tagOf(x);
      if (tag === 'mood') return t === 'mood' || t.startsWith('mood-') || t.includes('mood');
      if (tag === 'global') return t === 'global';
      if (tag === 'cooldown') return t === 'cooldown' || norm(x?.id).includes('cooldown');
      return t.includes(tag);
    });
    if (match) return match;
  }
  return candidates[0] ?? null;
}

export function pickInsightForScreen(insights: InsightMatch[] | undefined, opts: PickOptions): InsightMatch {
  const list = Array.isArray(insights) ? insights : [];
  if (opts.customPicker) {
    const chosen = opts.customPicker(list);
    if (chosen) return chosen;
    return contextualFallback((opts.preferredScopes?.[0] as ScreenScope) || 'global');
  }

  const allowGlobal = opts.allowGlobalFallback !== false;
  const preferred = opts.preferredScopes && opts.preferredScopes.length ? opts.preferredScopes : ['global'];

  // Preserve existing ordering (engine already sorted by priority)
  let chosen: InsightMatch | null = null;

  if (opts.dashboardFirst) {
    const dashMatch = list.find((i) => matchesScope(i, 'dashboard', allowGlobal));
    if (dashMatch) chosen = dashMatch;
  }

  if (!chosen) {
    for (const scope of preferred) {
      const match = list.find((i) => matchesScope(i, scope, allowGlobal));
      if (match) {
        chosen = match;
        break;
      }
    }
  }

  if (!chosen && allowGlobal) {
    chosen = list.find((i) => matchesScope(i, 'global', true)) ?? null;
  }

  // Fallback chain: contextual -> universal
  if (!chosen) {
    const fallbackScope = (preferred[0] as ScreenScope) || 'global';
    chosen = contextualFallback(fallbackScope);
  }

  const finalInsight = chosen ?? universalFallback();

  if (__DEV__) {
    const counts = {
      total: list.length,
      preferredScopes: preferred,
      chosen: finalInsight?.id ?? null,
      allowGlobal,
      dashboardFirst: !!opts.dashboardFirst,
    };
    // eslint-disable-next-line no-console
    console.debug('[Insights] pickInsightForScreen', counts);
  }

  return finalInsight;
}

/**
 * Centralized selection with [INSIGHT_SELECT] logging (Phase 6).
 * Wraps pickInsightForScreen; use this for per-screen selection.
 */
export function selectInsightForScreen(
  candidates: InsightMatch[] | undefined,
  opts: PickOptions
): InsightMatch {
  const list = Array.isArray(candidates) ? candidates : [];
  const chosen = pickInsightForScreen(list, opts);
  logger.debug('[INSIGHT_SELECT]', {
    screen: opts.screen ?? opts.preferredScopes?.[0] ?? 'global',
    chosen: chosen?.id ?? null,
    candidateCount: list.length,
  });
  return chosen;
}
