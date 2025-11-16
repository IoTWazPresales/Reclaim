import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import type { IntegrationId } from '@/lib/health/integrationStore';
import type { IntegrationWithStatus } from '@/lib/health/integrations';

type Props = {
  items: IntegrationWithStatus[];
  onConnect: (id: IntegrationId) => Promise<void>;
  onDisconnect?: (id: IntegrationId) => Promise<void>;
  isConnecting?: (id: IntegrationId) => boolean;
  isDisconnecting?: (id: IntegrationId) => boolean;
  preferredId?: IntegrationId | null;
  onSetPreferred?: (id: IntegrationId) => Promise<void> | void;
};

export function HealthIntegrationList({
  items,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
  preferredId,
  onSetPreferred,
}: Props) {
  const theme = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  if (!items.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No health providers found</Text>
        <Text style={styles.emptySubtitle}>
          Check your build configuration or try refreshing the list.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => {
        const connected = !!item.status?.connected;
        const busy = isConnecting?.(item.id) ?? false;
        const disconnecting = isDisconnecting?.(item.id) ?? false;
        const disabled = connected ? disconnecting : !item.supported || busy;
        const spinnerVisible = busy || disconnecting;
        const lastConnectedLabel =
          connected && item.status?.lastConnectedAt
            ? `Last connected ${formatDistanceToNow(new Date(item.status.lastConnectedAt), {
                addSuffix: true,
              })}`
            : null;
        const isPreferred = preferredId === item.id;

        const handlePress = async () => {
          if (connected) {
            if (onDisconnect) {
              await onDisconnect(item.id);
            }
            return;
          }
          await onConnect(item.id);
        };

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.row,
              connected ? styles.rowConnected : undefined,
              disabled ? styles.rowDisabled : undefined,
            ]}
            onPress={handlePress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name={item.icon.name as any}
                size={24}
                color={connected ? theme.colors.primary : theme.colors.secondary}
              />
            </View>
            <View style={styles.textWrapper}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>
                {item.supported ? item.subtitle : 'Not available on this device'}
              </Text>
              {item.status?.lastError ? (
                <Text style={styles.errorText}>{item.status.lastError}</Text>
              ) : null}
              {lastConnectedLabel ? (
                <Text style={styles.metaText}>{lastConnectedLabel}</Text>
              ) : null}
              <Text style={[styles.status, connected ? styles.statusConnected : styles.statusIdle]}>
                {connected
                  ? disconnecting
                    ? 'Disconnecting…'
                    : isPreferred
                    ? 'Preferred provider • Tap to disconnect'
                    : 'Connected • Tap to disconnect'
                  : item.supported
                  ? busy
                    ? 'Connecting…'
                    : 'Tap to connect'
                  : 'Unavailable'}
              </Text>
              {connected && !isPreferred && onSetPreferred ? (
                <TouchableOpacity
                  onPress={() => onSetPreferred(item.id)}
                  style={styles.preferredButton}
                >
                  <Text style={styles.preferredButtonText}>Set as preferred</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {spinnerVisible ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
      gap: 12,
    },
    rowConnected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceVariant,
    },
    rowDisabled: {
      opacity: 0.6,
    },
    iconWrapper: {
      width: 32,
      alignItems: 'center',
    },
    textWrapper: {
      flex: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    status: {
      fontSize: 12,
      marginTop: 6,
    },
    statusConnected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    statusIdle: {
      color: theme.colors.secondary,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.error,
      marginTop: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    preferredButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    preferredButtonText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    emptyContainer: {
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      borderRadius: 14,
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    emptySubtitle: {
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
  });
}
