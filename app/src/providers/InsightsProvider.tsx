// C:\Reclaim\app\src\providers\InsightsProvider.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import rawRules from '@/data/insights.json';
import {
  createInsightEngine,
  type InsightMatch,
  type InsightContext,
  type InsightRule,
  type InsightFeedbackIndex,
} from '@/lib/insights/InsightEngine';
import { fetchInsightContext, type InsightContextSourceData } from '@/lib/insights/contextBuilder';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import { getUserSettings } from '@/lib/userSettings';
import { listInsightFeedback } from '@/lib/api';

type InsightStatus = 'idle' | 'loading' | 'ready' | 'error';

type InsightValue = {
  insight: InsightMatch | null;
  insights: InsightMatch[];
  status: InsightStatus;
  lastUpdatedAt?: string;
  lastContext?: InsightContext;
  lastSource?: InsightContextSourceData;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  refresh: (reason?: string) => Promise<InsightMatch | null>;
  error?: string;
};

const ScientificInsightContext = createContext<InsightValue | undefined>(undefined);

const rules = rawRules as InsightRule[];

// Policy values (engine owns suppression; provider just passes policy)
const NOT_RELEVANT_MS = 24 * 60 * 60 * 1000;
const NOT_HELPFUL_COOLDOWN_DAYS = 7;

// ✅ Neutral “cooldown” insight so UI never goes blank
function makeCooldownInsight(): InsightMatch {
  return {
    id: 'cooldown-not-relevant',
    sourceTag: 'cooldown',
    icon: 'clock-outline',
    message: 'No new insight right now.',
    action: 'Log a quick check-in or refresh later.',
    why: 'You marked the current suggestion as “not relevant now”, so I’m holding off for a bit.',
    matchedConditions: [],
  } as any;
}

/**
 * Build a lightweight "latest feedback by insight_id" index.
 * listInsightFeedback is expected to return newest-first.
 */
function buildFeedbackIndex(rows: any[] | null | undefined): InsightFeedbackIndex {
  const latestById = new Map<string, { created_at: string; helpful: boolean; reason?: string | null }>();

  for (const r of rows ?? []) {
    const id = (r as any)?.insight_id;
    if (!id) continue;

    if (!latestById.has(id)) {
      latestById.set(id, {
        created_at: String((r as any)?.created_at ?? ''),
        helpful: (r as any)?.helpful === true,
        reason: (r as any)?.reason ?? null,
      });
    }
  }

  const newest = rows && rows.length ? String((rows[0] as any)?.created_at ?? '') : '';
  const fingerprint = `n=${rows?.length ?? 0};newest=${newest}`;

  return {
    fingerprint,
    getLatest: (insightId: string) => {
      const row = latestById.get(insightId);
      if (!row) return null;
      return { created_at: row.created_at, helpful: row.helpful, reason: row.reason ?? null };
    },
  };
}

