/**
 * useInsightForScreen - Centralized insight selection for screens (Phase 6)
 * Encapsulates: filterUnseenInsights, selectInsightForScreen, markInsightSeen, logTelemetry
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { logTelemetry } from '@/lib/telemetry';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import {
  selectInsightForScreen,
  type PickOptions,
} from '@/lib/insights/pickInsightForScreen';
import {
  filterUnseenInsights,
  markInsightSeen,
  wasInsightSeenRecently,
} from '@/lib/insights/seenStore';

type UseInsightForScreenOpts = PickOptions & {
  /** Screen name for seenStore and telemetry */
  screen: string;
  /** When set, prefer this over screen insight unless it was seen recently and alternative exists (SleepScreen pattern) */
  localInsight?: InsightMatch | null;
};

export function useInsightForScreen(
  rankedInsights: InsightMatch[] | undefined,
  session: { user?: { id?: string } } | null,
  opts: UseInsightForScreenOpts
): InsightMatch | null {
  const {
    screen,
    localInsight,
    customPicker,
    preferredScopes,
    dashboardFirst,
    allowGlobalFallback,
    ...restPickOpts
  } = opts;

  const [unseenInsights, setUnseenInsights] = useState<InsightMatch[]>(rankedInsights ?? []);
  const [resolvedInsight, setResolvedInsight] = useState<InsightMatch | null>(
    localInsight ?? null
  );
  const lastLoggedInsightIdRef = useRef<string | null>(null);

  const userId = session?.user?.id ?? null;

  // Filter insights to unseen candidates (async, non-blocking)
  useEffect(() => {
    if (!rankedInsights?.length) {
      setUnseenInsights(rankedInsights ?? []);
      return;
    }

    const nowTs = Date.now();
    filterUnseenInsights({
      insights: rankedInsights,
      screen,
      userId,
      nowTs,
    })
      .then((filtered) => {
        setUnseenInsights(filtered.length > 0 ? filtered : rankedInsights);
      })
      .catch(() => {
        setUnseenInsights(rankedInsights);
      });
  }, [rankedInsights, screen, userId]);

  // Sync unseen when ranked changes
  useEffect(() => {
    if (!rankedInsights?.length) {
      setUnseenInsights([]);
    }
  }, [rankedInsights]);

  // Screen insight from candidates (sync)
  // Prefer unseen; if picker returns null (no scope match in unseen), retry with full list
  // so we always show a fallback when the engine has one (avoids "No new insight" when
  // unseen list has no mood/global etc. for this screen)
  const screenInsight = useMemo(() => {
    const pickOpts = {
      ...restPickOpts,
      preferredScopes,
      dashboardFirst,
      allowGlobalFallback,
      customPicker,
      screen,
    };
    const candidates = unseenInsights?.length ? unseenInsights : rankedInsights ?? [];
    if (!candidates.length) return null;

    let chosen = selectInsightForScreen(candidates, pickOpts);
    if (!chosen && rankedInsights?.length && candidates !== rankedInsights) {
      chosen = selectInsightForScreen(rankedInsights, pickOpts);
    }
    return chosen;
  }, [unseenInsights, rankedInsights, preferredScopes, dashboardFirst, allowGlobalFallback, customPicker, screen]);

  // Resolve: localInsight vs screenInsight (SleepScreen pattern - async)
  useEffect(() => {
    if (!localInsight) {
      // Id-based guard: only setState when selection actually changed (prevents infinite loops)
      const nextId = screenInsight?.id ?? null;
      setResolvedInsight((prev) => (prev?.id === nextId ? prev : (screenInsight ?? null)));
      return;
    }

    const nowTs = Date.now();
    wasInsightSeenRecently({
      userId,
      screen,
      insightId: localInsight.id,
      nowTs,
    })
      .then((seen) => {
        const next = seen && screenInsight && screenInsight.id !== localInsight!.id
          ? screenInsight
          : localInsight;
        setResolvedInsight((prev) => (prev?.id === next?.id ? prev : next));
      })
      .catch(() => {
        setResolvedInsight((prev) => (prev?.id === localInsight?.id ? prev : localInsight));
      });
  }, [localInsight, screenInsight, screen, userId]);

  const insight = localInsight != null ? resolvedInsight : screenInsight;

  // Mark as seen and log telemetry when insight ID changes
  useEffect(() => {
    if (!insight) return;
    const currentId = insight.id;
    if (lastLoggedInsightIdRef.current === currentId) return;

    lastLoggedInsightIdRef.current = currentId;
    const nowTs = Date.now();

    logTelemetry({
      name: 'insight_shown',
      properties: {
        insightId: currentId,
        screenSource: screen,
        sourceTag: (insight as any)?.sourceTag ?? null,
        scopes: Array.isArray((insight as any)?.scopes) ? (insight as any).scopes : null,
      },
    }).catch(() => {});

    markInsightSeen({
      userId,
      screen,
      insightId: currentId,
      ts: nowTs,
    }).catch(() => {});
  }, [insight?.id, insight?.sourceTag, screen, userId]);

  return insight ?? null;
}
