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
import { useQuery } from '@tanstack/react-query';

import rawRules from '@/data/insights.json';
import { createInsightEngine, type InsightMatch, type InsightContext, type InsightRule } from '@/lib/insights/InsightEngine';
import { fetchInsightContext, type InsightContextSourceData } from '@/lib/insights/contextBuilder';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import { getUserSettings } from '@/lib/userSettings';

type InsightStatus = 'idle' | 'loading' | 'ready' | 'error';

type InsightValue = {
  insight: InsightMatch | null;
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

export function InsightsProvider({ children }: PropsWithChildren) {
  const engineRef = useRef(createInsightEngine(rules));
  const [enabled, setEnabled] = useState(true);
  const [insight, setInsight] = useState<InsightMatch | null>(null);
  const [status, setStatus] = useState<InsightStatus>('idle');
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>(undefined);
  const [lastContext, setLastContext] = useState<InsightContext | undefined>(undefined);
  const [lastSource, setLastSource] = useState<InsightContextSourceData | undefined>(undefined);
  const inflight = useRef<Promise<InsightMatch | null> | null>(null);
  const { session, loading: authLoading } = useAuth();
  const { data: userSettings } = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const refresh = useCallback(
    async (reason?: string): Promise<InsightMatch | null> => {
      if (!enabled) {
        setInsight(null);
        setStatus('ready');
        return null;
      }

      if (inflight.current) {
        return inflight.current;
      }

      setStatus('loading');
      setError(undefined);

      const run = (async () => {
        try {
          // Use setTimeout to ensure this runs on next tick and doesn't block UI
          await new Promise(resolve => setTimeout(resolve, 0));
          const { context, source } = await fetchInsightContext();
          const match = engineRef.current.evaluate(context);
          // Batch state updates to prevent multiple re-renders
          setInsight(match);
          setLastContext(context);
          setLastSource(source);
          setLastUpdatedAt(new Date().toISOString());
          setStatus('ready');
          if (reason) {
            logger.debug('Insight refreshed', { reason, matchId: match?.id });
          }
          return match;
        } catch (err: any) {
          const message = err?.message ?? 'Unable to compute insight';
          logger.warn('Insight computation failed', err);
          setInsight(null);
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
    [enabled],
  );

  const value = useMemo<InsightValue>(
    () => ({
      insight,
      status,
      lastUpdatedAt,
      lastContext,
      lastSource,
      enabled,
      setEnabled,
      refresh,
      error,
    }),
    [enabled, error, insight, lastContext, lastSource, lastUpdatedAt, refresh, status],
  );

  useEffect(() => {
    if (userSettings?.scientificInsightsEnabled !== undefined) {
      setEnabled(userSettings.scientificInsightsEnabled);
    }
  }, [userSettings?.scientificInsightsEnabled]);

  useEffect(() => {
    if (!enabled) {
      setInsight(null);
      setStatus('ready');
    }
  }, [enabled]);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setInsight(null);
      setStatus('idle');
      setLastContext(undefined);
      setLastSource(undefined);
      return;
    }
    refresh('session-ready').catch(() => {
      // handled inside refresh
    });
  }, [authLoading, refresh, session]);

  useEffect(() => {
    if (!enabled || authLoading || !session) {
      return;
    }
    refresh('insight-enabled').catch(() => {
      // handled inside refresh
    });
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


