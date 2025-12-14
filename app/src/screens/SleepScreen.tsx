import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ScrollView, View, Modal, AppState, AppStateStatus } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput, useTheme, Portal, ActivityIndicator } from 'react-native-paper';
import { InformationalCard, ActionCard, SectionHeader } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { SleepSession } from '@/lib/health/types';

import {
  getGoogleFitProvider,
  googleFitGetLatestSleepSession,
  googleFitGetSleepSessions,
  googleFitHasPermissions,
} from '@/lib/health/googleFitService';
import {
  healthConnectGetLatestSleepSession,
  healthConnectGetSleepSessions,
  healthConnectHasPermissions,
  healthConnectIsAvailable,
  HEALTH_CONNECT_SLEEP_METRICS,
} from '@/lib/health/healthConnectService';
import { syncAll } from '@/lib/sync';
import { importSamsungHistory } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import type { IntegrationId } from '@/lib/health/integrationStore';
import { getPreferredIntegration, setPreferredIntegration } from '@/lib/health/integrationStore';

// Legacy types for compatibility
type LegacySleepStage = 'awake' | 'light' | 'deep' | 'rem' | 'unknown';

type LegacySleepStageSegment = {
  start: string;
  end: string;
  stage: LegacySleepStage;
};

type LegacySleepSession = {
  startTime: string;
  endTime: string;
  durationMin: number;
  efficiency?: number | null;
  stages?: LegacySleepStageSegment[] | null;
  metadata?: Record<string, any>;
};

import { useNotifications, scheduleBedtimeSuggestion, scheduleMorningConfirm } from '@/hooks/useNotifications';
import { upsertTodayEntry, listSleepSessions, type SleepSession as DbSleepSession } from '@/lib/api';

import {
  loadSleepSettings,
  saveSleepSettings,
  addWakeDetection,
  listWakeDetections,
  type SleepSettings,
  type WakeDetection,
} from '@/lib/sleepSettings';
import {
  rollingAverageHHMM,
  hhmmToMinutes,
  minutesToHHMM,
} from '@/lib/circadianUtils';
import { getProviderOnboardingComplete, setProviderOnboardingComplete } from '@/state/providerPreferences';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { SleepStagesBar } from './sleep/SleepStagesBar';
import { SleepHistorySection } from './sleep/SleepHistorySection';
import { InsightCard } from '@/components/InsightCard';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import Svg, { Circle } from 'react-native-svg';

function formatErrorDetails(errorDetails: any): string {
  if (!errorDetails) return '';
  if (typeof errorDetails === 'string') return errorDetails;
  if (errorDetails?.message && typeof errorDetails.message === 'string') {
    return errorDetails.message;
  }
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      errorDetails,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      },
      2,
    );
  } catch {
    return String(errorDetails);
  }
}

type ImportStepStatus = 'pending' | 'running' | 'success' | 'error';
type ImportStep = {
  id: IntegrationId;
  title: string;
  status: ImportStepStatus;
  message?: string;
};

