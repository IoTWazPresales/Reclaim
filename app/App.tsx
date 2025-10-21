// C:\Reclaim\app\App.tsx
import * as Notifications from 'expo-notifications';

// Foreground notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowBanner: true,
      shouldShowList: true,
      // legacy field for older SDKs (safe to keep)
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as any),
});

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/AuthProvider';
import RootNavigator from '@/routing/RootNavigator';

const qc = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
