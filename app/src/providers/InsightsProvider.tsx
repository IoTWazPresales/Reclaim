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
  buildFeedbackIndexFromLatestById,
  buildFeedbackIndexFromRows,
} from '@/lib/insights/InsightEngine';

import { fetchInsightContext, type InsightContextSourceData } from '@/lib/insights/contextBuilder';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import { getUserSettings } from '@/lib/userSettings';
import { listLatestInsightFeedback } from '@/lib/api';

type InsightStatus = 'idle' | 'loading' | 'ready' | 'error';

type InsightValue = {
  insights: InsightMatch[];
  status: InsightStatus;
  lastUpdatedAt?: string;
  lastContext?: InsightContext;
  lastSource?: InsightContextSourceData;
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  refresh: (reason?: string) => Promise<InsightMatch[]>;
  error?: string;
};

const ScientificInsightContext = createContext<InsightValue | undefined>(undefined);

const rules = rawRules as unknown as InsightRule[];

// Policy values (engine owns suppression; provider passes policy)
const NOT_RELEVANT_MS = 24 * 60 * 60 * 1000;
const NOT_HELPFUL_COOLDOWN_DAYS = 7;

export function InsightsProvider({ children }: PropsWithChildren) {
  const qc = useQueryClient();
  const engineRef = useRef(createInsightEngine(rules));

  const { session, loading: authLoading } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [insights, setInsights] = useState<InsightMatch[]>([]);
  const [status, setStatus] = useState<InsightStatus>('idle');
  const [error, setError] = useState<string | undefined>(undefined);

  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(undefined);
  const [lastContext, setLastContext] = useState<InsightContext | undefined>(undefined);
  const [lastSource, setLastSource] = useState<InsightContextSourceData | undefined>(undefined);

  const inflight = useRef<Promise<InsightMatch[]> | null>(null);
  const lastRefreshTsRef = useRef<number>(0);
  const INSIGHT_REFRESH_DEBOUNCE_MS = 5 * 60 * 1000;

  const { data: userSettings } = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  // Keep a cached feedback query so InsightCard invalidation/refetch has somewhere to land.
  // refresh() does NOT depend on this for correctness (it uses fetchInsightContext()).
  useQuery({
    queryKey: ['insights:feedback:latest250'],
    queryFn: () => listLatestInsightFeedback(250),
    enabled: !!session && enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    throwOnError: false,
  });

  const refresh = useCallback(
    async (reason?: string): Promise<InsightMatch[]> => {
      if (!enabled) {
        setInsights([]);
        setStatus('ready');
        return [];
      }

      if (!session) {
        setInsights([]);
        setStatus('idle');
        return [];
      }

      if (inflight.current) return inflight.current;

      setStatus('loading');
      setError(undefined);

      const run = (async () => {
        try {
          const { context, source } = await fetchInsightContext();

          // Primary: feedback reduced latestById from contextBuilder
          let feedbackIndex = buildFeedbackIndexFromLatestById(source?.insightFeedbackLatestById ?? null);

          // Fallback: cached query rows
          if (!feedbackIndex) {
            const cached = qc.getQueryData<any>(['insights:feedback:latest250']);
            const rows = cached?.rows ?? cached ?? null;
            feedbackIndex = buildFeedbackIndexFromRows(Array.isArray(rows) ? rows : null);
          }

          const list = feedbackIndex
            ? engineRef.current.evaluateAll(context, {
                now: new Date(),
                feedback: {
                  index: feedbackIndex,
                  cooldownDays: NOT_HELPFUL_COOLDOWN_DAYS,
                  notRelevantMs: NOT_RELEVANT_MS,
                },
              })
            : engineRef.current.evaluateAll(context);

          setInsights(list);

          setLastContext(context);
          setLastSource(source);
          setLastUpdatedAt(new Date().toISOString());
          setStatus('ready');

          if (reason) {
            logger.debug('Insights refreshed', {
              reason,
              count: list.length,
              topId: list[0]?.id ?? null,
              feedbackFingerprint: feedbackIndex?.fingerprint ?? null,
            });
          }

          return list;
        } catch (err: any) {
          const message = err?.message ?? 'Unable to compute insights';
          logger.warn('Insight computation failed', err);
          setInsights([]);
          setStatus('error');
          setError(message);
          return [];
        } finally {
          inflight.current = null;
        }
      })();

      inflight.current = run;
      return run;
    },
    [enabled, qc, session],
  );

  const value = useMemo<InsightValue>(
    () => ({
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
    [enabled, error, insights, lastContext, lastSource, lastUpdatedAt, refresh, status],
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
      setInsights([]);
      setStatus('ready');
    }
  }, [enabled]);

  // Startup refresh (debounced: skip if we refreshed in the last 5 min to avoid heavy resync on every app open)
  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      setInsights([]);
      setStatus('idle');
      setLastContext(undefined);
      setLastSource(undefined);
      return;
    }

    if (!enabled) return;

    const now = Date.now();
    if (lastRefreshTsRef.current > 0 && now - lastRefreshTsRef.current < INSIGHT_REFRESH_DEBOUNCE_MS) {
      return;
    }
    lastRefreshTsRef.current = now;

    // Warm feedback query (non-blocking)
    qc.prefetchQuery({
      queryKey: ['insights:feedback:latest250'],
      queryFn: () => listLatestInsightFeedback(250),
    }).catch(() => {});

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
