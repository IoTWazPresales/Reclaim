import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { IntegrationId } from '@/lib/health/integrationStore';
import type { IntegrationWithStatus } from '@/lib/health/integrations';

type Props = {
  items: IntegrationWithStatus[];
  onConnect: (id: IntegrationId) => Promise<void>;
  isConnecting?: (id: IntegrationId) => boolean;
};

export function HealthIntegrationList({ items, onConnect, isConnecting }: Props) {
  return (
    <View style={styles.container}>
      {items.map((item) => {
        const connected = !!item.status?.connected;
        const busy = isConnecting?.(item.id) ?? false;
        const disabled = !item.supported || busy;

        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.row,
              connected ? styles.rowConnected : undefined,
              disabled ? styles.rowDisabled : undefined,
            ]}
            onPress={() => onConnect(item.id)}
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
              <Text style={[styles.status, connected ? styles.statusConnected : styles.statusIdle]}>
                {connected ? 'Connected' : item.supported ? 'Tap to connect' : 'Unavailable'}
              </Text>
            </View>
            {busy ? <ActivityIndicator size="small" color="#0ea5e9" /> : null}
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
    opacity: 0.5,
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
});