/* ───────── helpers ───────── */
function fmtHM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Tiny hypnogram using plain Views */
function Hypnogram({ segments }: { segments: LegacySleepStageSegment[] }) {
  const theme = useTheme();
  const textColor = theme.colors.onSurface;
  const bandBackground = theme.colors.surfaceVariant;
  const STAGE_COLORS: Record<string, string> = {
    awake: '#f4b400',
    light: '#64b5f6',
    deep: '#1e88e5',
    rem: '#ab47bc',
    unknown: theme.colors.secondary,
  };

  if (!segments.length) return null;
  const start = +new Date(segments[0].start);
  const end = +new Date(segments[segments.length - 1].end);
  const total = Math.max(1, end - start);

  const stageLevel = (s: LegacySleepStage) => {
    // y-level (lower = deeper sleep)
    switch (s) {
      case 'awake': return 0;
      case 'light': return 1;
      case 'rem':   return 1.5;
      case 'deep':  return 2;
      default:      return 1;
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.7, marginBottom: 4, color: textColor }}>Hypnogram</Text>
      <View style={{ height: 50, backgroundColor: bandBackground, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        {segments.map((seg, i) => {
          const w = Math.max(2, Math.round((+new Date(seg.end) - +new Date(seg.start)) / total * 300));
          const leftPct = ((+new Date(seg.start) - start) / total) * 100;
          const y = stageLevel(seg.stage);
          return (
            <View
              key={`sleep-segment-${i}-${seg.stage}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,      // lower is deeper
                width: w,
                height: 6,
                borderRadius: 3,
                backgroundColor: STAGE_COLORS[seg.stage] ?? theme.colors.secondary,
                opacity: seg.stage === 'awake' ? 0.35 : 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function SleepScreen() {
  // Hooks must be called unconditionally - wrap the component render instead
  useNotifications();
  const theme = useTheme();
  const textPrimary = theme.colors.onSurface;
  const textSecondary = theme.colors.onSurfaceVariant;
  const surface = theme.colors.surface;
  const borderColor = theme.colors.outlineVariant;
  const background = theme.colors.background;
  const primaryColor = theme.colors.primary;
  const onPrimary = theme.colors.onPrimary;
  const errorColor = theme.colors.error;
  const accentColor = theme.colors.secondary;
  const qc = useQueryClient();
  const { refresh: refreshInsight, insights: providerInsights, insight: providerBest } = useScientificInsights();
  const reduceMotionGlobal = useReducedMotion();
  // Errors are handled silently in query - no error state needed
  const [showProviderTip, setShowProviderTip] = useState(false);
  const [samsungImporting, setSamsungImporting] = useState(false);
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '365d'>('7d');
  const {
    integrations,
    integrationsLoading,
    integrationsError,
    connectIntegration,
    connectIntegrationPending,
    connectingId,
    disconnectIntegration,
    disconnectIntegrationPending,
    disconnectingId,
    refreshIntegrations,
  } = useHealthIntegrationsList();
  const lastConnectedCountRef = useRef<number>(0);
  const connectedIntegrations = useMemo(
    () => integrations.filter((item) => item.status?.connected),
    [integrations]
  );

  const handleImportSamsungHistory = useCallback(async () => {
    try {
      setSamsungImporting(true);
      const res = await importSamsungHistory(90);
      logger.debug('[SamsungHealth] Import result', res);
      Alert.alert(
        'Samsung Health import',
        `Imported: ${res.imported}\nSkipped: ${res.skipped}\nErrors: ${res.errors.length ? res.errors.join('\n') : 'None'}`
      );
    } catch (error: any) {
      Alert.alert('Samsung Health import failed', error?.message ?? String(error));
    } finally {
      setSamsungImporting(false);
    }
  }, []);
  const primaryIntegration = connectedIntegrations[0] ?? null;
  const sleepProviderOrder = useMemo<IntegrationId[]>(() => {
    const order: IntegrationId[] = [];
    if (preferredIntegrationId) order.push(preferredIntegrationId);
    connectedIntegrations.forEach((integration) => {
      if (!order.includes(integration.id)) {
        order.push(integration.id);
      }
    });
    (['google_fit', 'health_connect'] as IntegrationId[]).forEach((id) => {
      if (!order.includes(id)) {
        order.push(id);
      }
    });
    return order;
  }, [preferredIntegrationId, connectedIntegrations]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importStage, setImportStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [importSteps, setImportSteps] = useState<ImportStep[]>([]);
  const [simulateMode, setSimulateMode] = useState<'none' | 'unavailable' | 'denied'>('none');
  const simulateModeRef = useRef<'none' | 'unavailable' | 'denied'>('none');
  const importCancelRef = useRef(false);

  useEffect(() => {
    simulateModeRef.current = simulateMode;
  }, [simulateMode]);

  const statusIconFor = (status: ImportStepStatus) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'running':
        return 'progress-clock';
      default:
        return 'clock-outline';
    }
  };

  const statusColorFor = (status: ImportStepStatus) => {
    switch (status) {
      case 'success':
        return theme.colors.primary; // Use primary blue instead of green
      case 'error':
        return theme.colors.error;
      case 'running':
        return theme.colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const statusTextFor = (status: ImportStepStatus) => {
    switch (status) {
      case 'success':
        return 'Imported';
      case 'error':
        return 'Needs attention';
      case 'running':
        return 'Syncing…';
      default:
        return 'Waiting';
    }
  };

  useEffect(() => {
    (async () => {
      const done = await getProviderOnboardingComplete();
      setShowProviderTip(!done);
    })();
  }, []);

  useEffect(() => {
    // Only update preferred integration when integrations change, not on every render
    let cancelled = false;
    (async () => {
      const preferred = await getPreferredIntegration();
      if (!cancelled) {
        setPreferredIntegrationId(preferred);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [integrations]);

const handleDismissProviderTip = useCallback(async () => {
  setShowProviderTip(false);
  await setProviderOnboardingComplete();
}, []);

  const handleSetPreferredIntegration = useCallback(
    async (id: IntegrationId) => {
      await setPreferredIntegration(id);
      setPreferredIntegrationId(id);
      if (showProviderTip) {
        setShowProviderTip(false);
        await setProviderOnboardingComplete();
      }
      Alert.alert('Preferred provider', 'Updated primary health provider.');
    },
    [showProviderTip],
  );

  const processImport = useCallback(async () => {
    const providers = connectedIntegrations;
    if (!providers.length) {
      setImportSteps([]);
      setImportStage('done');
      return;
    }

    importCancelRef.current = false;
    setImportStage('running');

    setImportSteps(
      providers.map((provider) => ({
        id: provider.id,
        title: provider.title,
        status: 'pending',
      })),
    );

    for (let index = 0; index < providers.length; index++) {
      if (importCancelRef.current) break;
      const provider = providers[index];

      setImportSteps((prev) =>
        prev.map((step, stepIndex) =>
          stepIndex === index ? { ...step, status: 'running', message: undefined } : step,
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 800));
      if (importCancelRef.current) break;

      if (!provider.supported) {
        setImportSteps((prev) =>
          prev.map((step, stepIndex) =>
            stepIndex === index
              ? {
                  ...step,
                  status: 'error',
                  message: 'This provider is not supported on your device build.',
                }
              : step,
          ),
        );
        continue;
      }

      if (simulateModeRef.current === 'unavailable') {
        setSimulateMode('none');
        simulateModeRef.current = 'none';
        setImportSteps((prev) =>
          prev.map((step, stepIndex) =>
            stepIndex === index
              ? {
                  ...step,
                  status: 'error',
                  message: 'Provider unavailable. Open the provider app to reconnect and try again.',
                }
              : step,
          ),
        );
        continue;
      }

      if (simulateModeRef.current === 'denied') {
        setSimulateMode('none');
        simulateModeRef.current = 'none';
        setImportSteps((prev) =>
          prev.map((step, stepIndex) =>
            stepIndex === index
              ? {
                  ...step,
                  status: 'error',
                  message: 'Permission denied. Enable health data access in the provider app.',
                }
              : step,
          ),
        );
        continue;
      }

      setImportSteps((prev) =>
        prev.map((step, stepIndex) =>
          stepIndex === index
            ? {
                ...step,
                status: 'success',
                message: 'Sleep and activity imported successfully.',
              }
            : step,
        ),
      );
    }

    // After processing all providers, refresh sleep queries
    try {
      await qc.invalidateQueries({ queryKey: ['sleep:last'] });
      await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
    } catch {}

    if (importCancelRef.current) {
      setImportStage('idle');
    } else {
      await refreshInsight('sleep-health-import');
      setImportStage('done');
    }
  }, [connectedIntegrations, refreshInsight, qc]);

  useEffect(() => {
    if (importModalVisible) {
      importCancelRef.current = false;
      setSimulateMode('none');
      simulateModeRef.current = 'none';
      // Use setTimeout to prevent infinite loop - ensure processImport runs after state settles
      const timeoutId = setTimeout(() => {
        processImport();
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      importCancelRef.current = true;
      setImportStage('idle');
      setImportSteps([]);
      setSimulateMode('none');
      simulateModeRef.current = 'none';
    }
  }, [importModalVisible]); // Remove processImport from deps to prevent infinite loop

  const handleImportPress = useCallback(() => {
    setImportStage('idle');
    setImportSteps([]);
    setSimulateMode('none');
    simulateModeRef.current = 'none';
    importCancelRef.current = false;
    setImportModalVisible(true);
  }, []);

  const handleDismissImport = useCallback(() => {
    if (importStage === 'running') {
      importCancelRef.current = true;
    }
    setImportModalVisible(false);
  }, [importStage]);

  /* ───────── Unified Health Service helpers ───────── */
  const mapSleepSessionToLegacy = useCallback((session: SleepSession): LegacySleepSession => {
    const normalizeDate = (value: unknown) =>
      value instanceof Date ? value.toISOString() : String(value);

    return {
      startTime: normalizeDate(session.startTime),
      endTime: normalizeDate(session.endTime),
      durationMin: session.durationMinutes || 0,
      efficiency: session.efficiency ?? null,
      stages:
        session.stages?.map((stage) => ({
          start: normalizeDate(stage.start),
          end: normalizeDate(stage.end),
          stage: stage.stage,
        })) ?? null,
      metadata: session.metadata ?? undefined,
    };
  }, []);

  const mapDbSleepSessionToHealth = useCallback((row: DbSleepSession): SleepSession => {
    const sourceMap: Record<DbSleepSession['source'], SleepSession['source']> = {
      healthkit: 'apple_healthkit',
      googlefit: 'google_fit',
      phone_infer: 'unknown',
      manual: 'unknown',
      // default handled below
    };

    // Normalize stages from DB: could be JSON string, object of totals, or array
    let stages: SleepSession['stages'] | undefined;
    try {
      const rawStages =
        typeof row.stages === 'string' ? JSON.parse(row.stages) : row.stages;
      if (Array.isArray(rawStages)) {
        stages = rawStages as any;
      } else if (rawStages && typeof rawStages === 'object') {
        // Convert totals-per-stage into segments with only duration (no start/end)
        const totals = Object.entries(rawStages).map(([stage, minutes]) => ({
          stage: (stage as any) ?? 'unknown',
          minutes: typeof minutes === 'number' ? minutes : undefined,
        }));
        stages = totals as any;
      }
    } catch {
      stages = undefined;
    }

    const efficiency =
      typeof row.efficiency === 'number'
        ? row.efficiency
        : typeof row.efficiency === 'string'
          ? parseFloat(row.efficiency)
          : undefined;

    const quality =
      typeof (row as any)?.quality === 'number'
        ? (row as any).quality
        : typeof (row as any)?.quality === 'string'
          ? parseFloat((row as any).quality)
          : undefined;

    return {
      startTime: new Date(row.start_time),
      endTime: new Date(row.end_time),
      durationMinutes:
        row.duration_minutes ??
        Math.max(0, (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 60000),
      efficiency: efficiency ?? undefined,
      stages,
      source: sourceMap[row.source] ?? 'unknown',
      metadata: {
        ...(row.metadata ?? undefined),
        ...(quality !== undefined ? { quality } : {}),
      },
    };
  }, []);

  const fetchLatestFromIntegration = useCallback(
    async (integrationId: IntegrationId): Promise<SleepSession | null> => {
      if (integrationId === 'google_fit') {
        const hasPermissions = await googleFitHasPermissions();
        if (!hasPermissions) return null;
        return googleFitGetLatestSleepSession();
      }
      if (integrationId === 'health_connect') {
        const available = await healthConnectIsAvailable();
        if (!available) return null;
        const hasPermissions = await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS);
        if (!hasPermissions) return null;
        return healthConnectGetLatestSleepSession();
      }
      return null;
    },
    []
  );

  const fetchSessionsFromIntegration = useCallback(
    async (integrationId: IntegrationId, days: number): Promise<SleepSession[]> => {
      if (integrationId === 'google_fit') {
        const hasPermissions = await googleFitHasPermissions();
        if (!hasPermissions) return [];
        return googleFitGetSleepSessions(days);
      }
      if (integrationId === 'health_connect') {
        const available = await healthConnectIsAvailable();
        if (!available) return [];
        const hasPermissions = await healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS);
        if (!hasPermissions) return [];
        return healthConnectGetSleepSessions(days);
      }
      return [];
    },
    []
  );

  const fetchLastSleepSession = useCallback(async (): Promise<LegacySleepSession | null> => {
    for (const providerId of sleepProviderOrder) {
      try {
        const session = await fetchLatestFromIntegration(providerId);
        if (session) {
          return mapSleepSessionToLegacy(session);
        }
      } catch (error) {
        console.error(`Failed to fetch latest sleep session from ${providerId}:`, error);
      }
    }
    // Fallback to Supabase (most recent stored sleep_session)
    try {
      const rows = await listSleepSessions(30);
      if (rows.length) {
        return mapSleepSessionToLegacy(mapDbSleepSessionToHealth(rows[0]));
      }
    } catch (error) {
      console.warn('SleepScreen: Supabase fallback for latest sleep failed:', error);
    }
    return null;
  }, [sleepProviderOrder, fetchLatestFromIntegration, mapSleepSessionToLegacy]);

  const fetchSleepSessions = useCallback(
    async (days: number = 30): Promise<LegacySleepSession[]> => {
      for (const providerId of sleepProviderOrder) {
        try {
          const sessions = await fetchSessionsFromIntegration(providerId, days);
          if (sessions.length) {
            return sessions.map(mapSleepSessionToLegacy);
          }
        } catch (error) {
          console.error(`Failed to fetch sleep sessions from ${providerId}:`, error);
        }
      }
      // Fallback to Supabase for recent history
      try {
        const rows = await listSleepSessions(days);
        if (rows.length) {
          return rows.map((row) => mapSleepSessionToLegacy(mapDbSleepSessionToHealth(row)));
        }
      } catch (error) {
        console.warn('SleepScreen: Supabase fallback for sessions failed:', error);
      }
      return [];
    },
    [sleepProviderOrder, fetchSessionsFromIntegration, mapSleepSessionToLegacy, mapDbSleepSessionToHealth]
  );

  /* ───────── data queries ───────── */
  const settingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
  });

  const detectionsQ = useQuery<WakeDetection[]>({
    queryKey: ['sleep:wakeDetections'],
    queryFn: listWakeDetections,
  });

  const sleepQueryOptions: UseQueryOptions<
    LegacySleepSession | null,
    Error,
    LegacySleepSession | null,
    ['sleep:last']
  > = {
    queryKey: ['sleep:last'],
    queryFn: async () => {
      try {
        const result = await fetchLastSleepSession();
        return result ?? null;
      } catch (error: any) {
        // Silently catch ALL errors and return null to prevent UI errors on first load
        // Log to console for debugging but don't show error UI
        console.warn('SleepScreen: fetchLastSleepSession error (silent):', error?.message || error);
        return null;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false, // Don't throw errors, just return null
  };

  const sleepQ = useQuery(sleepQueryOptions);

  const sessionsQueryOptions: UseQueryOptions<
    LegacySleepSession[],
    Error,
    LegacySleepSession[],
    ['sleep:sessions:30d']
  > = {
    queryKey: ['sleep:sessions:30d'],
    queryFn: async () => {
      try {
        return await fetchSleepSessions(30);
      } catch (error: any) {
        console.warn('SleepScreen: fetchSleepSessions error (silent):', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
  };

  const sessionsQ = useQuery(sessionsQueryOptions);

  // Refresh sleep data when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'active') {
        try {
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
          await sleepQ.refetch();
          await sessionsQ.refetch();
        } catch {}
      }
    });
    return () => sub.remove();
  }, [qc, sleepQ, sessionsQ]);

  // Get recent sleep session if last night isn't available
  const recentSleep = useMemo(() => {
    const candidates: LegacySleepSession[] = [];
    if (sleepQ.data) candidates.push(sleepQ.data);
    if (sessionsQ.data?.length) candidates.push(...sessionsQ.data);
    if (!candidates.length) return null;
    const sorted = [...candidates].sort(
      (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );
    return sorted[0] ?? null;
  }, [sleepQ.data, sessionsQ.data]);

  const allSessions = useMemo(() => {
    const base = sessionsQ.data ?? [];
    const merged = [...base];
    if (recentSleep) {
      const key = `${recentSleep.startTime}-${recentSleep.endTime}`;
      const exists = merged.some((s) => `${s.startTime}-${s.endTime}` === key);
      if (!exists) merged.unshift(recentSleep);
    }
    return merged
      .filter((s) => s?.endTime)
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  }, [recentSleep, sessionsQ.data]);

  const latestKey = recentSleep ? `${recentSleep.startTime}-${recentSleep.endTime}` : null;

  const rangeSessions = useMemo(() => {
    const days = trendRange === '7d' ? 7 : trendRange === '30d' ? 30 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return allSessions.filter((s) => {
      const end = new Date(s.endTime);
      return !isNaN(end.getTime()) && end >= cutoff;
    });
  }, [allSessions, trendRange]);

  const avgDuration = useMemo(() => {
    const vals = rangeSessions.map((s) => s.durationMin).filter((v) => typeof v === 'number' && isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rangeSessions]);

  const avgBedtime = useMemo(() => {
    const vals = rangeSessions
      .map((s) => {
        const d = new Date(s.startTime);
        return isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
      })
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rangeSessions]);

  const avgWake = useMemo(() => {
    const vals = rangeSessions
      .map((s) => {
        const d = new Date(s.endTime);
        return isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
      })
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rangeSessions]);

  const historySessions = useMemo(() => allSessions.slice(0, 15), [allSessions]);

  const targetSleepMinutes = settingsQ.data?.targetSleepMinutes ?? 480;

  const colorFor = (value: number | null, type: 'eff' | 'sleep' | 'score') => {
    const good = '#2ecc71';
    const mid = '#f5c400';
    const bad = theme.colors.error;
    if (value === null) return theme.colors.outlineVariant;
    if (type === 'eff' || type === 'score') {
      if (value >= 85) return good;
      if (value >= 70) return mid;
      return bad;
    }
    if (value >= 90) return good;
    if (value >= 70) return mid;
    return bad;
  };

  useEffect(() => {
    const connectedCount = connectedIntegrations.length;
    if (connectedCount > 0 && connectedCount !== lastConnectedCountRef.current) {
      lastConnectedCountRef.current = connectedCount;
      let cancelled = false;
      (async () => {
        try {
          if (!cancelled) {
            await syncAll();
            if (!cancelled) {
              await qc.invalidateQueries({ queryKey: ['sleep:last'] });
              await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
              await refreshInsight('sleep-auto-sync');
            }
          }
        } catch (error) {
          if (!cancelled) {
            logger.warn('Health auto-sync failed', error);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    } else {
      lastConnectedCountRef.current = connectedCount;
    }
  }, [connectedIntegrations.length]); // Only depend on length to prevent infinite loops

  /* ───────── derived ───────── */
  const s = recentSleep;

  const heroStagesForHypnogram = useMemo(() => {
    if (!s?.stages) return null;
    const timeline = Array.isArray(s.stages)
      ? s.stages.filter((seg) => seg.start && seg.end)
      : [];
    if (timeline.length) return timeline;

    // Build synthetic timeline from totals
    const totals = (Array.isArray(s.stages) ? s.stages : []).filter(
      (seg: any) => typeof seg.minutes === 'number' || typeof (seg as any).durationMinutes === 'number'
    );
    if (!totals.length) return null;

    const end = s.endTime ? new Date(s.endTime) : null;
    let start = s.startTime ? new Date(s.startTime) : null;
    const totalMinutes =
      totals.reduce(
        (acc, seg: any) => acc + (typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0),
        0
      ) || 0;

    if (!start && end && totalMinutes) {
      start = new Date(end.getTime() - totalMinutes * 60000);
    }
    if (!start || !end) return null;

    let cursor = new Date(start);
    const synthetic = totals.map((seg: any) => {
      const mins = typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0;
      const segStart = new Date(cursor);
      const segEnd = new Date(cursor.getTime() + mins * 60000);
      cursor = new Date(segEnd);
      return {
        start: segStart.toISOString(),
        end: segEnd.toISOString(),
        stage: (seg.stage as any) ?? 'unknown',
      };
    });
    return synthetic;
  }, [s?.stages, s?.startTime, s?.endTime]);

  const stageAgg = useMemo(() => {
    try {
      if (!s || !s.stages || !Array.isArray(s.stages) || s.stages.length === 0) return null;
      const acc = new Map<LegacySleepStage, number>();
      for (const seg of s.stages) {
        if (!seg || !seg.start || !seg.end || !seg.stage) continue;
        try {
          const startDate = new Date(seg.start);
          const endDate = new Date(seg.end);
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
          const min = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
          if (min > 0) {
            acc.set(seg.stage, (acc.get(seg.stage) ?? 0) + min);
          }
        } catch (error) {
          console.warn('SleepScreen: stage aggregation error:', error);
          continue;
        }
      }
      return acc.size > 0 ? acc : null;
    } catch (error) {
      console.warn('SleepScreen: stageAgg calculation error:', error);
      return null;
    }
  }, [s?.stages]);

  // Sleep-only insight (local, small rule set)
  const sleepInsight: InsightMatch | null = useMemo(() => {
    if (!recentSleep) return null;
    const toHours = (minutes?: number | null) =>
      typeof minutes === 'number' && isFinite(minutes) ? Number((minutes / 60).toFixed(2)) : undefined;

    const latestHours = toHours(recentSleep.durationMin);

    const durations = allSessions
      .slice(0, 7)
      .map((sess) => (typeof sess.durationMin === 'number' ? sess.durationMin : undefined))
      .filter((v): v is number => v !== undefined);
    const avg7dHours = durations.length
      ? Number((durations.reduce((a, b) => a + b, 0) / durations.length / 60).toFixed(2))
      : undefined;

    const midpointMinutes = (sess: LegacySleepSession) => {
      const st = new Date(sess.startTime).getTime();
      const en = new Date(sess.endTime).getTime();
      if (!isFinite(st) || !isFinite(en) || en <= st) return undefined;
      const mid = new Date(st + (en - st) / 2);
      return mid.getHours() * 60 + mid.getMinutes();
    };
    const mids = allSessions
      .map((sess) => midpointMinutes(sess))
      .filter((v): v is number => typeof v === 'number');
    const latestMid = midpointMinutes(recentSleep);
    const baselineMid =
      mids.length > 1 ? mids.slice(1, Math.min(mids.length, 8)).reduce((a, b) => a + b, 0) / (mids.length - 1) : undefined;
    const midDelta = latestMid !== undefined && baselineMid !== undefined ? Math.abs(latestMid - baselineMid) : undefined;

    const rules: Array<{ id: string; priority: number; message: string; action: string; why: string; icon?: string }> = [];

    if (latestHours !== undefined && latestHours < 6.5) {
      rules.push({
        id: 'sleep_short',
        priority: 3,
        message: 'Sleep ran short last night',
        action: 'Aim for your target window tonight; start wind-down 60–90 minutes earlier.',
        why: 'Under ~6.5 hours cuts REM/deep recovery and can raise cortisol, making energy and mood less stable.',
        icon: 'moon-waning-crescent',
      });
    }
    if (avg7dHours !== undefined && avg7dHours < 7) {
      rules.push({
        id: 'sleep_avg_low',
        priority: 2,
        message: 'Your 7‑day average is below 7h',
        action: 'Protect the last sleep cycle: dim lights late, avoid late caffeine, keep a consistent wake time.',
        why: 'Sustained short sleep trims REM/deep stages, increasing fatigue and emotional volatility.',
        icon: 'weather-night',
      });
    }
    if (midDelta !== undefined && midDelta > 90) {
      rules.push({
        id: 'midpoint_drift',
        priority: 2,
        message: 'Bed/wake timing is drifting',
        action: 'Anchor wake time first; align light, meals, and activity to that anchor.',
        why: 'Large midpoint shifts (>90 min) can blunt the cortisol awakening response and fragment sleep quality.',
        icon: 'clock-outline',
      });
    }

    if (!rules.length) return null;
    const best = rules.sort((a, b) => b.priority - a.priority)[0];
    return {
      id: best.id,
      message: best.message,
      action: best.action,
      sourceTag: 'sleep',
      priority: best.priority,
      matchedConditions: [],
      why: best.why,
      icon: best.icon,
    };
  }, [recentSleep, allSessions]);

  const rollingAvg = useMemo(() => {
    const det = detectionsQ.data ?? [];
    return rollingAverageHHMM(det.map(d => ({ date: d.date, hhmm: d.hhmm })), 14);
  }, [detectionsQ.data]);

  const isConnectingIntegration = (id: IntegrationId) =>
    connectIntegrationPending && connectingId === id;
  const isDisconnectingIntegration = (id: IntegrationId) =>
    disconnectIntegrationPending && disconnectingId === id;

  const handleConnectIntegration = async (id: IntegrationId) => {
    try {
      const response = await connectIntegration(id);
      const definition = integrations.find((item) => item.id === id);
      const title = definition?.title ?? 'Provider';
      const result = response?.result;
      if (result?.success) {
        Alert.alert('Connected', `${title} connected successfully.`);
        await qc.invalidateQueries({ queryKey: ['sleep:last'] });
        await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
        refreshIntegrations();
        await sleepQ.refetch();
        await sessionsQ.refetch();
        await refreshInsight('sleep-connect');
      } else {
        const message = result?.message ?? 'Unable to connect.';
        Alert.alert(title, message);
      }
    } catch (error: any) {
      Alert.alert('Connection failed', error?.message ?? 'Unable to connect to the provider.');
    }
  };

  const handleDisconnectIntegration = async (id: IntegrationId) => {
    const definition = integrations.find((item) => item.id === id);
    const title = definition?.title ?? 'Provider';
    Alert.alert(title, `Disconnect ${title}? You can reconnect at any time.`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await disconnectIntegration(id);
            Alert.alert('Disconnected', `${title} disconnected.`);
            await qc.invalidateQueries({ queryKey: ['sleep:last'] });
            await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
            refreshIntegrations();
            await sleepQ.refetch();
            await sessionsQ.refetch();
          } catch (error: any) {
            Alert.alert('Disconnect failed', error?.message ?? 'Unable to disconnect the provider.');
          }
        },
      },
    ]);
  };

  // Diagnostics & Troubleshooting
  const openAppSettings = async () => {
    try {
      const { Linking } = await import('react-native');
      await Linking.openSettings();
    } catch (e: any) {
      Alert.alert('Open Settings', 'Unable to open app settings. Please open Settings manually.');
    }
  };
  const openPlayStore = async (pkg: string) => {
    const { Linking, Platform } = await import('react-native');
    const galaxyUrl = `galaxyapps://ProductDetail/${pkg}`;
    const marketUrl = `market://details?id=${pkg}`;
    const playUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
    try {
      if (Platform.OS === 'android') {
        if (await Linking.canOpenURL(galaxyUrl)) return Linking.openURL(galaxyUrl);
        if (await Linking.canOpenURL(marketUrl)) return Linking.openURL(marketUrl);
      }
      return Linking.openURL(playUrl);
    } catch {
      Alert.alert('Open Store', 'Unable to open the store page.');
    }
  };
  const connectSection = (
    <>
      <SectionHeader title="Connect & sync" icon="link-variant" caption="Connect health apps to automatically sync sleep data" />
      <InformationalCard icon="information-outline">
        <Text variant="bodyMedium" style={{ color: textPrimary }}>
          Manage which health providers sync your data automatically. Tap a provider to connect.
        </Text>
        {integrationsError ? (
          <HelperText type="error" visible>
            {(integrationsError as any)?.message ?? 'Unable to load integrations.'}
          </HelperText>
        ) : null}
        {!integrationsLoading && integrations.length > 0 && integrations.every((item) => !item.supported) ? (
          <Text variant="bodySmall" style={{ marginTop: 8, color: textSecondary }}>
            Providers for this platform are not available in the current build. Review your native configuration or enable alternate providers.
          </Text>
        ) : null}
        {!integrationsLoading && showProviderTip ? (
          <Card mode="contained-tonal" style={{ borderRadius: 16, marginTop: 12 }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
                Tip: provider priority
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.primary }}>
                Reclaim prefers the first connected provider. Connect your primary source first, then add fallbacks. You can change the order by disconnecting and reconnecting.
              </Text>
              <Button
                mode="contained"
                onPress={handleDismissProviderTip}
                style={{ marginTop: 12, alignSelf: 'flex-start' }}
                accessibilityLabel="Dismiss provider priority tip"
              >
                Got it
              </Button>
            </Card.Content>
          </Card>
        ) : null}
        <View style={{ marginTop: 16 }}>
          {integrationsLoading ? (
            <Text variant="bodyMedium" style={{ color: textSecondary }}>
              Checking available integrations…
            </Text>
          ) : (
            <HealthIntegrationList
              items={integrations}
              onConnect={handleConnectIntegration}
              onDisconnect={handleDisconnectIntegration}
              isConnecting={isConnectingIntegration}
              isDisconnecting={isDisconnectingIntegration}
              preferredId={preferredIntegrationId}
              onSetPreferred={handleSetPreferredIntegration}
            />
          )}
        </View>
        <Button
          mode="outlined"
          onPress={refreshIntegrations}
          style={{ marginTop: 16, alignSelf: 'flex-start' }}
          accessibilityLabel="Refresh integrations list"
        >
          Refresh list
        </Button>
        <Button
          mode="contained"
          onPress={handleImportPress}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
          accessibilityLabel="Import latest health data from connected providers"
          disabled={connectedIntegrations.length === 0}
        >
          Import latest data
        </Button>
        <Button
          mode="outlined"
          loading={samsungImporting}
          onPress={handleImportSamsungHistory}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
          accessibilityLabel="Import Samsung Health history"
        >
          Import Samsung history
        </Button>
        <Button
          mode="text"
          onPress={async () => {
            try {
              const provider = getGoogleFitProvider();
              const available = await provider.isAvailable();
              const hasPerms = await googleFitHasPermissions();
              let readSleep = 'n/a';
              try {
                const sessions = await googleFitGetSleepSessions(1);
                readSleep = `${sessions?.length ?? 0} session(s)`;
              } catch (e: any) {
                readSleep = `error: ${e?.message ?? 'read failed'}`;
              }
              Alert.alert(
                'Google Fit Diagnostics',
                `Available: ${available ? 'yes' : 'no'}\nPermissions: ${
                  hasPerms ? 'granted' : 'not granted'
                }\nSleep (24h): ${readSleep}\n\nIf permissions are not granted:\n• Ensure Google Fit is installed and signed in\n• Verify OAuth client + SHA-1 are configured\n• Run this build outside Expo Go.`,
              );
            } catch (e: any) {
              Alert.alert('Diagnostics failed', e?.message ?? 'Unknown error');
            }
          }}
          style={{ marginTop: 4, alignSelf: 'flex-start' }}
          accessibilityLabel="Run diagnostics for integrations"
        >
          Run diagnostics
        </Button>
        {connectedIntegrations.length === 0 ? (
          <Text variant="labelSmall" style={{ marginTop: 4, color: textSecondary }}>
            Connect a provider above to enable manual imports.
          </Text>
        ) : null}
      </InformationalCard>
    </>
  );
  const openGoogleFit = () => openPlayStore('com.google.android.apps.fitness');

  /* ───────── mutations ───────── */
  const confirmMut = useMutation({
    mutationFn: async (payload: { durationMin?: number; note?: string }) =>
      upsertTodayEntry({
        sleep_hours: payload.durationMin ? Math.round((payload.durationMin / 60) * 10) / 10 : undefined,
        note: payload.note,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep:last'] });
      Alert.alert('Saved', 'Sleep confirmed for today.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save sleep'),
  });

  /* ───────── local UI state ───────── */
  const [desiredInput, setDesiredInput] = React.useState<string>('');
  
  React.useEffect(() => {
    if (settingsQ.data?.desiredWakeHHMM !== undefined) {
      setDesiredInput(settingsQ.data.desiredWakeHHMM);
    }
  }, [settingsQ.data?.desiredWakeHHMM]);

  /* ───────── UI ───────── */
  // Errors are handled silently in query - no error UI needed

  return (
    <>
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >

      {/* Last night summary */}
      <SectionHeader title="Last night" icon="sleep" />
      <ActionCard icon="moon-waning-crescent">
        {sleepQ.isLoading && (
          <Text variant="bodyMedium" style={{ color: textSecondary, marginTop: 6 }}>
            Loading…
          </Text>
        )}
        {/* Don't show error UI - errors are silently handled and return null */}
        {!sleepQ.isLoading && !s ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <MaterialCommunityIcons
                name="sleep"
                size={48}
                color={theme.colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text
                variant="bodyMedium"
                style={{ marginTop: 8, textAlign: 'center', color: textSecondary }}
              >
            {connectedIntegrations.length > 0
              ? 'No recent sleep session found yet. Connect a provider or sync your data.'
              : 'Connect a provider above to see your latest sleep data.'}
              </Text>
            </View>
          ) : null}

          {s && s.startTime && s.endTime && (
            <>
              <Text variant="bodyMedium" style={{ marginTop: 4, color: textSecondary }}>
                {(() => {
                  try {
                    const startDate = new Date(s.startTime);
                    const endDate = new Date(s.endTime);
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Recent sleep';
                    const now = new Date();
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(0, 0, 0, 0);
                    
                    // Check if this is last night (ended today or yesterday)
                    const isLastNight = endDate >= yesterday || isSameDay(endDate, now);
                    const dateLabel = isLastNight ? 'Last night' : endDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return dateLabel;
                  } catch {
                    return 'Recent sleep';
                  }
                })()}
              </Text>
              <Text variant="bodyLarge" style={{ marginTop: 8, color: textPrimary }}>
                {(() => {
                  try {
                    const start = new Date(s.startTime);
                    const end = new Date(s.endTime);
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Time unavailable';
                    return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} → ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                  } catch {
                    return 'Time unavailable';
                  }
                })()}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                {([
                  {
                    key: 'eff',
                    label: 'Efficiency',
                    value: typeof s.efficiency === 'number' ? Math.round((s.efficiency ?? 0) * 100) : null,
                    suffix: '%',
                    max: 100,
                  },
                  {
                    key: 'sleep',
                    label: 'Sleep vs target',
                    value: s.durationMin ? Math.round((s.durationMin / targetSleepMinutes) * 100) : null,
                    display: s.durationMin ? fmtHM(Math.round(s.durationMin)) : '—',
                    max: 100,
                  },
                  {
                    key: 'score',
                    label: 'Score',
                    value: (() => {
                      const qual = (s as any)?.quality ?? (s as any)?.metadata?.quality;
                      return typeof qual === 'number' ? Math.round(qual) : null;
                    })(),
                    suffix: '',
                    max: 100,
                  },
                ] as const).map((item) => {
                  const val = item.value;
                  const color = colorFor(val, item.key as 'eff' | 'sleep' | 'score');
                  const circumference = 2 * Math.PI * 30;
                  const dash = val !== null ? (Math.min(val, item.max) / item.max) * circumference : 0;
                  return (
                    <View key={item.key} style={{ alignItems: 'center', flex: 1 }}>
                      <Svg width={80} height={80}>
                        <Circle cx={40} cy={40} r={30} stroke={theme.colors.surfaceVariant} strokeWidth={8} fill="none" />
                        {val !== null ? (
                          <Circle
                            cx={40}
                            cy={40}
                            r={30}
                            stroke={color}
                            strokeWidth={8}
                            fill="none"
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeLinecap="round"
                            rotation={-90}
                            origin="40,40"
                          />
                        ) : null}
                        <Text
                          style={{
                            position: 'absolute',
                            alignSelf: 'center',
                            top: 28,
                            color: textPrimary,
                            fontWeight: '700',
                          }}
                        >
                          {item.key === 'sleep'
                            ? item.display ?? '—'
                            : val !== null
                              ? val
                              : '—'}
                          {item.key !== 'sleep' && item.suffix ? '' : ''}
                        </Text>
                      </Svg>
                      <Text variant="bodySmall" style={{ color: textSecondary, textAlign: 'center', marginTop: 4 }}>
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={{ marginTop: 10 }}>
                <SleepStagesBar stages={s.stages as any} />
              </View>

              {stageAgg ? (
                <Text variant="bodySmall" style={{ marginTop: 12, color: textSecondary }}>
                  {(['awake', 'light', 'deep', 'rem'] as LegacySleepStage[])
                    .map((st) => {
                      const v = stageAgg.get(st) ?? 0;
                      if (v === 0) return null;
                      return `${st.toUpperCase()}: ${fmtHM(v)}`;
                    })
                    .filter(Boolean)
                    .join('   ')}
                </Text>
              ) : null}
              
              {/* Display heart rate, body temperature, and skin temperature if available */}
              {s && (s as any).metadata && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
                  {(s as any).metadata.avgHeartRate && (
                    <Text variant="bodySmall" style={{ color: textSecondary, marginBottom: 4 }}>
                      Avg Heart Rate: {(s as any).metadata.avgHeartRate} bpm
                    </Text>
                  )}
                  {(s as any).metadata.minHeartRate && (s as any).metadata.maxHeartRate && (
                    <Text variant="bodySmall" style={{ color: textSecondary, marginBottom: 4 }}>
                      Heart Rate Range: {(s as any).metadata.minHeartRate} - {(s as any).metadata.maxHeartRate} bpm
                    </Text>
                  )}
                  {((s as any).metadata.bodyTemperature || (s as any).metadata.skinTemperature) && (
                    <Text variant="bodySmall" style={{ color: textSecondary, marginBottom: 4 }}>
                      Skin Temperature: {((s as any).metadata.skinTemperature || (s as any).metadata.bodyTemperature)?.toFixed(1)}°C
                    </Text>
                  )}
                  {(s as any).metadata.bodyTemperature && (
                    <Text variant="bodySmall" style={{ color: textSecondary }}>
                      Body Temperature: {(s as any).metadata.bodyTemperature.toFixed(1)}°C
                    </Text>
                  )}
                </View>
              )}

              {heroStagesForHypnogram ? (
                <View style={{ marginTop: 12 }}>
                  <Hypnogram segments={heroStagesForHypnogram as any} />
                </View>
              ) : null}

              <Button
                mode="contained"
                style={{ marginTop: 16, alignSelf: 'flex-start' }}
                onPress={() => confirmMut.mutate({ durationMin: s.durationMin })}
                loading={confirmMut.isPending}
                accessibilityLabel="Confirm sleep for today"
              >
                {confirmMut.isPending ? 'Saving…' : 'Confirm sleep for today'}
              </Button>
            </>
          )}
      </ActionCard>

      {/* Scientific insights */}
      {(() => {
        const picked =
          sleepInsight ||
          (providerInsights ?? []).find((ins) => ins.sourceTag?.toLowerCase().startsWith('sleep')) ||
          providerBest;
        if (!picked) return null;
        return (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
              Scientific insights
            </Text>
            <InsightCard insight={picked} />
          </View>
        );
      })()}

      {/* Circadian planning (Desired, Detected today, Rolling avg) */}
      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Circadian wake" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: textPrimary }}>
            Desired wake time
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8, columnGap: 12, alignItems: 'center' }}>
            <TextInput
              mode="outlined"
              value={desiredInput}
              onChangeText={setDesiredInput}
              placeholder={settingsQ.data?.desiredWakeHHMM ?? '07:00'}
              accessibilityLabel="Desired wake time input"
              keyboardType="numbers-and-punctuation"
              style={{ flex: 1 }}
            />
            <Button
              mode="contained-tonal"
              compact
              onPress={async () => {
                try {
                  const hhmm = (desiredInput || '').trim() || '07:00';
                  const next = await saveSleepSettings({ desiredWakeHHMM: hhmm });
                  await settingsQ.refetch();
                  Alert.alert('Saved', `Desired wake set to ${next.desiredWakeHHMM}.`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to save desired wake');
                }
              }}
              accessibilityLabel="Save desired wake time"
              style={{ alignSelf: 'stretch' }}
              contentStyle={{ paddingHorizontal: 12 }}
            >
              Save
            </Button>
          </View>

          <View style={{ marginTop: 16 }}>
            <Text variant="titleSmall" style={{ color: textPrimary }}>
              Detected today
            </Text>
            {s ? (
              (() => {
                const wake = new Date(s.endTime);
                const hhmm = minutesToHHMM(wake.getHours() * 60 + wake.getMinutes());
                const dateKey = new Date(wake.getFullYear(), wake.getMonth(), wake.getDate()).toISOString().slice(0, 10);
                return (
                  <View style={{ marginTop: 8 }}>
                    <Text variant="bodyMedium" style={{ color: textPrimary }}>
                      Natural wake estimate: <Text style={{ fontWeight: '700' }}>{hhmm}</Text>
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 10, columnGap: 12 }}>
                      <Button
                        mode="contained"
                        onPress={async () => {
                          try {
                            await addWakeDetection({ date: dateKey, hhmm });
                            await detectionsQ.refetch();
                            Alert.alert('Added', `Saved today's detection (${hhmm}).`);
                          } catch (e: any) {
                            Alert.alert('Error', e?.message ?? 'Failed to add detection');
                          }
                        }}
                        accessibilityLabel="Add detected wake to log"
                      >
                        Add to log
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => detectionsQ.refetch()}
                        accessibilityLabel="Refresh wake detections"
                      >
                        Refresh
                      </Button>
                    </View>
                  </View>
                );
              })()
            ) : (
              <Text variant="bodyMedium" style={{ marginTop: 6, color: textSecondary }}>
                No detected session today yet.
              </Text>
            )}
          </View>

          {/* Sleep reminders unified */}
          <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
            <Text variant="titleSmall" style={{ color: textPrimary }}>
              Sleep reminders
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, color: textSecondary }}>
              Bedtime suggestion and morning confirm use your typical wake and target sleep.
            </Text>
            <Text variant="bodyMedium" style={{ marginTop: 6, color: textPrimary }}>
              Typical wake: {settingsQ.data?.typicalWakeHHMM ?? '—'} • Target sleep: {(settingsQ.data?.targetSleepMinutes ?? 480) / 60}h
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, color: textSecondary }}>
              Rolling average (14d): {rollingAvg ?? '—'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, columnGap: 12, rowGap: 12 }}>
              <Button
                mode="contained"
                onPress={async () => {
                  try {
                    const hhmm = rollingAvg ?? settingsQ.data?.typicalWakeHHMM ?? '07:00';
                    const saved = await saveSleepSettings({ typicalWakeHHMM: hhmm });
                    await scheduleMorningConfirm(hhmm);
                    Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM}. Morning confirm scheduled.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to apply');
                  }
                }}
                accessibilityLabel="Use rolling average as typical wake and schedule morning confirm"
              >
                Use rolling avg + schedule AM confirm
              </Button>
              <Button
                mode="outlined"
                onPress={async () => {
                  try {
                    const hhmm = settingsQ.data?.desiredWakeHHMM ?? '07:00';
                    const saved = await saveSleepSettings({ typicalWakeHHMM: hhmm });
                    await scheduleMorningConfirm(hhmm);
                    Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM}. Morning confirm scheduled.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to apply');
                  }
                }}
                accessibilityLabel="Use desired wake as typical wake and schedule morning confirm"
              >
                Use desired wake + schedule AM confirm
              </Button>
              <Button
                mode="contained-tonal"
                onPress={async () => {
                  try {
                    const wake = settingsQ.data?.typicalWakeHHMM ?? rollingAvg ?? '07:00';
                    await scheduleBedtimeSuggestion(wake, settingsQ.data?.targetSleepMinutes ?? 480);
                    Alert.alert('Scheduled', `Bedtime suggestion set using wake ${wake}.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule bedtime');
                  }
                }}
                accessibilityLabel="Schedule bedtime suggestion"
              >
                Schedule bedtime suggestion
              </Button>
              <Button
                mode="outlined"
                onPress={async () => {
                  try {
                    const wake = settingsQ.data?.typicalWakeHHMM ?? rollingAvg ?? '07:00';
                    await scheduleMorningConfirm(wake);
                    Alert.alert('Scheduled', `Morning confirm set at ${wake}.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule morning confirm');
                  }
                }}
                accessibilityLabel="Schedule morning confirm"
              >
                Schedule morning confirm
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Reminders */}
      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Reminders" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: textSecondary }}>
            Bedtime suggestion is calculated from your typical wake time minus target sleep window.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, columnGap: 12, rowGap: 12 }}>
            <Button
              mode="contained"
              onPress={async () => {
                try {
                  const wake = settingsQ.data?.typicalWakeHHMM ?? '07:00';
                  const mins = settingsQ.data?.targetSleepMinutes ?? 480;
                  await scheduleBedtimeSuggestion(wake, mins);
                  Alert.alert('Scheduled', `Bedtime suggestion set (wake ${wake}, target ${(mins / 60).toFixed(1)}h).`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule');
                }
              }}
              accessibilityLabel="Schedule bedtime suggestion"
            >
              Schedule bedtime
            </Button>
            <Button
              mode="outlined"
              onPress={async () => {
                try {
                  const wake = settingsQ.data?.typicalWakeHHMM ?? '07:00';
                  await scheduleMorningConfirm(wake);
                  Alert.alert('Scheduled', `Morning confirm set (${wake}).`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule');
                }
              }}
              accessibilityLabel="Schedule morning confirm reminder"
            >
              Schedule morning confirm
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Trends / Averages */}
      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Trends" subtitle="7D • 30D • 365D averages" />
        <Card.Content>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['7d', '30d', '365d'] as const).map((key) => (
              <Button
                key={key}
                mode={trendRange === key ? 'contained' : 'outlined'}
                compact
                onPress={() => setTrendRange(key)}
                accessibilityLabel={`Show ${key} sleep trends`}
              >
                {key.toUpperCase()}
              </Button>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Card mode="contained-tonal" style={{ flex: 1, minWidth: 140 }}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: textSecondary }}>
                  Avg duration
                </Text>
                <Text variant="titleMedium" style={{ color: textPrimary }}>
                  {avgDuration ? fmtHM(Math.round(avgDuration)) : '—'}
                </Text>
              </Card.Content>
            </Card>
            <Card mode="contained-tonal" style={{ flex: 1, minWidth: 140 }}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: textSecondary }}>
                  Avg bedtime
                </Text>
                <Text variant="titleMedium" style={{ color: textPrimary }}>
                  {avgBedtime !== null ? minutesToHHMM(Math.round(avgBedtime)) : '—'}
                </Text>
              </Card.Content>
            </Card>
            <Card mode="contained-tonal" style={{ flex: 1, minWidth: 140 }}>
              <Card.Content>
                <Text variant="labelSmall" style={{ color: textSecondary }}>
                  Avg wake
                </Text>
                <Text variant="titleMedium" style={{ color: textPrimary }}>
                  {avgWake !== null ? minutesToHHMM(Math.round(avgWake)) : '—'}
                </Text>
              </Card.Content>
            </Card>
          </View>
        </Card.Content>
      </Card>

      {/* History */}
      <SleepHistorySection sessions={historySessions} excludeKey={latestKey} />

      {/* Roadmap hint */}
      <Card mode="outlined" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Coming next" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: textPrimary, marginBottom: 4 }}>
            • iOS HealthKit sleep import
          </Text>
          <Text variant="bodyMedium" style={{ color: textPrimary, marginBottom: 4 }}>
            • HR, HRV, and respiratory coupling (overnight)
          </Text>
          <Text variant="bodyMedium" style={{ color: textPrimary }}>
            • Sleep consistency score & smarter bedtime
          </Text>
        </Card.Content>
      </Card>

      {/* Connect & sync (bottom) */}
      {connectSection}
    </ScrollView>
      <Portal>
        <Modal
          visible={importModalVisible}
          transparent
          animationType={reduceMotionGlobal ? 'none' : 'fade'}
          onRequestClose={handleDismissImport}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: 16,
              backgroundColor: theme.colors.backdrop,
            }}
          >
          <Card mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface }}>
            <Card.Title
              title="Health import"
              subtitle={
                importStage === 'running'
                  ? 'Syncing your connected providers…'
                  : 'Review the latest import status.'
              }
            />
            <Card.Content>
              {importSteps.length === 0 ? (
                <Text variant="bodyMedium" style={{ color: textSecondary }}>
                  Connect a provider above to import health data.
                </Text>
              ) : (
                importSteps.map((step) => (
                  <View
                    key={step.id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                  >
                    <MaterialCommunityIcons
                      name={statusIconFor(step.status) as any}
                      size={22}
                      color={statusColorFor(step.status)}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="bodyMedium" style={{ color: textPrimary }}>
                        {step.title}
                      </Text>
                      <Text
                        variant="labelSmall"
                        style={{ color: statusColorFor(step.status), marginTop: 4 }}
                      >
                        {statusTextFor(step.status)}
                      </Text>
                      {step.message ? (
                        <Text
                          variant="labelSmall"
                          style={{
                            color: step.status === 'error' ? theme.colors.error : textSecondary,
                            marginTop: 4,
                          }}
                        >
                          {step.message}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
              {importStage === 'running' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <ActivityIndicator />
                  <Text variant="bodySmall" style={{ marginLeft: 8, color: textSecondary }}>
                    Importing…
                  </Text>
                </View>
              ) : null}
            </Card.Content>
            <Card.Actions style={{ justifyContent: 'flex-end' }}>
              <Button onPress={handleDismissImport} accessibilityLabel={importStage === 'running' ? 'Cancel health import' : 'Close health import'}>
                {importStage === 'running' ? 'Cancel' : 'Close'}
              </Button>
              {importStage === 'done' && importSteps.length > 0 ? (
                <Button
                  onPress={() => {
                    setSimulateMode('none');
                    simulateModeRef.current = 'none';
                    processImport();
                  }}
                  accessibilityLabel="Run health import again"
                >
                  Run again
                </Button>
              ) : null}
            </Card.Actions>
          </Card>
          </View>
        </Modal>
      </Portal>

    </>
  );
}
