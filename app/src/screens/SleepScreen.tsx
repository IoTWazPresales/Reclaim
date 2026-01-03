import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ScrollView, View, Modal, AppState, AppStateStatus, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput, useTheme, Portal, ActivityIndicator } from 'react-native-paper';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { HeroWell } from '@/components/hero/HeroWell';
import { useFocusEffect } from '@react-navigation/native';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
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
import { importSamsungHistory, syncAll } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import {
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';

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
import { pickInsightForScreen, InsightScope } from '@/lib/insights/pickInsightForScreen';
import { SleepStagesBar } from './sleep/SleepStagesBar';
import { SleepHistorySection } from './sleep/SleepHistorySection';
import { InsightCard } from '@/components/InsightCard';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import Svg, { Circle } from 'react-native-svg';
import { safeNavigate } from '@/navigation/nav';

/* ───────── Safe date helpers (FIX) ───────── */
function safeDate(input: any): Date | null {
  if (!input) return null;

  const d =
    input instanceof Date
      ? input
      : typeof input === 'number'
        ? new Date(input)
        : typeof input === 'string'
          ? new Date(input)
          : null;

  if (!d) return null;

  const t = d.getTime();
  if (!Number.isFinite(t)) return null;

  // JS Date valid range ~ ±8.64e15 ms.
  if (t > 8.64e15 || t < -8.64e15) return null;

  return d;
}

function safeISO(input: any): string | null {
  const d = safeDate(input);
  if (!d) return null;
  try {
    return d.toISOString();
  } catch {
    return null;
  }
}

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
          if (seen.has(value)) return '[Circular]';
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

/* ✅ NEW: robust "last night" selection helpers
   lastNight window = yesterday 12:00 -> today 12:00.
   This avoids "today nap" stealing the hero. */
function lastNightWindow(base = new Date()) {
  const end = new Date(base);
  end.setHours(12, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 1);

  return { start, end };
}

function isInLastNightWindowByEnd(endDate: Date, base = new Date()) {
  const { start, end } = lastNightWindow(base);
  return endDate.getTime() >= start.getTime() && endDate.getTime() < end.getTime();
}

function pickLastNightSession(
  sessions: LegacySleepSession[],
  base = new Date(),
): LegacySleepSession | null {
  const candidates = (sessions ?? [])
    .map((s) => {
      const st = safeDate(s?.startTime);
      const en = safeDate(s?.endTime);
      if (!st || !en) return null;

      const dur =
        typeof s.durationMin === 'number' && Number.isFinite(s.durationMin) && s.durationMin > 0
          ? s.durationMin
          : Math.max(0, (en.getTime() - st.getTime()) / 60000);

      return { s, st, en, dur };
    })
    .filter(Boolean) as Array<{ s: LegacySleepSession; st: Date; en: Date; dur: number }>;

  if (!candidates.length) return null;

  const inWindow = candidates.filter((c) => isInLastNightWindowByEnd(c.en, base));

  // ✅ If we have last-night candidates, pick the "main sleep"
  if (inWindow.length) {
    const mainSleepPool = inWindow.filter((c) => c.dur >= 120);
    const pool = mainSleepPool.length ? mainSleepPool : inWindow;

    pool.sort((a, b) => {
      if (b.dur !== a.dur) return b.dur - a.dur;      // longer first (main sleep)
      return b.en.getTime() - a.en.getTime();         // more recent end wins ties
    });

    return pool[0]?.s ?? null;
  }

  // ✅ Otherwise, pick the MOST RECENT session by endTime (not the longest)
  candidates.sort((a, b) => b.en.getTime() - a.en.getTime());
  return candidates[0]?.s ?? null;
}
/** Tiny hypnogram using plain Views */
function Hypnogram({ segments }: { segments: LegacySleepStageSegment[] }) {
  const theme = useTheme();
  const textColor = theme.colors.onSurfaceVariant;
  const bandBackground = theme.colors.surface;
  const STAGE_COLORS: Record<string, string> = {
    awake: '#f4b400',
    light: '#64b5f6',
    deep: '#1e88e5',
    rem: '#ab47bc',
    unknown: theme.colors.secondary,
  };

  const withAlpha = (color: string, alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha));
    const hex = color.replace('#', '').trim();
    const full =
      hex.length === 3
        ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
        : hex.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return color;
    return `rgba(${r},${g},${b},${a})`;
  };

  // FIX: sanitize segments up-front so no Date/ISO operations can crash render
  const safeSegments = useMemo(() => {
    return (segments ?? [])
      .map((seg, idx) => {
        const st = safeDate(seg?.start);
        const en = safeDate(seg?.end);
        if (!st || !en || en.getTime() <= st.getTime()) {
          console.warn('[SleepScreen] Dropping bad hypnogram segment', { idx, seg });
          return null;
        }
        return {
          ...seg,
          __st: st,
          __en: en,
        };
      })
      .filter(Boolean) as Array<LegacySleepStageSegment & { __st: Date; __en: Date }>;
  }, [segments]);

  if (!safeSegments.length) return null;

  const start = safeSegments[0].__st.getTime();
  const end = safeSegments[safeSegments.length - 1].__en.getTime();
  const total = Math.max(1, end - start);

  const stageLevel = (s: LegacySleepStage) => {
    switch (s) {
      case 'awake': return 0;
      case 'light': return 1;
      case 'rem': return 1.5;
      case 'deep': return 2;
      default: return 1;
    }
  };

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ opacity: 0.8, marginBottom: 6, color: textColor }}>Hypnogram</Text>
      <View
        style={{
          height: 50,
          backgroundColor: bandBackground,
          borderRadius: 10,
          overflow: 'hidden',
          position: 'relative',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {safeSegments.map((seg, i) => {
          // FIX: use precomputed safe Dates
          const segLen = seg.__en.getTime() - seg.__st.getTime();
          const w = Math.max(2, Math.round((segLen / total) * 300));
          const leftPct = ((seg.__st.getTime() - start) / total) * 100;
          const y = stageLevel(seg.stage);
          const isLast = i === safeSegments.length - 1;
          return (
            <View
              key={`sleep-segment-${i}-${seg.stage}`}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,
                width: w,
                height: 6,
                borderRadius: 6,
                backgroundColor: withAlpha(STAGE_COLORS[seg.stage] ?? theme.colors.secondary, 0.72),
                opacity: seg.stage === 'awake' ? 0.32 : 1,
                borderRightWidth: isLast ? 0 : 1,
                borderRightColor: 'rgba(255,255,255,0.10)',
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
  const borderColor = theme.colors.outlineVariant;
  const background = theme.colors.background;
  const primaryColor = theme.colors.primary;
  const onPrimary = theme.colors.onPrimary;
  const errorColor = theme.colors.error;
  const accentColor = theme.colors.secondary;
  const qc = useQueryClient();

  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const topInsight = rankedInsights?.[0];
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;
  const insightError = insightsCtx.error;

  const reduceMotionGlobal = useReducedMotion();
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
      if (!order.includes(integration.id)) order.push(integration.id);
    });
    (['google_fit', 'health_connect'] as IntegrationId[]).forEach((id) => {
      if (!order.includes(id)) order.push(id);
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
      case 'success': return 'check-circle';
      case 'error': return 'alert-circle';
      case 'running': return 'progress-clock';
      default: return 'clock-outline';
    }
  };

  const statusColorFor = (status: ImportStepStatus) => {
    switch (status) {
      case 'success': return theme.colors.primary;
      case 'error': return theme.colors.error;
      case 'running': return theme.colors.primary;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const statusTextFor = (status: ImportStepStatus) => {
    switch (status) {
      case 'success': return 'Imported';
      case 'error': return 'Needs attention';
      case 'running': return 'Syncing…';
      default: return 'Waiting';
    }
  };

  useEffect(() => {
    (async () => {
      const done = await getProviderOnboardingComplete();
      setShowProviderTip(!done);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferred = await getPreferredIntegration();
      if (!cancelled) setPreferredIntegrationId(preferred);
    })();
    return () => { cancelled = true; };
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
              ? { ...step, status: 'error', message: 'This provider is not supported on your device build.' }
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
              ? { ...step, status: 'error', message: 'Provider unavailable. Open the provider app to reconnect and try again.' }
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
              ? { ...step, status: 'error', message: 'Permission denied. Enable health data access in the provider app.' }
              : step,
          ),
        );
        continue;
      }

      setImportSteps((prev) =>
        prev.map((step, stepIndex) =>
          stepIndex === index
            ? { ...step, status: 'success', message: 'Sleep and activity imported successfully.' }
            : step,
        ),
      );
    }

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
      const timeoutId = setTimeout(() => { processImport(); }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      importCancelRef.current = true;
      setImportStage('idle');
      setImportSteps([]);
      setSimulateMode('none');
      simulateModeRef.current = 'none';
    }
  }, [importModalVisible]); // intentionally omit processImport

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

  // FIX: never call toISOString on an invalid Date
  const mapSleepSessionToLegacy = useCallback((session: SleepSession): LegacySleepSession => {
    const normalizeDate = (value: unknown) => {
      const iso = safeISO(value);
      if (iso) return iso;
      // fall back to string (but avoid throwing)
      return typeof value === 'string' ? value : String(value ?? '');
    };

    return {
      startTime: normalizeDate(session.startTime),
      endTime: normalizeDate(session.endTime),
      durationMin: session.durationMinutes || 0,
      efficiency: session.efficiency ?? null,
      stages:
        session.stages?.map((stage) => ({
          start: normalizeDate((stage as any).start),
          end: normalizeDate((stage as any).end),
          stage: (stage as any).stage,
        })) ?? null,
      metadata: session.metadata ?? undefined,
    };
  }, []);

  // FIX: avoid invalid Date math + duration calc on bad DB timestamps
  const mapDbSleepSessionToHealth = useCallback((row: DbSleepSession): SleepSession => {
    const sourceMap: Record<DbSleepSession['source'], SleepSession['source']> = {
      healthkit: 'apple_healthkit',
      googlefit: 'google_fit',
      healthconnect: 'health_connect',
      samsung_health: 'samsung_health',
      phone_infer: 'unknown',
      manual: 'unknown',
    };

    let stages: SleepSession['stages'] | undefined;
    try {
      const rawStages = typeof row.stages === 'string' ? JSON.parse(row.stages) : row.stages;
      if (Array.isArray(rawStages)) {
        stages = rawStages as any;
      } else if (rawStages && typeof rawStages === 'object') {
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

    const st = safeDate(row.start_time) ?? new Date(NaN);
    const en = safeDate(row.end_time) ?? new Date(NaN);

    const computedDuration =
      safeDate(row.start_time) && safeDate(row.end_time)
        ? Math.max(0, (en.getTime() - st.getTime()) / 60000)
        : 0;

    return {
      startTime: st,
      endTime: en,
      durationMinutes: row.duration_minutes ?? computedDuration,
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
        if (session) return mapSleepSessionToLegacy(session);
      } catch (error) {
        console.error(`Failed to fetch latest sleep session from ${providerId}:`, error);
      }
    }
    try {
      const rows = await listSleepSessions(30);
      if (rows.length) return mapSleepSessionToLegacy(mapDbSleepSessionToHealth(rows[0]));
    } catch (error) {
      console.warn('SleepScreen: Supabase fallback for latest sleep failed:', error);
    }
    return null;
  }, [sleepProviderOrder, fetchLatestFromIntegration, mapSleepSessionToLegacy, mapDbSleepSessionToHealth]);

  const fetchSleepSessions = useCallback(
    async (days: number = 30): Promise<LegacySleepSession[]> => {
      try {
        const rows = await listSleepSessions(days);
        if (rows.length) {
          return rows.map((row) => mapSleepSessionToLegacy(mapDbSleepSessionToHealth(row)));
        }
      } catch (error) {
        console.warn('SleepScreen: Supabase fallback for sessions failed:', error);
      }

      for (const providerId of sleepProviderOrder) {
        try {
          const sessions = await fetchSessionsFromIntegration(providerId, days);
          if (sessions.length) return sessions.map(mapSleepSessionToLegacy);
        } catch (error) {
          console.error(`Failed to fetch sleep sessions from ${providerId}:`, error);
        }
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
        console.warn('SleepScreen: fetchLastSleepSession error (silent):', error?.message || error);
        return null;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false,
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

  // ✅ FIX: pick "last night's main sleep" first, not "latest endTime"
  const recentSleep = useMemo(() => {
    const candidates: LegacySleepSession[] = [];
    if (sleepQ.data) candidates.push(sleepQ.data);
    if (sessionsQ.data?.length) candidates.push(...sessionsQ.data);
    if (!candidates.length) return null;

    const picked = pickLastNightSession(candidates, new Date());
    if (picked) return picked;

    // fallback: most recent by endTime
    const sorted = [...candidates].sort((a, b) => {
      const ad = safeDate(a?.endTime)?.getTime() ?? -Infinity;
      const bd = safeDate(b?.endTime)?.getTime() ?? -Infinity;
      return bd - ad;
    });
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
    // FIX: sort using safeDate; filter invalid endTime safely
    return merged
      .filter((s) => !!safeDate(s?.endTime))
      .sort((a, b) => (safeDate(b.endTime)?.getTime() ?? -Infinity) - (safeDate(a.endTime)?.getTime() ?? -Infinity));
  }, [recentSleep, sessionsQ.data]);

  const latestKey = recentSleep ? `${recentSleep.startTime}-${recentSleep.endTime}` : null;

  const rangeSessions = useMemo(() => {
    const days = trendRange === '7d' ? 7 : trendRange === '30d' ? 30 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return allSessions.filter((s) => {
      const end = safeDate(s.endTime);
      return !!end && end >= cutoff;
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
        const d = safeDate(s.startTime);
        return !d ? null : d.getHours() * 60 + d.getMinutes();
      })
      .filter((v): v is number => v !== null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [rangeSessions]);

  const avgWake = useMemo(() => {
    const vals = rangeSessions
      .map((s) => {
        const d = safeDate(s.endTime);
        return !d ? null : d.getHours() * 60 + d.getMinutes();
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
          if (!cancelled) logger.warn('Health auto-sync failed', error);
        }
      })();
      return () => { cancelled = true; };
    } else {
      lastConnectedCountRef.current = connectedCount;
    }
  }, [connectedIntegrations.length]); // Only depend on length

  /* ───────── derived ───────── */
  const s = recentSleep;

  // FIX: build hypnogram segments safely; never call toISOString on invalid/out-of-range Dates
  const heroStagesForHypnogram = useMemo(() => {
    if (!s?.stages) return null;

    // If stages already contain timeline segments with start/end strings, sanitize them
    const timeline = Array.isArray(s.stages)
      ? (s.stages as any[]).filter((seg) => seg?.start && seg?.end)
      : [];

    if (timeline.length) {
      const cleaned = timeline
        .map((seg, idx) => {
          const st = safeDate(seg.start);
          const en = safeDate(seg.end);
          if (!st || !en || en.getTime() <= st.getTime()) {
            console.warn('[SleepScreen] Dropping bad stage timeline segment', { idx, seg });
            return null;
          }
          return {
            start: safeISO(st)!, // safe due to st valid
            end: safeISO(en)!,
            stage: (seg.stage as any) ?? 'unknown',
          } as LegacySleepStageSegment;
        })
        .filter(Boolean) as LegacySleepStageSegment[];
      return cleaned.length ? cleaned : null;
    }

    // Build synthetic timeline from totals-per-stage (minutes)
    const totals = (Array.isArray(s.stages) ? (s.stages as any[]) : []).filter(
      (seg: any) => typeof seg.minutes === 'number' || typeof seg.durationMinutes === 'number'
    );
    if (!totals.length) return null;

    const end = safeDate(s.endTime);
    let start = safeDate(s.startTime);

    const totalMinutes =
      totals.reduce((acc, seg: any) => acc + (typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0), 0) || 0;

    if (!start && end && totalMinutes) {
      start = safeDate(end.getTime() - totalMinutes * 60000);
    }
    if (!start || !end) return null;

    let cursorMs = start.getTime();
    const synthetic: LegacySleepStageSegment[] = [];

    for (let i = 0; i < totals.length; i++) {
      const seg = totals[i];
      const mins = typeof seg.minutes === 'number' ? seg.minutes : seg.durationMinutes || 0;
      if (!Number.isFinite(mins) || mins <= 0) continue;

      const segStart = safeDate(cursorMs);
      const segEnd = safeDate(cursorMs + mins * 60000);

      if (!segStart || !segEnd || segEnd.getTime() <= segStart.getTime()) {
        console.warn('[SleepScreen] Dropping synthetic segment (bad computed date)', { i, seg });
        continue;
      }

      const startISO = safeISO(segStart);
      const endISO = safeISO(segEnd);
      if (!startISO || !endISO) {
        console.warn('[SleepScreen] Dropping synthetic segment (bad ISO)', { i, seg });
        continue;
      }

      synthetic.push({
        start: startISO,
        end: endISO,
        stage: (seg.stage as any) ?? 'unknown',
      });

      cursorMs = segEnd.getTime();
    }

    return synthetic.length ? synthetic : null;
  }, [s?.stages, s?.startTime, s?.endTime]);

  const stageAgg = useMemo(() => {
    try {
      if (!s || !s.stages || !Array.isArray(s.stages) || s.stages.length === 0) return null;
      const acc = new Map<LegacySleepStage, number>();
      for (const seg of s.stages as any[]) {
        if (!seg || !seg.start || !seg.end || !seg.stage) continue;
        const startDate = safeDate(seg.start);
        const endDate = safeDate(seg.end);
        if (!startDate || !endDate) continue;
        const min = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
        if (min > 0) acc.set(seg.stage, (acc.get(seg.stage) ?? 0) + min);
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
      const st = safeDate(sess.startTime)?.getTime();
      const en = safeDate(sess.endTime)?.getTime();
      if (!Number.isFinite(st) || !Number.isFinite(en) || (en as number) <= (st as number)) return undefined;
      const mid = new Date((st as number) + ((en as number) - (st as number)) / 2);
      return mid.getHours() * 60 + mid.getMinutes();
    };

    const mids = allSessions.map(midpointMinutes).filter((v): v is number => typeof v === 'number');
    const latestMid = midpointMinutes(recentSleep);

    const baselineMid =
      mids.length > 1
        ? mids.slice(1, Math.min(mids.length, 8)).reduce((a, b) => a + b, 0) / (mids.length - 1)
        : undefined;

    const midDelta =
      latestMid !== undefined && baselineMid !== undefined ? Math.abs(latestMid - baselineMid) : undefined;

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
        message: 'Your 7-day average is below 7h',
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
      { text: 'Cancel', style: 'cancel' },
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
      <InformationalCard icon="information-outline">
        <FeatureCardHeader
          icon="link-variant"
          title="Connect & sync"
          subtitle="Manage health connections in Integrations"
        />
        <Text variant="bodyMedium" style={{ color: textPrimary }}>
          Connect your health provider in the Integrations screen. Health Connect is recommended on Android.
        </Text>

        {integrationsError ? (
          <HelperText type="error" visible>
            {(integrationsError as any)?.message ?? 'Unable to load integrations.'}
          </HelperText>
        ) : null}

        <Text variant="bodySmall" style={{ marginTop: 10, color: textSecondary }}>
          {connectedIntegrations.length
            ? `Connected: ${connectedIntegrations.map((p) => p.title).join(', ')}${
                preferredIntegrationId ? ` • Preferred: ${preferredIntegrationId}` : ''
              }`
            : 'No provider connected yet.'}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
          <Button
            mode="contained"
            onPress={() => safeNavigate('App', { screen: 'Integrations' })}
            accessibilityLabel="Open Integrations"
          >
            Open Integrations
          </Button>
          <Button
            mode="outlined"
            onPress={refreshIntegrations}
            accessibilityLabel="Refresh integration status"
          >
            Refresh status
          </Button>
        </View>
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

  const sleepScreenInsight = useMemo(() => {
    const candidates = rankedInsights?.length ? rankedInsights : topInsight ? [topInsight] : [];
    return pickInsightForScreen(candidates, {
      preferredScopes: ['sleep', 'global'] as InsightScope[],
      allowGlobalFallback: true,
      allowCooldown: true,
    });
  }, [rankedInsights, topInsight]);

  const resolvedInsight = useMemo(() => {
    return sleepInsight ?? sleepScreenInsight;
  }, [sleepInsight, sleepScreenInsight]);

  const sectionSpacing = 16;
  const cardRadius = 16;
  const cardSurface = theme.colors.surface;

  // Hero micro-motion (calm entrance): run on focus only (not on state updates)
  const heroOpacity = useRef(new Animated.Value(reduceMotionGlobal ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(reduceMotionGlobal ? 0 : 8)).current;
  const heroFocusOpacity = useRef(new Animated.Value(reduceMotionGlobal ? 1 : 0)).current;
  const heroFocusTranslateY = useRef(new Animated.Value(reduceMotionGlobal ? 0 : 8)).current;

  useFocusEffect(
    useCallback(() => {
      if (reduceMotionGlobal) {
        heroOpacity.setValue(1);
        heroTranslateY.setValue(0);
        heroFocusOpacity.setValue(1);
        heroFocusTranslateY.setValue(0);
        return;
      }

      heroOpacity.setValue(0);
      heroTranslateY.setValue(8);
      heroFocusOpacity.setValue(0);
      heroFocusTranslateY.setValue(8);

      const ease = Easing.out(Easing.cubic);
      const duration = 200;
      const staggerMs = 70;

      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration,
          easing: ease,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(staggerMs),
          Animated.parallel([
            Animated.timing(heroFocusOpacity, {
              toValue: 1,
              duration,
              easing: ease,
              useNativeDriver: true,
            }),
            Animated.timing(heroFocusTranslateY, {
              toValue: 0,
              duration,
              easing: ease,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    }, [reduceMotionGlobal, heroOpacity, heroTranslateY, heroFocusOpacity, heroFocusTranslateY]),
  );

  /* ───────── UI ───────── */
  return (
    <>
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
      >
        {/* Last night summary */}
        <View style={{ marginBottom: sectionSpacing }}>
          <ActionCard>
            <FeatureCardHeader icon="sleep" title="Last night" />
            {sleepQ.isLoading && (
              <Text variant="bodyMedium" style={{ color: textSecondary, marginTop: 6 }}>
                Loading…
              </Text>
            )}

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
                    ? 'No recent sleep session found yet. Connect a provider in Integrations or sync your data.'
                    : 'Connect a provider in Integrations to see your latest sleep data.'}
                </Text>
              </View>
            ) : null}

            {s && s.startTime && s.endTime && (
              <>
                <Text variant="bodyMedium" style={{ marginTop: 4, color: textSecondary }}>
                  {(() => {
                    try {
                      const startDate = safeDate(s.startTime);
                      const endDate = safeDate(s.endTime);
                      if (!startDate || !endDate) return 'Recent sleep';

                      const now = new Date();

                      // ✅ FIX: only label "Last night" if endTime falls inside lastNight window
                      const isLastNight = isInLastNightWindowByEnd(endDate, now);

                      const dateLabel = isLastNight
                      ? 'Last night'
                      : `Most recent • ${endDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
                      return dateLabel;
                    } catch {
                      return 'Recent sleep';
                    }
                  })()}
                </Text>

                <Text variant="bodyLarge" style={{ marginTop: 8, color: textPrimary }}>
                  {(() => {
                    try {
                      const start = safeDate(s.startTime);
                      const end = safeDate(s.endTime);
                      if (!start || !end) return 'Time unavailable';
                      return `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} → ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                    } catch {
                      return 'Time unavailable';
                    }
                  })()}
                </Text>

                {(() => {
                  const withAlpha = (color: string, alpha: number) => {
                    const a = Math.max(0, Math.min(1, alpha));
                    if (!color || typeof color !== 'string') return color as any;
                    const hex = color.startsWith('#') ? color.slice(1) : color;
                    const full =
                      hex.length === 3
                        ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
                        : hex.slice(0, 6);
                    const r = parseInt(full.slice(0, 2), 16);
                    const g = parseInt(full.slice(2, 4), 16);
                    const b = parseInt(full.slice(4, 6), 16);
                    if ([r, g, b].some((v) => Number.isNaN(v))) return color;
                    return `rgba(${r},${g},${b},${a})`;
                  };

                  const ringTrack = withAlpha(theme.colors.onSurface, 0.12);

                  return (
                    <View>
                      <HeroWell kind="meter" style={{ marginTop: 12 }} contentStyle={{}}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
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
                                  <Circle cx={40} cy={40} r={30} stroke={ringTrack} strokeWidth={8} fill="none" />
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
                                  </Text>
                                </Svg>
                                <Text variant="bodySmall" style={{ color: textSecondary, textAlign: 'center', marginTop: 4 }}>
                                  {item.label}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </HeroWell>
                    </View>
                  );
                })()}

                <View style={{ marginTop: 10 }}>
                  <SleepStagesBar stages={s.stages as any} variant="hero" />
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
                        Skin Temperature: {((s as any).metadata.skinTemperature || (s as any).metadata.bodyTemperature)?.toFixed?.(1)}°C
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
                  <Hypnogram segments={heroStagesForHypnogram as any} />
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
        </View>

        {/* Scientific insights */}
        <View style={{ marginBottom: sectionSpacing }}>
          {insightsEnabled ? (
            <>
              {insightStatus === 'loading' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      Gathering insight…
                    </Text>
                  </Card.Content>
                </Card>
              ) : null}

              {insightStatus === 'error' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                      {insightError ?? "We couldn't refresh insights right now."}
                    </Text>
                    <Button
                      mode="text"
                      compact
                      onPress={() => { refreshInsight('sleep-retry').catch(() => {}); }}
                    >
                      Try again
                    </Button>
                  </Card.Content>
                </Card>
              ) : null}

              {resolvedInsight && insightStatus === 'ready' ? (
                <InsightCard
                  insight={resolvedInsight}
                  onRefreshPress={() => { refreshInsight('sleep-manual').catch(() => {}); }}
                />
              ) : insightStatus === 'ready' ? (
                <InformationalCard>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    No new insight right now.
                  </Text>
                </InformationalCard>
              ) : null}
            </>
          ) : (
            <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Scientific insights are turned off.
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                  You can enable them in Settings to see personalized sleep nudges here.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Circadian planning */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <FeatureCardHeader icon="clock-outline" title="Circadian wake" />
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
                    const wake = safeDate(s.endTime);
                    if (!wake) {
                      return (
                        <Text variant="bodyMedium" style={{ marginTop: 6, color: textSecondary }}>
                          Wake time unavailable (bad date).
                        </Text>
                      );
                    }

                    const hhmm = minutesToHHMM(wake.getHours() * 60 + wake.getMinutes());

                    // FIX: avoid toISOString() on invalid date
                    const dateKey = safeISO(new Date(wake.getFullYear(), wake.getMonth(), wake.getDate()))?.slice(0, 10) ?? '';

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
                                if (!dateKey) throw new Error('Invalid dateKey for wake detection');
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
        </View>

        {/* Reminders */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <FeatureCardHeader icon="bell-ring-outline" title="Reminders" />
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
                      Alert.alert('Error', e?.message ?? 'Failed to schedule morning confirm');
                    }
                  }}
                  accessibilityLabel="Schedule morning confirm reminder"
                >
                  Schedule morning confirm
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Trends / Averages */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <FeatureCardHeader icon="chart-line" title="Trends" subtitle="7D • 30D • 365D averages" />
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
        </View>

        <View style={{ marginBottom: sectionSpacing }}>
          <SleepHistorySection
            sessions={historySessions}
            excludeKey={latestKey}
          />
        </View>

        {/* Roadmap hint */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <FeatureCardHeader icon="road-variant" title="Coming next" />
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
        </View>

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
            <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
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
                    Connect a provider in Integrations to import health data.
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
                <Button
                  onPress={handleDismissImport}
                  accessibilityLabel={importStage === 'running' ? 'Cancel health import' : 'Close health import'}
                >
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