export function InsightsProvider({ children }: PropsWithChildren) {
  const qc = useQueryClient();
  const engineRef = useRef(createInsightEngine(rules));

  const { session, loading: authLoading } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [insight, setInsight] = useState<InsightMatch | null>(null);
  const [insights, setInsights] = useState<InsightMatch[]>([]);
  const [status, setStatus] = useState<InsightStatus>('idle');
  const [error, setError] = useState<string | undefined>(undefined);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(undefined);
  const [lastContext, setLastContext] = useState<InsightContext | undefined>(undefined);
  const [lastSource, setLastSource] = useState<InsightContextSourceData | undefined>(undefined);

  const inflight = useRef<Promise<InsightMatch | null> | null>(null);

  const { data: userSettings } = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  // ✅ Feedback is fetched/cached outside refresh(). Refresh uses whatever is already in cache.
  const feedbackQ = useQuery({
    queryKey: ['insights:feedback:latest50'],
    queryFn: () => listInsightFeedback(50),
    enabled: !!session && enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });

  const feedbackIndex = useMemo(() => {
    if (!Array.isArray(feedbackQ.data) || feedbackQ.data.length === 0) return null;
    return buildFeedbackIndex(feedbackQ.data as any);
  }, [feedbackQ.data]);

  const refresh = useCallback(
    async (reason?: string): Promise<InsightMatch | null> => {
      if (!enabled) {
        setInsight(null);
        setInsights([]);
        setStatus('ready');
        return null;
      }

      if (!session) {
        setInsight(null);
        setInsights([]);
        setStatus('idle');
        return null;
      }

      if (inflight.current) return inflight.current;

      setStatus('loading');
      setError(undefined);

      const run = (async () => {
        try {
          const { context, source } = await fetchInsightContext();

          const allWithPolicy = feedbackIndex
            ? engineRef.current.evaluateAll(context, {
                now: new Date(),
                feedback: {
                  index: feedbackIndex,
                  cooldownDays: NOT_HELPFUL_COOLDOWN_DAYS,
                  notRelevantMs: NOT_RELEVANT_MS,
                },
              })
            : engineRef.current.evaluateAll(context);

          let chosen: InsightMatch | null = allWithPolicy[0] ?? null;
          let finalList: InsightMatch[] = allWithPolicy;

          // ✅ If suppression removed everything but raw matching had candidates → show neutral cooldown
          if (feedbackIndex && allWithPolicy.length === 0) {
            const allRaw = engineRef.current.evaluateAll(context);
            if (allRaw.length > 0) {
              chosen = makeCooldownInsight();
              finalList = [chosen];
            }
          }

          setInsight(chosen);
          setInsights(finalList);

          setLastContext(context);
          setLastSource(source);
          setLastUpdatedAt(new Date().toISOString());
          setStatus('ready');

          if (reason) {
            logger.debug('Insight refreshed', { reason, matchId: (chosen as any)?.id ?? null });
          }

          return chosen;
        } catch (err: any) {
          const message = err?.message ?? 'Unable to compute insight';
          logger.warn('Insight computation failed', err);
          setInsight(null);
          setInsights([]);
          setStatus('error');
          setError(message);
          return null;
        } finally {
          inflight.current = null;
        }
      })();

      inflight.current = run;
      return run;
    },
    [enabled, feedbackIndex, session],
  );

  const value = useMemo<InsightValue>(
    () => ({
      insight,
      insights,
      status,
      lastUpdatedAt,
      lastContext,
      lastSource,
      enabled,
      setEnabled,
      refresh,
      error,
    }),
    [enabled, error, insight, insights, lastContext, lastSource, lastUpdatedAt, refresh, status],
  );

  // Sync enabled from settings once loaded
  useEffect(() => {
    if (userSettings?.scientificInsightsEnabled !== undefined) {
      setEnabled(userSettings.scientificInsightsEnabled);
    }
  }, [userSettings?.scientificInsightsEnabled]);

  // When disabled, clear immediately
  useEffect(() => {
    if (!enabled) {
      setInsight(null);
      setInsights([]);
      setStatus('ready');
    }
  }, [enabled]);

  // ✅ Single startup path: when session becomes available and enabled is true, refresh.
  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      setInsight(null);
      setInsights([]);
      setStatus('idle');
      setLastContext(undefined);
      setLastSource(undefined);
      return;
    }

    if (!enabled) return;

    // Ensure feedback is warm (non-blocking)
    qc.prefetchQuery({ queryKey: ['insights:feedback:latest50'], queryFn: () => listInsightFeedback(50) }).catch(
      () => {},
    );

    refresh('session-ready').catch(() => {});
  }, [authLoading, enabled, qc, refresh, session]);

  // If user toggles insights ON after being off, refresh once
  const prevEnabled = useRef<boolean>(enabled);
  useEffect(() => {
    const wasEnabled = prevEnabled.current;
    prevEnabled.current = enabled;

    if (!wasEnabled && enabled && !authLoading && session) {
      refresh('enabled-toggled-on').catch(() => {});
    }
  }, [authLoading, enabled, refresh, session]);

  return <ScientificInsightContext.Provider value={value}>{children}</ScientificInsightContext.Provider>;
}

export function useScientificInsights(): InsightValue {
  const ctx = useContext(ScientificInsightContext);
  if (!ctx) {
    throw new Error('useScientificInsights must be used within InsightsProvider');
  }
  return ctx;
}
