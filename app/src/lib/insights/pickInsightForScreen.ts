// C:\Reclaim\app\src\lib\insights\pickInsightForScreen.ts

import type { InsightMatch, ScreenScope } from '@/lib/insights/InsightEngine';

// Re-export to keep existing imports stable
export type InsightScope = ScreenScope;

type PickOptions = {
  preferredScopes: (ScreenScope | string)[];
  allowGlobalFallback?: boolean;
  allowCooldown?: boolean; // kept for compatibility; no-op here
  dashboardFirst?: boolean;
};

function matchesScope(insight: InsightMatch, scope: ScreenScope | string, allowGlobal: boolean): boolean {
  const scopes = insight.scopes;
  if (Array.isArray(scopes) && scopes.length) {
    return scopes.includes(scope as ScreenScope) || (allowGlobal && scopes.includes('global'));
  }

  // No scopes: only allow if explicitly global is permitted
  return allowGlobal && scope === 'global';
}

function contextualFallback(scope: ScreenScope | string): InsightMatch {
  const msgFor: Record<string, string> = {
    mood: 'Log your mood to unlock personalized trends.',
    sleep: 'Sync or log sleep to unlock better sleep nudges.',
    meds: 'Keep logging meds to get adherence tips.',
    dashboard: 'Keep logging to unlock personalized insights.',
    global: 'Keep logging to unlock personalized insights.',
  };

  return {
    id: `fallback-${scope || 'global'}`,
    priority: -999,
    message: msgFor[String(scope)] ?? msgFor.global,
    matchedConditions: [],
    scopes: [scope as ScreenScope],
  };
}

function universalFallback(): InsightMatch {
  return {
    id: 'fallback-universal',
    priority: -1000,
    message: 'No insights yet — keep logging for better guidance.',
    matchedConditions: [],
    scopes: ['global'],
  };
}

export function pickInsightForScreen(insights: InsightMatch[] | undefined, opts: PickOptions): InsightMatch {
  const list = Array.isArray(insights) ? insights : [];
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
