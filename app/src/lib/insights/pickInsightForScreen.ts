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

function matchesScope(insight: InsightMatch, scope: ScreenScope | string, allowGlobal: boolean): boolean {
  const scopes = insight.scopes;
  if (Array.isArray(scopes) && scopes.length) {
    return scopes.includes(scope as ScreenScope) || (allowGlobal && scopes.includes('global'));
  }

  // No scopes: only allow if explicitly global is permitted
  return allowGlobal && scope === 'global';
}

/**
 * Pick one insight from candidates by scope preference.
 * All fallbacks come from insights.json; returns null only when no match (rare).
 */
export function pickInsightForScreen(insights: InsightMatch[] | undefined, opts: PickOptions): InsightMatch | null {
  const list = Array.isArray(insights) ? insights : [];
  if (opts.customPicker) {
    const chosen = opts.customPicker(list);
    return chosen ?? null;
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

  if (__DEV__) {
    const counts = {
      total: list.length,
      preferredScopes: preferred,
      chosen: chosen?.id ?? null,
      allowGlobal,
      dashboardFirst: !!opts.dashboardFirst,
    };
    // eslint-disable-next-line no-console
    console.debug('[Insights] pickInsightForScreen', counts);
  }

  return chosen;
}

/**
 * Centralized selection with [INSIGHT_SELECT] logging (Phase 6).
 * Wraps pickInsightForScreen; use this for per-screen selection.
 */
export function selectInsightForScreen(
  candidates: InsightMatch[] | undefined,
  opts: PickOptions
): InsightMatch | null {
  const list = Array.isArray(candidates) ? candidates : [];
  const chosen = pickInsightForScreen(list, opts);
  logger.debug('[INSIGHT_SELECT]', {
    screen: opts.screen ?? opts.preferredScopes?.[0] ?? 'global',
    chosen: chosen?.id ?? null,
    candidateCount: list.length,
  });
  return chosen;
}
