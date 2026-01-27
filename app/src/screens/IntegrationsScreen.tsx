import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppStateStatus, Linking, Modal, ScrollView, View } from 'react-native';
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
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';
import { importSamsungHistory, syncHealthData } from '@/lib/sync';
import { logger } from '@/lib/logger';
import { useScientificInsights } from '@/providers/InsightsProvider';
import {
  getProviderOnboardingComplete,
  setProviderOnboardingComplete,
} from '@/state/providerPreferences';

type ImportStepStatus = 'pending' | 'running' | 'success' | 'error';
type ImportStep = {
  id: IntegrationId;
  title: string;
  status: ImportStepStatus;
  message?: string;
};

export default function IntegrationsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const reduceMotionGlobal = useReducedMotion();
  const { refresh: refreshInsights } = useScientificInsights();

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
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);
  const [samsungImporting, setSamsungImporting] = useState(false);
  const [googleFitAvailable, setGoogleFitAvailable] = useState<boolean | null>(null);

  const connectedIntegrations = useMemo(
    () => integrations.filter((item) => item.status?.connected),
    [integrations],
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

  const handleConnectIntegration = async (id: IntegrationId) => {
    try {
      const response = await connectIntegration(id);
      const definition = integrations.find((item) => item.id === id);
      const title = definition?.title ?? 'Provider';
      const result = response?.result;
      if (result?.success) {
        Alert.alert('Connected', `${title} connected successfully.`);
        // After Health Connect connect, short delay so system commits permissions before sync checks them
        if (id === 'health_connect') {
          await new Promise((r) => setTimeout(r, 450));
          const syncResult = await syncHealthData().catch(() => ({ sleepSynced: false, activitySynced: false }));
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
          await qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] });
          if (syncResult?.sleepSynced || syncResult?.activitySynced) {
            refreshInsights('integrations-health-connect').catch(() => {});
          }
        } else {
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
        }
        refreshIntegrations();
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
            Alert.alert('Disconnected', `${title} disconnected.`);
            await qc.invalidateQueries({ queryKey: ['sleep:last'] });
            await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
            refreshIntegrations();
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

    // Run real sync so data pulls from Health Connect / providers and uploads to Supabase
    let syncResult: { sleepSynced?: boolean; activitySynced?: boolean } = {};
    try {
      syncResult = await syncHealthData();
    } catch (e) {
      logger.warn('[Integrations] processImport syncHealthData failed', e);
    }

    try {
      await qc.invalidateQueries({ queryKey: ['sleep:last'] });
      await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
      await qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] });
      if (syncResult?.sleepSynced || syncResult?.activitySynced) {
        refreshInsights('integrations-import').catch(() => {});
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

      await new Promise((resolve) => setTimeout(resolve, 400));
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
            ? { ...step, status: 'success', message: 'Sleep and activity imported successfully.' }
            : step,
        ),
      );
    }

    if (importCancelRef.current) {
      setImportStage('idle');
    } else {
      setImportStage('done');
    }
  }, [connectedIntegrations, qc, refreshInsights]);

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
          accessibilityLabel="Import Samsung Health history (legacy import only)"
        >
          Import Samsung history
        </Button>
        <HelperText type="info" style={{ marginTop: 4 }}>
          Legacy import only. Samsung Health is not available as a connectable integration.
        </HelperText>
        {googleFitAvailable !== null ? (
          <Text variant="labelSmall" style={{ marginTop: 4, color: textSecondary }}>
            Google Fit on this device: {googleFitAvailable ? 'Available' : 'Not available (use EAS/dev build, not Expo Go)'}
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

