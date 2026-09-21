import React, { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { getPrivacyOperationOwner, subscribePrivacyOperation } from '@/lib/privacyOperation';

/** Do not expose Auth/new sign-in until the previous account's cleanup finishes. */
export function PrivacyOperationGate({ children }: { children: React.ReactNode }) {
  const owner = useSyncExternalStore(subscribePrivacyOperation, getPrivacyOperationOwner, getPrivacyOperationOwner);
  const theme = useTheme();
  if (!owner) return <>{children}</>;
  return (
    <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}
      accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
      <ActivityIndicator accessibilityLabel="Data request in progress" />
      <Text style={{ marginTop: 16, textAlign: 'center' }}>Finishing your data request. Please keep Reclaim open.</Text>
    </View>
  );
}
