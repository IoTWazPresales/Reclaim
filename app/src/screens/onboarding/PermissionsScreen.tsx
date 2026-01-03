import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useNotifications, requestPermission as requestNotiPermission } from '@/hooks/useNotifications';
import { setHasOnboarded } from '@/state/onboarding';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import { InformationalCard, SectionHeader } from '@/components/ui';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import {
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';

export default function PermissionsScreen() {
  const theme = useTheme();
  const [notiGranted, setNotiGranted] = useState(false);
  const [preferredIntegrationId, setPreferredIntegrationId] = useState<IntegrationId | null>(null);

  useNotifications(); // ensure channels/categories exist

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

  const connectedIntegrations = useMemo(
    () => integrations.filter((item) => item.status?.connected),
    [integrations],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preferred = await getPreferredIntegration();
      if (!cancelled) setPreferredIntegrationId(preferred);
    })();
    return () => {
      cancelled = true;
    };
  }, [integrations]);

  async function enableNotifications() {
    const ok = await requestNotiPermission();
    setNotiGranted(!!ok);
    if (!ok) Alert.alert('Notifications', 'Permission was not granted.');
  }

  const isConnectingIntegration = (id: IntegrationId) =>
    connectIntegrationPending && connectingId === id;
  const isDisconnectingIntegration = (id: IntegrationId) =>
    disconnectIntegrationPending && disconnectingId === id;

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
          // Provider priority: Health Connect recommended on Android (auto-prefer when connected here)
          if (id === 'health_connect') {
            await setPreferredIntegration('health_connect');
            setPreferredIntegrationId('health_connect');
          }
          Alert.alert('Connected', `${title} connected successfully.`);
          refreshIntegrations();
        } else {
          Alert.alert(title, result?.message ?? 'Unable to connect.');
        }
      } catch (e: any) {
        Alert.alert('Connection failed', e?.message ?? 'Unable to connect to the provider.');
      }
    },
    [connectIntegration, integrations, refreshIntegrations],
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
              Alert.alert('Disconnected', `${title} disconnected.`);
              refreshIntegrations();
            } catch (e: any) {
              Alert.alert('Disconnect failed', e?.message ?? 'Unable to disconnect the provider.');
            }
          },
        },
      ]);
    },
    [disconnectIntegration, integrations, refreshIntegrations],
  );

  async function finish() {
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { error } = await supabase.from('profiles')
          .update({ has_onboarded: true })
          .eq('id', user.id);
        if (error) {
          logger.warn('Failed to update has_onboarded in profiles:', error);
        }
      }
    } catch (e: any) {
      logger.warn('Error updating profile:', e);
    }

    // Update local cache
    await setHasOnboarded(userId, true);
    
    // Trigger RootNavigator to re-check onboarding status
    if ((globalThis as any).__refreshOnboarding) {
      (globalThis as any).__refreshOnboarding();
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, justifyContent: 'center' }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12, color: theme.colors.onSurface }}>
        Permissions
      </Text>
      <Text style={{ opacity: 0.7, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
        Notifications help with reminders. Health data enables personalized features based on sleep, activity, and vitals.
      </Text>

      <View style={{ marginBottom: 16 }}>
        <SectionHeader title="Notifications" icon="bell-outline" />
        <InformationalCard icon="bell-outline">
          <Text style={{ color: theme.colors.onSurface, opacity: 0.9 }}>
            Enable notifications so we can send reminders and nudges when they matter.
          </Text>
          <TouchableOpacity
            onPress={enableNotifications}
            style={{
              backgroundColor: theme.colors.primary,
              padding: 14,
              borderRadius: 12,
              marginTop: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
              {notiGranted ? 'Notifications enabled ✓' : 'Enable notifications'}
            </Text>
          </TouchableOpacity>
        </InformationalCard>
      </View>

      <View style={{ marginBottom: 16 }}>
        <SectionHeader
          title="Health providers"
          icon="link-variant"
          caption="Recommended: Health Connect (Android)"
        />
        <InformationalCard icon="information-outline">
          <Text style={{ color: theme.colors.onSurface, opacity: 0.9 }}>
            Connect your preferred provider. You can change this later in Integrations.
          </Text>
          {integrationsError ? (
            <Text style={{ marginTop: 10, color: theme.colors.error }}>
              {(integrationsError as any)?.message ?? 'Unable to load integrations.'}
            </Text>
          ) : null}
          <View style={{ marginTop: 12 }}>
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
          <Text style={{ marginTop: 10, color: theme.colors.onSurfaceVariant }}>
            {connectedIntegrations.length
              ? `Connected: ${connectedIntegrations.map((p) => p.title).join(', ')}`
              : 'No provider connected yet.'}
          </Text>
        </InformationalCard>
      </View>

      <TouchableOpacity
        onPress={finish}
        style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>Finish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
