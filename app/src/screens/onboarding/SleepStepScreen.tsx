import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import { reconcileStoredIntegrationStatuses } from '@/lib/health/integrations';
import {
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';
import { requestHealthSync, type HealthSyncResult } from '@/sync/SyncCoordinator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Sleep'>;

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

export default function SleepStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);

  const {
    integrations,
    integrationsLoading,
    integrationsError,
    connectIntegration,
    disconnectIntegration,
    connectIntegrationPending,
    disconnectIntegrationPending,
    connectingId,
    disconnectingId,
    refreshIntegrations,
  } = useHealthIntegrationsList();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferred = await getPreferredIntegration();
      if (!cancelled) setPreferredIntegrationId(preferred);
    })();
    return () => {
      cancelled = true;
    };
  }, [integrations]);

  const isConnectingIntegration = (id: IntegrationId) => connectIntegrationPending && connectingId === id;
  const isDisconnectingIntegration = (id: IntegrationId) => disconnectIntegrationPending && disconnectingId === id;

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
    return `${base}\n\nCheck provider permissions and retry in Integrations.${suffix}`;
  };

  const isSleepSyncHardFailure = (
    syncResult: HealthSyncResult | null | undefined,
  ): boolean => {
    const debug = syncResult?.debug;
    if (!debug) return false;
    if (debug.saveError) return true;
    return (debug.sleepWriteAttempts ?? 0) > 0 && (debug.sleepWriteSuccesses ?? 0) === 0;
  };

  const handleSetPreferredIntegration = useCallback(async (id: IntegrationId) => {
    await setPreferredIntegration(id);
    setPreferredIntegrationId(id);
    Alert.alert('Preferred provider', 'Updated primary health provider.');
  }, []);

  const handleConnectIntegration = useCallback(
    async (id: IntegrationId) => {
      try {
        const response = await connectIntegration(id);
        const title = integrations.find((item) => item.id === id)?.title ?? 'Provider';
        const result = response?.result;

        if (result?.success) {
          await refreshIntegrations();
          if (id === 'health_connect') {
            await setPreferredIntegration('health_connect');
            setPreferredIntegrationId('health_connect');
          }
          // Sync sleep to Supabase immediately after connecting (first sync = full history)
          if (id === 'health_connect') {
            await new Promise((r) => setTimeout(r, 900));
          }
          const syncResult = await withTimeout(
            requestHealthSync({ reason: 'onboarding_sleep_connect', force: true }),
            30_000,
            'onboarding_sleep_connect_sync',
          ).catch((error: any) => ({
            sleepSynced: false,
            activitySynced: false,
            syncedAt: null,
            debug: {
              serviceAvailable: false,
              hasPermissions: false,
              sleepDataFound: false,
              sleepWriteAttempts: 0,
              sleepWriteSuccesses: 0,
              saveError: error?.message ?? 'Sync failed before Supabase write.',
            },
          }));
          await reconcileStoredIntegrationStatuses({ force: true, allowManualReconnect: true }).catch(() => {});
          await qc.invalidateQueries({ queryKey: ['sleep:last'] });
          await qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] });
          await qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] });
          if (isSleepSyncHardFailure(syncResult)) {
            Alert.alert('Connected, but sleep sync failed', getSleepSyncFailureMessage(syncResult));
          } else if (!syncResult.sleepSynced) {
            Alert.alert('Connected', 'Connected successfully. No new sleep sessions were imported yet.');
          } else {
            Alert.alert('Connected', `${title} connected and sleep synced.`);
          }
          await refreshIntegrations();
        } else {
          Alert.alert(title, result?.message ?? 'Unable to connect.');
        }
      } catch (e: any) {
        Alert.alert('Connection failed', e?.message ?? 'Unable to connect to the provider.');
      }
    },
    [connectIntegration, integrations, refreshIntegrations, qc],
  );

  const handleDisconnectIntegration = useCallback(
    async (id: IntegrationId) => {
      const title = integrations.find((item) => item.id === id)?.title ?? 'Provider';
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
              await refreshIntegrations();
            } catch (e: any) {
              Alert.alert('Disconnect failed', e?.message ?? 'Unable to disconnect the provider.');
            }
          },
        },
      ]);
    },
    [disconnectIntegration, integrations, refreshIntegrations],
  );

  const goNext = () => navigation.replace('Finish');

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginBottom: 16, alignSelf: 'flex-start' }}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
            Connect sleep
          </Text>
          <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
            Choose how you want to bring in sleep: connect data or log manually.
          </Text>

          {integrationsError ? (
            <Text style={{ marginBottom: 12, color: theme.colors.error }}>
              {(integrationsError as any)?.message ?? 'Unable to load integrations.'}
            </Text>
          ) : null}
          <View style={{ marginBottom: 24 }}>
            {integrationsLoading ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Checking available integrations…</Text>
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
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <Button mode="outlined" onPress={goNext} style={{ marginBottom: 12 }}>
          Log manually
        </Button>

        <Button mode="text" onPress={goNext}>
          Do later
        </Button>
      </View>
    </View>
  );
}
