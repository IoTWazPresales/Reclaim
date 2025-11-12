import React, { useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';

import { useHealthIntegrationsList } from '@/hooks/useHealthIntegrationsList';
import type { IntegrationId } from '@/lib/health/integrationStore';

export default function IntegrationsScreen() {
  const theme = useTheme();
  const {
    integrations,
    integrationsLoading,
    connectIntegration,
    disconnectIntegration,
    connectIntegrationPending,
    disconnectIntegrationPending,
    connectingId,
    disconnectingId,
    refreshIntegrations,
  } = useHealthIntegrationsList();

  const StatusChip = useMemo(
    () =>
      function StatusChipComponent({
        connected,
        lastConnectedAt,
        lastError,
        supported,
      }: {
        connected?: boolean;
        lastConnectedAt?: string;
        lastError?: string | null;
        supported: boolean;
      }) {
        let text = 'Not connected';
        let color = theme.colors.onSurfaceVariant;

        if (!supported) {
          text = 'Unsupported on this device';
          color = theme.colors.error;
        } else if (connected) {
          text = lastConnectedAt
            ? `Connected • ${formatDistanceToNow(new Date(lastConnectedAt), { addSuffix: true })}`
            : 'Connected';
          color = theme.colors.primary;
        } else if (lastError) {
          text = `Error • ${lastError}`;
          color = theme.colors.error;
        }

        return (
          <Chip
            icon={connected ? 'check-circle' : lastError ? 'alert-circle' : 'information'}
            style={{ backgroundColor: theme.colors.surfaceVariant }}
            textStyle={{ color }}
          >
            {text}
          </Chip>
        );
      },
    [theme.colors.error, theme.colors.onSurfaceVariant, theme.colors.primary, theme.colors.surfaceVariant],
  );

  const renderActions = (integrationId: IntegrationId, connected: boolean, supported: boolean) => {
    if (!supported) {
      return (
        <Button
          mode="outlined"
          onPress={() =>
            Alert.alert(
              'Integration unavailable',
              'This connector is not supported on your current platform yet.',
            )
          }
        >
          Learn more
        </Button>
      );
    }

    const isConnecting = connectIntegrationPending && connectingId === integrationId;
    const isDisconnecting = disconnectIntegrationPending && disconnectingId === integrationId;

    if (connected) {
      return (
        <Button
          mode="outlined"
          onPress={async () => {
            try {
              await disconnectIntegration(integrationId);
            } catch (error: any) {
              Alert.alert('Disconnect failed', error?.message ?? 'Unable to disconnect right now.');
            }
          }}
          loading={isDisconnecting}
        >
          Disconnect
        </Button>
      );
    }

    return (
      <Button
        mode="contained"
        onPress={async () => {
          try {
            const result = await connectIntegration(integrationId);
            if (!result?.result?.success && result?.result?.message) {
              Alert.alert('Connection', result.result.message);
            }
          } catch (error: any) {
            Alert.alert('Connection failed', error?.message ?? 'Unable to connect right now.');
          }
        }}
        loading={isConnecting}
      >
        Connect
      </Button>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headlineSmall">Health Integrations</Text>
        <IconButton
          icon="refresh"
          size={24}
          onPress={refreshIntegrations}
          accessibilityLabel="Refresh integrations"
        />
      </View>
      <Text variant="bodyMedium" style={{ marginBottom: 16, opacity: 0.7 }}>
        Connect the health data sources you rely on. Reclaim prioritises the first connected provider
        when multiple are available.
      </Text>

      {integrationsLoading ? (
        <Card mode="elevated">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12 }}>Checking integrations…</Text>
          </Card.Content>
        </Card>
      ) : integrations.length === 0 ? (
        <Card mode="elevated">
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <MaterialCommunityIcons name="cloud-question" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={{ marginTop: 16, textAlign: 'center' }}>
              No integrations available yet. Check back soon as we add more options.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        integrations.map((integration, idx) => {
          const { status } = integration;
          const connected = status?.connected === true;

          return (
            <Card
              key={integration.id}
              mode="elevated"
              style={{ marginBottom: 12, borderRadius: 16, overflow: 'hidden' }}
            >
              <Card.Content style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name={integration.icon.name as any}
                    size={28}
                    color={integration.supported ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium">{integration.title}</Text>
                    <Text variant="bodyMedium" style={{ opacity: 0.75 }}>
                      {integration.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <StatusChip
                    connected={connected}
                    lastConnectedAt={status?.lastConnectedAt}
                    lastError={status?.lastError}
                    supported={integration.supported}
                  />
                </View>

                <Divider style={{ marginVertical: 16 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="bodySmall" style={{ flex: 1, opacity: 0.65 }}>
                    {integration.supported
                      ? connected
                        ? 'Disconnect to stop automatic syncing from this provider.'
                        : 'Connect to start syncing sleep, steps, and mood data automatically.'
                      : 'Unavailable on this device.'}
                  </Text>
                  <View style={{ marginLeft: 12 }}>{renderActions(integration.id, connected, integration.supported)}</View>
                </View>
              </Card.Content>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

