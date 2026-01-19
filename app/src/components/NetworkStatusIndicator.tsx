import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAppTheme } from '@/theme';

/**
 * Small indicator component to show network status
 * Displays a subtle banner when offline
 */
export function NetworkStatusIndicator() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const theme = useAppTheme();

  // Only show when offline or internet unreachable
  if (isConnected && isInternetReachable) {
    return null;
  }

  const statusText = !isConnected 
    ? 'No connection' 
    : !isInternetReachable 
    ? 'No internet access' 
    : 'Connection issues';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.errorContainer || '#ffebee',
          borderTopColor: theme.colors.error || '#c62828',
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: theme.colors.onErrorContainer || '#c62828',
          },
        ]}
      >
        {statusText} • Some features may be unavailable
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

