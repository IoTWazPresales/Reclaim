import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Alert, ScrollView, View, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, HelperText, Text, TextInput, useTheme, Portal, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import {
  getUnifiedHealthService,
} from '@/lib/health';
import { syncAll } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import type { IntegrationId } from '@/lib/health/integrationStore';
import { getPreferredIntegration, setPreferredIntegration } from '@/lib/health/integrationStore';

// Legacy types for compatibility
import type {
  SleepSession as LegacySleepSession,
  SleepStage,
} from '@/lib/sleepHealthConnect';

import { useNotifications, scheduleBedtimeSuggestion, scheduleMorningConfirm } from '@/hooks/useNotifications';
import { upsertTodayEntry } from '@/lib/api';

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

/** Tiny hypnogram using plain Views */
function Hypnogram({ segments }: { segments: { start: string; end: string; stage: SleepStage }[] }) {
  const theme = useTheme();
  const textColor = theme.colors.onSurface;
  const bandColor = theme.colors.secondary;
  const bandBackground = theme.colors.surfaceVariant;

  if (!segments.length) return null;
  const start = +new Date(segments[0].start);
  const end = +new Date(segments[segments.length - 1].end);
  const total = Math.max(1, end - start);

  const stageLevel = (s: SleepStage) => {
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
              key={i}
              style={{
                position: 'absolute',
                left: `${leftPct}%`,
                bottom: y * 12,      // lower is deeper
                width: w,
                height: 6,
                borderRadius: 3,
                backgroundColor: bandColor,
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
  const { refresh: refreshInsight } = useScientificInsights();
  const reduceMotionGlobal = useReducedMotion();
  const [hasError, setHasError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [showProviderTip, setShowProviderTip] = useState(false);
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);
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
  const primaryIntegration = connectedIntegrations[0] ?? null;
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
        return '#16a34a';
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
    (async () => {
      const preferred = await getPreferredIntegration();
      setPreferredIntegrationId(preferred);
    })();
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

    if (importCancelRef.current) {
      setImportStage('idle');
    } else {
      await refreshInsight('sleep-health-import');
      setImportStage('done');
    }
  }, [connectedIntegrations, refreshInsight]);

  useEffect(() => {
    if (importModalVisible) {
      importCancelRef.current = false;
      setSimulateMode('none');
      simulateModeRef.current = 'none';
      processImport();
    } else {
      importCancelRef.current = true;
      setImportStage('idle');
      setImportSteps([]);
      setSimulateMode('none');
      simulateModeRef.current = 'none';
    }
  }, [importModalVisible, processImport]);

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
  async function fetchLastSleepSession(): Promise<LegacySleepSession | null> {
    try {
      const healthService = getUnifiedHealthService();
      
      if (!healthService) {
        console.warn('Health service not available');
        return null;
      }
      
      // Check if permissions are granted before trying to fetch
      try {
        const hasPermissions = await healthService.hasAllPermissions();
        if (!hasPermissions) {
          // Permissions not granted, return null (UI will show message)
          return null;
        }
      } catch (permError) {
        console.warn('Permission check failed:', permError);
        return null;
      }
      
      const session = await healthService.getLatestSleepSession();
      
      if (!session) return null;
      
      // Convert unified format to legacy format
      return {
        startTime: session.startTime instanceof Date ? session.startTime.toISOString() : String(session.startTime),
        endTime: session.endTime instanceof Date ? session.endTime.toISOString() : String(session.endTime),
        durationMin: session.durationMinutes || 0,
        efficiency: session.efficiency ?? null,
        stages: (session.stages || [])?.map((s) => ({
          start: s.start instanceof Date ? s.start.toISOString() : String(s.start),
          end: s.end instanceof Date ? s.end.toISOString() : String(s.end),
          stage: s.stage,
        })) ?? null,
      };
    } catch (error: any) {
      console.error('Failed to fetch sleep session:', error);
      // Don't throw - return null so UI can show a message
      return null;
    }
  }

  async function fetchSleepSessions(days: number = 30): Promise<LegacySleepSession[]> {
    try {
      const healthService = getUnifiedHealthService();
      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Note: getLatestSleepSession only returns one session
      // For multiple sessions, we'd need to extend the unified service
      // For now, return array with latest session if available
      const latest = await healthService.getLatestSleepSession();
      
      if (!latest) return [];
      
      return [{
        startTime: latest.startTime.toISOString(),
        endTime: latest.endTime.toISOString(),
        durationMin: latest.durationMinutes,
        efficiency: latest.efficiency ?? null,
        stages: latest.stages?.map((s) => ({
          start: s.start instanceof Date ? s.start.toISOString() : s.start,
          end: s.end instanceof Date ? s.end.toISOString() : s.end,
          stage: s.stage,
        })) ?? null,
      }];
    } catch (error) {
      console.error('Failed to fetch sleep sessions:', error);
      return [];
    }
  }

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
        return await fetchLastSleepSession();
      } catch (error: any) {
        console.error('SleepScreen: fetchLastSleepSession error:', error);
        // Don't set error state for permission/availability issues - just return null silently
        // This prevents showing "reload app" error when permissions aren't granted
        // Only log to console for debugging
        if (error?.message?.includes('permission') || error?.message?.includes('not available') || error?.message?.includes('No session')) {
          return null;
        }
        // For other errors, also return null but log for debugging
        // Don't show error UI on initial load - user can retry manually if needed
        return null;
      }
    },
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
  };

  const sleepQ = useQuery(sleepQueryOptions);

  const sessionsQueryOptions: UseQueryOptions<
    LegacySleepSession[],
    Error,
    LegacySleepSession[],
    ['sleep:sessions:30d']
  > = {
    queryKey: ['sleep:sessions:30d'],
    queryFn: () => fetchSleepSessions(30),
    retry: false,
  };

  const sessionsQ = useQuery(sessionsQueryOptions);

  useEffect(() => {
    const connectedCount = connectedIntegrations.length;
    if (connectedCount > 0 && connectedCount !== lastConnectedCountRef.current) {
      lastConnectedCountRef.current = connectedCount;
      (async () => {
        try {
          await syncAll();
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
          await refreshInsight('sleep-auto-sync');
        } catch (error) {
          logger.warn('Health auto-sync failed', error);
        }
      })();
    } else {
      lastConnectedCountRef.current = connectedCount;
    }
  }, [connectedIntegrations, qc, refreshInsight]);

  /* ───────── derived ───────── */
  const s: LegacySleepSession | null = sleepQ.data ?? null;

  const stageAgg = useMemo(() => {
    if (!s?.stages?.length) return null;
    const acc = new Map<SleepStage, number>();
    for (const seg of s.stages) {
      const min = Math.max(0, Math.round((+new Date(seg.end) - +new Date(seg.start)) / 60000));
      acc.set(seg.stage, (acc.get(seg.stage) ?? 0) + min);
    }
    return acc;
  }, [s?.stages]);

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
  if (hasError) {
    return (
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      >
        <Text variant="headlineSmall" style={{ color: textPrimary, marginBottom: 12 }}>
          Sleep
        </Text>
        <Card mode="elevated" style={{ borderRadius: 20 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: errorColor, marginBottom: 8 }}>
              Error: {hasError}
            </Text>
            {errorDetails && (
              <Text variant="bodySmall" style={{ color: textSecondary, marginBottom: 12 }}>
                {formatErrorDetails(errorDetails)}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={() => {
                setHasError(null);
                setErrorDetails(null);
                sleepQ.refetch();
              }}
              accessibilityLabel="Retry loading sleep data"
            >
              Retry
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    );
  }

  return (
    <>
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <Text variant="headlineSmall" style={{ color: textPrimary, marginBottom: 12 }}>
        Sleep
      </Text>

      {/* Health Platform connect/refresh */}
      <Card mode="elevated" style={{ borderRadius: 20, marginBottom: 16 }}>
        <Card.Title title="Connect & sync" />
        <Card.Content>
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
            <Card mode="contained-tonal" style={{ marginTop: 12, borderRadius: 16 }}>
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
          {connectedIntegrations.length === 0 ? (
            <Text variant="labelSmall" style={{ marginTop: 4, color: textSecondary }}>
              Connect a provider above to enable manual imports.
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      {/* Last night summary */}
      <Card mode="elevated" style={{ borderRadius: 20, marginBottom: 16 }}>
        <Card.Title title="Last night" />
        <Card.Content>
          {sleepQ.isLoading && (
            <Text variant="bodyMedium" style={{ color: textSecondary, marginTop: 6 }}>
              Loading…
            </Text>
          )}
          {sleepQ.error && (
            <HelperText type="error" visible>
              {(sleepQ.error as any)?.message ?? 'Failed to read sleep.'}
            </HelperText>
          )}

          {!sleepQ.isLoading && !sleepQ.error && !s ? (
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
                  ? `No recent ${primaryIntegration?.title ?? 'connected'} sleep session found (or permission missing).`
                  : 'Connect a provider above to see your latest sleep data.'}
              </Text>
            </View>
          ) : null}

          {s && (
            <>
              <Text variant="bodyLarge" style={{ marginTop: 8, color: textPrimary }}>
                {new Date(s.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} →{' '}
                {new Date(s.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </Text>
              <Text variant="bodyMedium" style={{ marginTop: 4, color: textPrimary, fontWeight: '600' }}>
                Total: {fmtHM(s.durationMin)}
              </Text>
              {typeof s.efficiency === 'number' && (
                <Text variant="bodySmall" style={{ marginTop: 2, color: textSecondary }}>
                  Efficiency: {Math.round(s.efficiency * 100)}%
                </Text>
              )}

              {stageAgg ? (
                <View style={{ marginTop: 12 }}>
                  {(['awake', 'light', 'deep', 'rem'] as SleepStage[]).map((st) => {
                    const v = stageAgg.get(st) ?? 0;
                    return (
                      <Text key={st} variant="bodySmall" style={{ color: textSecondary }}>
                        {st.toUpperCase()}: {fmtHM(v)}
                      </Text>
                    );
                  })}
                </View>
              ) : null}

              {s.stages?.length ? <Hypnogram segments={s.stages} /> : null}

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
        </Card.Content>
      </Card>

      {/* Circadian planning (Desired, Detected today, Rolling avg) */}
      <Card mode="elevated" style={{ borderRadius: 20, marginBottom: 16 }}>
        <Card.Title title="Circadian wake" />
        <Card.Content>
          <Text variant="bodyMedium" style={{ color: textPrimary }}>
            Desired wake time
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8, columnGap: 12 }}>
            <Button
              mode="contained"
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
            >
              Save desired
            </Button>
            <TextInput
              mode="outlined"
              value={desiredInput}
              onChangeText={setDesiredInput}
              placeholder={settingsQ.data?.desiredWakeHHMM ?? '07:00'}
              accessibilityLabel="Desired wake time input"
              keyboardType="numbers-and-punctuation"
              style={{ flex: 1 }}
            />
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

          <View style={{ marginTop: 16 }}>
            <Text variant="titleSmall" style={{ color: textPrimary }}>
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
                    Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM}. Morning confirm rescheduled.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to apply');
                  }
                }}
                accessibilityLabel="Use rolling average as typical wake"
              >
                Use rolling average
              </Button>
              <Button
                mode="outlined"
                onPress={async () => {
                  try {
                    const hhmm = settingsQ.data?.desiredWakeHHMM ?? '07:00';
                    const saved = await saveSleepSettings({ typicalWakeHHMM: hhmm });
                    await scheduleMorningConfirm(hhmm);
                    Alert.alert('Applied', `Typical wake set to ${saved.typicalWakeHHMM} (desired). Morning confirm rescheduled.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to apply');
                  }
                }}
                accessibilityLabel="Use desired wake as typical wake"
              >
                Use desired wake
              </Button>
            </View>
          </View>

          {(() => {
            const desired = settingsQ.data?.desiredWakeHHMM;
            const current = rollingAvg ?? settingsQ.data?.typicalWakeHHMM;
            if (!desired || !current) return null;

            const curM = hhmmToMinutes(current);
            const dstM = hhmmToMinutes(desired);
            let delta = dstM - curM;
            if (Math.abs(delta) > 720) {
              delta = delta > 0 ? delta - 1440 : delta + 1440;
            }

            const perDay = delta > 0 ? Math.min(20, delta) : Math.max(-20, delta);
            const daysNeeded = Math.ceil(Math.abs(delta) / Math.abs(perDay || 1));
            const bedtimeFromWake = (wakeHHMM: string, targetMin: number) => {
              const w = hhmmToMinutes(wakeHHMM);
              const bedtimeMin = ((w - targetMin) % 1440 + 1440) % 1440;
              return minutesToHHMM(bedtimeMin);
            };

            const suggestLine = `Shift ~${Math.abs(perDay)} min/day for ~${daysNeeded} day${daysNeeded === 1 ? '' : 's'}.`;

            return (
              <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: borderColor }}>
                <Text variant="titleSmall" style={{ color: textPrimary }}>
                  Plan to reach desired wake
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 6, color: textPrimary }}>
                  Current: {current} → Desired: {desired} • {suggestLine}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 4, color: textSecondary }}>
                  Tip: shift light, meals, and activity in the same direction; avoid late caffeine; keep a consistent wind-down.
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 4, color: textSecondary }}>
                  Bedtime tonight (for {settingsQ.data?.targetSleepMinutes ?? 480} min sleep):{' '}
                  {bedtimeFromWake(current, settingsQ.data?.targetSleepMinutes ?? 480)}
                </Text>
                <Button
                  mode="outlined"
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                  onPress={async () => {
                    try {
                      const wake = settingsQ.data?.typicalWakeHHMM ?? current;
                      await scheduleBedtimeSuggestion(wake, settingsQ.data?.targetSleepMinutes ?? 480);
                      Alert.alert('Scheduled', `Bedtime suggestions use wake ${wake}. Update typical wake to change this.`);
                    } catch (e: any) {
                      Alert.alert('Error', e?.message ?? 'Failed to schedule bedtime');
                    }
                  }}
                  accessibilityLabel="Schedule bedtime suggestion"
                >
                  Schedule bedtime
                </Button>
              </View>
            );
          })()}
        </Card.Content>
      </Card>

      {/* Reminders */}
      <Card mode="elevated" style={{ borderRadius: 20, marginBottom: 16 }}>
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

      {/* Roadmap hint */}
      <Card mode="outlined" style={{ borderRadius: 20 }}>
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
              backgroundColor: 'rgba(15,23,42,0.4)',
            }}
          >
          <Card style={{ borderRadius: 20 }}>
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
            <Card.Actions style={{ justifyContent: 'space-between' }}>
              <Button
                onPress={() => setSimulateMode('unavailable')}
                disabled={importStage !== 'running' || simulateMode !== 'none'}
                accessibilityLabel="Simulate provider unavailable"
              >
                Simulate unavailable
              </Button>
              <Button
                onPress={() => setSimulateMode('denied')}
                disabled={importStage !== 'running' || simulateMode !== 'none'}
                accessibilityLabel="Simulate permission denied"
              >
                Simulate permission denied
              </Button>
            </Card.Actions>
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
