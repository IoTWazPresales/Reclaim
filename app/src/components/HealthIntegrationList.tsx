import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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
                color={connected ? '#10b981' : '#0ea5e9'}
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
            {spinnerVisible ? <ActivityIndicator size="small" color="#0ea5e9" /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  rowConnected: {
    borderColor: '#10b98130',
    backgroundColor: '#ecfdf5',
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
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  status: {
    fontSize: 12,
    marginTop: 6,
  },
  statusConnected: {
    color: '#047857',
    fontWeight: '600',
  },
  statusIdle: {
    color: '#2563eb',
  },
  errorText: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  preferredButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  preferredButtonText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  emptyContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});
