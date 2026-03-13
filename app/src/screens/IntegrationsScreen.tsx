import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Modal, Platform, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Button,
  Card,
  HelperText,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import { InformationalCard, SectionHeader } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import {
  getGoogleFitProvider,
  googleFitGetSleepSessions,
  googleFitHasPermissions,
} from '@/lib/health/googleFitService';
import {
  getIntegrationsWithStatus,
  reconcileStoredIntegrationStatuses,
} from '@/lib/health/integrations';
import {
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';
import { importSamsungHistory } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { usePremium } from '@/lib/premium/usePremium';
import { generateAndShareTherapistReport } from '@/lib/export/therapistReport';
import {
  listMoodCheckins,
  listSleepSessions,
  listMedDoseLogsRemoteLastNDays,
  listTrainingSessions,
} from '@/lib/api';
import { PaywallModal } from '@/components/premium/PaywallModal';
import {
  getProviderOnboardingComplete,
  setProviderOnboardingComplete,
} from '@/state/providerPreferences';
import { requestHealthSync, type HealthSyncResult } from '@/sync/SyncCoordinator';

type ImportStepStatus = 'pending' | 'running' | 'success' | 'error';
type ImportStep = {
  id: IntegrationId;
  title: string;
  status: ImportStepStatus;
  message?: string;
};

type SleepProviderDebugKey = 'health_connect' | 'google_fit' | 'apple_healthkit' | 'samsung_health';

const PROVIDER_KEY_BY_INTEGRATION: Partial<Record<IntegrationId, SleepProviderDebugKey>> = {
  health_connect: 'health_connect',
  google_fit: 'google_fit',
  apple_healthkit: 'apple_healthkit',
  samsung_health: 'samsung_health',
};

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export default function IntegrationsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const reduceMotionGlobal = useReducedMotion();
  const { refresh: refreshInsights, insights } = useScientificInsights();
  const { isPremium } = usePremium();

  const textPrimary = theme.colors.onSurface;
  const textSecondary = theme.colors.onSurfaceVariant;
  const background = theme.colors.background;
  const cardRadius = 16;
  const cardSurface = theme.colors.surface;

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

  const [showProviderTip, setShowProviderTip] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const handleExportReport = useCallback(async () => {
    if (!isPremium) {
      setPaywallVisible(true);
      return;
    }
    setExportLoading(true);
    try {
      const [moods, sleepSessions, medLogs, trainingSessions] = await Promise.all([
        listMoodCheckins(30),
        listSleepSessions(14),
        listMedDoseLogsRemoteLastNDays(7),
        listTrainingSessions(7),
      ]);
      const trainingSessionCount = (trainingSessions ?? []).filter((s: any) => !!s.ended_at).length;
      await generateAndShareTherapistReport({
        generatedAt: new Date().toISOString(),
        moods: moods ?? [],
        sleepSessions: sleepSessions ?? [],
        medLogs: medLogs ?? [],
        insights: insights ?? [],
        trainingSessionCount,
      });
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Unable to generate report right now.');
    } finally {
      setExportLoading(false);
    }
  }, [isPremium, insights]);
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);
  const [samsungImporting, setSamsungImporting] = useState(false);
  const [googleFitAvailable, setGoogleFitAvailable] = useState<boolean | null>(null);

  const visibleIntegrations = useMemo(
    () => {
      if (Platform.OS === 'android') {
        return integrations.filter((item) => item.id === 'health_connect');
      }
      if (Platform.OS === 'ios') {
        return integrations.filter((item) => item.id === 'apple_healthkit');
      }
      return integrations;
    },
    [integrations],
  );

  const connectedIntegrations = useMemo(
    () => visibleIntegrations.filter((item) => item.status?.connected),
    [visibleIntegrations],
  );

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importStage, setImportStage] = useState<'idle' | 'running' | 'done'>('idle');
  const [importSteps, setImportSteps] = useState<ImportStep[]>([]);
  const [simulateMode, setSimulateMode] = useState<'none' | 'unavailable' | 'denied'>('none');
  const simulateModeRef = useRef<'none' | 'unavailable' | 'denied'>('none');
  const importCancelRef = useRef(false);

  useEffect(() => {
    simulateModeRef.current = simulateMode;
  }, [simulateMode]);

  useEffect(() => {
    getGoogleFitProvider()
      .isAvailable()
      .then(setGoogleFitAvailable)
      .catch(() => setGoogleFitAvailable(false));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state !== 'active') return;
      try {
        await reconcileStoredIntegrationStatuses({ force: true });
      } catch {
        // best effort
      }
      await refreshIntegrations();
    });
    return () => sub.remove();
  }, [refreshIntegrations]);

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
        return theme.colors.primary;
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

  const isConnectingIntegration = (id: IntegrationId) =>
    connectIntegrationPending && connectingId === id;
  const isDisconnectingIntegration = (id: IntegrationId) =>
    disconnectIntegrationPending && disconnectingId === id;

  const buildSyncFallbackResult = useCallback(
    (
      providers: Array<{ id: IntegrationId; status?: { connected?: boolean } }>,
      options: { timedOut: boolean; message: string },
    ): HealthSyncResult => {
      const sleepProviders: Record<SleepProviderDebugKey, any> = {
        health_connect: {
          provider: 'health_connect',
          connected: false,
          available: false,
          hasPermissions: false,
          windowDays: 0,
          sessionsRead: 0,
          writeAttempts: 0,
          writeSuccesses: 0,
          skippedExisting: 0,
          skippedInvalid: 0,
          skippedMissingTimes: 0,
          note: options.timedOut ? 'sync_pending' : 'sync_error',
          errors: [options.message],
        },
        google_fit: {
          provider: 'google_fit',
          connected: false,
          available: false,
          hasPermissions: false,
          windowDays: 0,
          sessionsRead: 0,
          writeAttempts: 0,
          writeSuccesses: 0,
          skippedExisting: 0,
          skippedInvalid: 0,
          skippedMissingTimes: 0,
          note: options.timedOut ? 'sync_pending' : 'sync_error',
          errors: [options.message],
        },
        apple_healthkit: {
          provider: 'apple_healthkit',
          connected: false,
          available: false,
          hasPermissions: false,
          windowDays: 0,
          sessionsRead: 0,
          writeAttempts: 0,
          writeSuccesses: 0,
          skippedExisting: 0,
          skippedInvalid: 0,
          skippedMissingTimes: 0,
          note: options.timedOut ? 'sync_pending' : 'sync_error',
          errors: [options.message],
        },
        samsung_health: {
          provider: 'samsung_health',
          connected: false,
          available: false,
          hasPermissions: false,
          windowDays: 0,
          sessionsRead: 0,
          writeAttempts: 0,
          writeSuccesses: 0,
          skippedExisting: 0,
          skippedInvalid: 0,
          skippedMissingTimes: 0,
          note: options.timedOut ? 'sync_pending' : 'sync_error',
          errors: [options.message],
        },
      };

      for (const provider of providers) {
        const key = PROVIDER_KEY_BY_INTEGRATION[provider.id];
        if (!key) continue;
        sleepProviders[key] = {
          ...sleepProviders[key],
          connected: provider.status?.connected === true,
          available: provider.status?.connected === true,
          hasPermissions: provider.status?.connected === true,
        };
      }

      return {
        sleepSynced: false,
        activitySynced: false,
        syncedAt: null,
        debug: {
          serviceAvailable: providers.length > 0,
          hasPermissions: providers.some((p) => p.status?.connected === true),
          sleepDataFound: false,
          sleepWriteAttempts: 0,
          sleepWriteSuccesses: 0,
          sleepSyncStatus: options.timedOut ? 'no_provider' : 'write_failed',
          ...(options.timedOut ? { sleepWriteErrors: [options.message] } : { saveError: options.message }),
          sleepProviders,
        },
      };
    },
    [],
  );

  const getSleepSyncFailureMessage = (
    syncResult: HealthSyncResult | null | undefined,
  ): string => {
    const debug = syncResult?.debug;
    const providerSummary = Object.entries(debug?.sleepProviders ?? {})
      .map(([providerId, provider]) => {
        const labelMap: Record<string, string> = {
          health_connect: 'Health Connect',
          google_fit: 'Google Fit',
          apple_healthkit: 'Apple Health',
          samsung_health: 'Samsung Health',
        };
        const label = labelMap[providerId] ?? providerId;
        if (!provider.connected) return `- ${label}: not connected`;
        if (!provider.available) return `- ${label}: unavailable`;
        if (!provider.hasPermissions) return `- ${label}: permissions missing`;
        return `- ${label}: read ${provider.sessionsRead}, wrote ${provider.writeSuccesses}/${provider.writeAttempts}, existing ${provider.skippedExisting}`;
      })
      .join('\n');
    const suffix = providerSummary ? `\n\nProvider details:\n${providerSummary}` : '';

    const base = 'Sleep sync failed to write sessions to Supabase.';
    if (debug?.saveError) return `${base}\n\n${debug.saveError}${suffix}`;
    if (debug?.sleepWriteErrors?.length) return `${base}\n\n${debug.sleepWriteErrors[0]}${suffix}`;
    return `${base}\n\nCheck provider permissions and database policies, then retry.${suffix}`;
  };

  const isSleepSyncHardFailure = (
    syncResult: HealthSyncResult | null | undefined,
  ): boolean => {
    const debug = syncResult?.debug;
    if (!debug) return false;
    if (debug.saveError) return true;
    return debug.sleepSyncStatus === 'write_failed';
  };

  const getSleepSyncInfoMessage = (
    syncResult: HealthSyncResult | null | undefined,
  ): string => {
    const debug = syncResult?.debug;
    if (debug?.sleepSyncStatus === 'no_provider') {
      return 'Connected, but no provider is ready for sleep import yet. Check permissions and provider availability.';
    }
    return 'Connected. No new sleep sessions needed to be written this run.';
  };

  const getSleepSyncSummary = (syncResult: HealthSyncResult | null | undefined): string => {
    const providers = syncResult?.debug?.sleepProviders;
    if (!providers) return '';
    const labelMap: Record<string, string> = {
      health_connect: 'Health Connect',
      google_fit: 'Google Fit',
      apple_healthkit: 'Apple Health',
      samsung_health: 'Samsung Health',
    };
    const lines = Object.entries(providers).map(([providerId, provider]) => {
      const label = labelMap[providerId] ?? providerId;
      if (!provider.connected) return `- ${label}: not connected`;
      if (!provider.available) return `- ${label}: unavailable`;
      if (!provider.hasPermissions) return `- ${label}: permissions missing`;
      if (provider.note === 'sync_pending') return `- ${label}: sync still processing`;
      return `- ${label}: read ${provider.sessionsRead}, wrote ${provider.writeSuccesses}/${provider.writeAttempts}, existing ${provider.skippedExisting}`;
    });
    return lines.length ? `\n\nSync details:\n${lines.join('\n')}` : '';
  };

  const handleConnectIntegration = async (id: IntegrationId) => {
    try {
      const response = await connectIntegration(id);
      const definition = integrations.find((item) => item.id === id);
      const title = definition?.title ?? 'Provider';
      const result = response?.result;
      if (result?.success) {
        await refreshIntegrations();
        // After connect, short delay so system commits permissions before sync checks them
        if (id === 'health_connect') {
          await new Promise((r) => setTimeout(r, 900));
        }
        let syncTimedOut = false;
        const syncResult = await withTimeout(
          requestHealthSync({ reason: 'integrations_connect', force: true }),
          45_000,
          'integrations_connect_sync',
        ).catch((error: any) => {
          const isTimeout = String(error?.message ?? '').toLowerCase().includes('timed out');
          syncTimedOut = isTimeout;
          logger.debug(
            isTimeout
              ? '[Integrations] connect sync timed out (background write may still complete)'
              : '[Integrations] connect sync failed',
            error,
          );
          return buildSyncFallbackResult(
            [{ id, status: { connected: true } }],
            {
              timedOut: isTimeout,
              message: error?.message ?? 'Sync failed before Supabase write.',
            },
          );
        });
        await qc.invalidateQueries({ queryKey: ['sleep:last'] });
        await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
        await qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] });
        await reconcileStoredIntegrationStatuses({ force: true, allowManualReconnect: true }).catch((e) => { if (__DEV__) logger.debug('[IntegrationsScreen]', e); });
        if (syncResult?.sleepSynced || syncResult?.activitySynced) {
          refreshInsights('integrations-connect').catch((e) => { if (__DEV__) logger.debug('[IntegrationsScreen]', e); });
        }
        if (isSleepSyncHardFailure(syncResult)) {
          Alert.alert('Connected, but sleep sync failed', getSleepSyncFailureMessage(syncResult));
        } else if (syncTimedOut) {
          Alert.alert(
            'Connected',
            `${title} connected. Sync is taking longer than expected and may complete in the background.${getSleepSyncSummary(syncResult)}`,
          );
        } else if (!syncResult?.sleepSynced) {
          Alert.alert('Connected', `${getSleepSyncInfoMessage(syncResult)}${getSleepSyncSummary(syncResult)}`);
        } else {
          Alert.alert('Connected', `${title} connected and sleep synced.${getSleepSyncSummary(syncResult)}`);
        }
        await refreshIntegrations();
      } else {
        const message = result?.message ?? 'Unable to connect.';
        const isPermissionDenied = /permission|declined|denied/i.test(message);
        if (isPermissionDenied) {
          Alert.alert(title, message, [
            {
              text: 'Open Settings',
              onPress: () =>
                Linking.openSettings().catch(() => {
                  Alert.alert('Open Settings', 'Unable to open app settings. Please open Settings manually.');
                }),
            },
            { text: 'OK' },
          ]);
        } else {
          Alert.alert(title, message);
        }
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
            await reconcileStoredIntegrationStatuses({ force: true });
            Alert.alert('Disconnected', `${title} disconnected.`);
            await qc.invalidateQueries({ queryKey: ['sleep:last'] });
            await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
            await refreshIntegrations();
          } catch (error: any) {
            Alert.alert('Disconnect failed', error?.message ?? 'Unable to disconnect the provider.');
          }
        },
      },
    ]);
  };

  const handleImportSamsungHistory = useCallback(async () => {
    try {
      setSamsungImporting(true);
      const res = await importSamsungHistory(90);
      logger.debug('[SamsungHealth] Import result', res);
      Alert.alert(
        'Samsung Health import',
        `Imported: ${res.imported}\nSkipped: ${res.skipped}\nErrors: ${res.errors.length ? res.errors.join('\n') : 'None'}`,
      );
    } catch (error: any) {
      Alert.alert('Samsung Health import failed', error?.message ?? String(error));
    } finally {
      setSamsungImporting(false);
    }
  }, []);

  const processImport = useCallback(async () => {
    await reconcileStoredIntegrationStatuses({ force: true });
    const providers = (await getIntegrationsWithStatus()).filter((item) => item.status?.connected);
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

    // Run real sync so data pulls from Health Connect / providers and uploads to Supabase
    let syncResult: HealthSyncResult | null = null;
    let syncTimedOut = false;
    try {
      syncResult = await withTimeout(
        requestHealthSync({ reason: 'integrations_import', force: true }),
        45_000,
        'integrations_import_sync',
      );
    } catch (e: any) {
      const isTimeout = String(e?.message ?? '').toLowerCase().includes('timed out');
      syncTimedOut = isTimeout;
      logger.debug(
        isTimeout
          ? '[Integrations] processImport sync timed out (Google Fit can be slow)'
          : '[Integrations] processImport syncHealthData failed',
        e,
      );
      syncResult = buildSyncFallbackResult(
        providers as Array<{ id: IntegrationId; status?: { connected?: boolean } }>,
        {
          timedOut: isTimeout,
          message: e?.message ?? 'Sync failed before Supabase write.',
        },
      );
    }

    try {
      await qc.invalidateQueries({ queryKey: ['sleep:last'] });
      await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
      await qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] });
      if (syncResult?.sleepSynced || syncResult?.activitySynced) {
        refreshInsights('integrations-import').catch((e) => { if (__DEV__) logger.debug('[IntegrationsScreen]', e); });
      }
    } catch {}

    for (let index = 0; index < providers.length; index++) {
      if (importCancelRef.current) break;
      const provider = providers[index];

      setImportSteps((prev) =>
        prev.map((step, stepIndex) =>
          stepIndex === index ? { ...step, status: 'running', message: undefined } : step,
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 150));
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
            ? (() => {
                const providerKey = PROVIDER_KEY_BY_INTEGRATION[provider.id];
                const providerOutcome = providerKey
                  ? (syncResult?.debug?.sleepProviders as any)?.[providerKey]
                  : null;
                if (!providerOutcome) {
                  const earlyExitReason =
                    syncResult?.debug?.saveError ??
                    syncResult?.debug?.sleepWriteErrors?.[0] ??
                    null;
                  return {
                    ...step,
                    status: 'error' as const,
                    message: earlyExitReason
                      ? `No per-provider diagnostics were returned. Sync ended early: ${earlyExitReason}`
                      : 'No provider diagnostics were returned for this import run.',
                  };
                }
                if (!providerOutcome.connected || providerOutcome.note === 'provider_not_connected') {
                  return {
                    ...step,
                    status: 'error' as const,
                    message: 'Provider is not connected.',
                  };
                }
                if (!providerOutcome.available || providerOutcome.note === 'provider_unavailable') {
                  return {
                    ...step,
                    status: 'error' as const,
                    message: 'Provider is unavailable on this device right now.',
                  };
                }
                if (!providerOutcome.hasPermissions || providerOutcome.note === 'permissions_missing') {
                  return {
                    ...step,
                    status: 'error' as const,
                    message: 'Permissions missing. Re-grant health permissions and retry.',
                  };
                }
                if (providerOutcome.note === 'sync_error') {
                  const providerError =
                    Array.isArray(providerOutcome.errors) && providerOutcome.errors.length > 0
                      ? providerOutcome.errors[0]
                      : null;
                  return {
                    ...step,
                    status: 'error' as const,
                    message: providerError
                      ? `Provider sync failed: ${providerError}`
                      : 'Provider sync failed. Please retry.',
                  };
                }
                if (providerOutcome.note === 'sync_pending') {
                  return {
                    ...step,
                    status: 'success' as const,
                    message: 'Sync is still processing. Data may appear shortly.',
                  };
                }
                const providerFailed =
                  providerOutcome.writeAttempts > 0 &&
                  providerOutcome.writeSuccesses === 0;
                if (providerFailed) {
                  return {
                    ...step,
                    status: 'error' as const,
                    message: `Read ${providerOutcome.sessionsRead}, wrote ${providerOutcome.writeSuccesses}/${providerOutcome.writeAttempts}.`,
                  };
                }
                if (providerOutcome && providerOutcome.sessionsRead > 0 && providerOutcome.writeSuccesses > 0) {
                  return {
                    ...step,
                    status: 'success' as const,
                    message: `Read ${providerOutcome.sessionsRead}, wrote ${providerOutcome.writeSuccesses}/${providerOutcome.writeAttempts}, existing ${providerOutcome.skippedExisting}.`,
                  };
                }
                return {
                  ...step,
                  status: 'success' as const,
                  message: `Read ${providerOutcome.sessionsRead}, wrote ${providerOutcome.writeSuccesses}/${providerOutcome.writeAttempts}, existing ${providerOutcome.skippedExisting}.`,
                };
              })()
            : step,
        ),
      );
    }

    if (importCancelRef.current) {
      setImportStage('idle');
    } else {
      if (isSleepSyncHardFailure(syncResult)) {
        Alert.alert('Import failed', getSleepSyncFailureMessage(syncResult));
      } else if (syncTimedOut) {
        Alert.alert('Import in progress', 'Sync is taking longer than expected and may continue in the background.');
      } else if (!syncResult?.sleepSynced) {
        Alert.alert('Import complete', 'No new sleep sessions were available to import.');
      }
      setImportStage('done');
    }
  }, [qc, refreshInsights, buildSyncFallbackResult]);

  useEffect(() => {
    if (importModalVisible) {
      importCancelRef.current = false;
      setSimulateMode('none');
      simulateModeRef.current = 'none';
      const timeoutId = setTimeout(() => {
        processImport();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    importCancelRef.current = true;
    setImportStage('idle');
    setImportSteps([]);
    setSimulateMode('none');
    simulateModeRef.current = 'none';
  }, [importModalVisible]);

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

  const sectionSpacing = 16;

  const connectSection = (
    <>
      <SectionHeader
        title="Connect & sync"
        icon="link-variant"
        caption="Connect health apps to automatically sync sleep data"
      />
      <InformationalCard icon="information-outline" feedbackScope={{ componentKey: 'integrations-connect', componentTitle: 'Connect & sync', tags: ['integrations'] }}>
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
          <Card mode="contained" style={{ borderRadius: cardRadius, marginTop: 12 }}>
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
              items={visibleIntegrations}
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
        {Platform.OS !== 'android' && (
          <>
            <Button
              mode="outlined"
              loading={samsungImporting}
              onPress={handleImportSamsungHistory}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
              accessibilityLabel="Import Samsung Health history (legacy import only)"
            >
              Import Samsung history
            </Button>
            <HelperText type="info" style={{ marginTop: 4 }}>
              Legacy import only. Samsung Health is not available as a connectable integration.
            </HelperText>
          </>
        )}
        {Platform.OS !== 'android' && googleFitAvailable !== null ? (
          <Text variant="labelSmall" style={{ marginTop: 4, color: textSecondary }}>
            Google Fit on this device:{' '}
            {googleFitAvailable
              ? 'Available'
              : 'Not available (use EAS/dev build, not Expo Go)'}
          </Text>
        ) : null}
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
                }\nSleep (24h): ${readSleep}\n\nIf permissions are not granted:\n• Ensure Google Fit is installed and signed in\n• Verify OAuth client + SHA-1 are configured (see docs/EAS_PREVIEW_AND_GOOGLE_FIT_SETUP.md)\n• Run this build outside Expo Go.`,
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

  return (
    <>
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: sectionSpacing }}>{connectSection}</View>

        {/* Therapist / Professional Export */}
        <View style={{ marginBottom: sectionSpacing }}>
          <SectionHeader
            title="Export"
            icon="file-export-outline"
            caption="Share your health data with a professional"
          />
          <InformationalCard feedbackScope={{ componentKey: 'integrations-export', componentTitle: 'Export', tags: ['integrations'] }}>
            <Text variant="bodyMedium" style={{ color: textPrimary, marginBottom: 8 }}>
              Generate a professional PDF report covering your mood trends, sleep, medication adherence, and recent insights — designed to share with a therapist, GP, or psychiatrist.
            </Text>
            {!isPremium ? (
              <Text variant="labelSmall" style={{ color: textSecondary, marginBottom: 10 }}>
                Premium feature — upgrade to unlock PDF export.
              </Text>
            ) : null}
            <Button
              mode={isPremium ? 'contained-tonal' : 'outlined'}
              icon="file-pdf-box"
              loading={exportLoading}
              disabled={exportLoading}
              onPress={handleExportReport}
              accessibilityLabel="Generate and share therapist report PDF"
            >
              {isPremium ? 'Export PDF Report' : 'Unlock PDF Export'}
            </Button>
          </InformationalCard>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        featureDescription="Export a professional PDF report to share with your therapist or GP."
        onDismiss={() => setPaywallVisible(false)}
      />

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
                    Connect a provider above to import health data.
                  </Text>
                ) : (
                  importSteps.map((step) => (
                    <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <MaterialCommunityIcons
                        name={statusIconFor(step.status) as any}
                        size={22}
                        color={statusColorFor(step.status)}
                      />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text variant="bodyMedium" style={{ color: textPrimary }}>
                          {step.title}
                        </Text>
                        <Text variant="labelSmall" style={{ color: statusColorFor(step.status), marginTop: 4 }}>
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

