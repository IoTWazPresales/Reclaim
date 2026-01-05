import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { HealthIntegrationList } from '@/components/HealthIntegrationList';
import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import {
  getPreferredIntegration,
  setPreferredIntegration,
  type IntegrationId,
} from '@/lib/health/integrationStore';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Sleep'>;

export default function SleepStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
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
