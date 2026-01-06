// Diagnostics Screen - Dev-only debugging information
import React, { useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, Button, Card, Divider, useTheme } from 'react-native-paper';
import { useAuth } from '@/providers/AuthProvider';
import { getHasOnboarded } from '@/state/onboarding';
import { getNotificationDiagnostics } from '@/lib/notifications/NotificationScheduler';
import { getBadgeCount } from '@/lib/notifications/BadgeManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DiagnosticsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const onboardingFlag = userId ? await getHasOnboarded(userId) : false;
      const notifDiag = await getNotificationDiagnostics();
      const badgeCount = await getBadgeCount();
      const allKeys = await AsyncStorage.getAllKeys();
      const reclaimKeys = allKeys.filter((k) => k.startsWith('@reclaim/') || k.includes('notifications'));

      setDiagnostics({
        userId,
        onboardingCompleted: onboardingFlag,
        notifications: notifDiag,
        badgeCount,
        reclaimKeys,
      });
    } catch (error: any) {
      setDiagnostics({ error: error?.message || 'Failed to load diagnostics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  if (!__DEV__) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
        <Text>Diagnostics screen only available in development mode.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '700' }}>
          Diagnostics
        </Text>

        <Button mode="contained" onPress={loadDiagnostics} loading={loading} style={{ marginBottom: 16 }}>
          Refresh
        </Button>

        {diagnostics && (
          <>
            <Card mode="outlined" style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '700' }}>
                  User & Onboarding
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>User ID:</Text> {diagnostics.userId || 'Not logged in'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Onboarding Completed:</Text>{' '}
                  {diagnostics.onboardingCompleted ? 'Yes' : 'No'}
                </Text>
              </Card.Content>
            </Card>

            <Card mode="outlined" style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '700' }}>
                  Notifications
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Badge Count:</Text> {diagnostics.badgeCount}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Scheduled Count:</Text>{' '}
                  {diagnostics.notifications?.scheduledCount ?? 'N/A'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Last Fingerprint:</Text>{' '}
                  {diagnostics.notifications?.lastFingerprint || 'None'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600' }}>Last Scheduled:</Text>{' '}
                  {diagnostics.notifications?.lastScheduled
                    ? new Date(diagnostics.notifications.lastScheduled).toLocaleString()
                    : 'Never'}
                </Text>

                <Divider style={{ marginVertical: 8 }} />

                <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '600' }}>
                  Scheduled Notifications:
                </Text>
                {diagnostics.notifications?.scheduled?.length > 0 ? (
                  diagnostics.notifications.scheduled.map((n: any, idx: number) => (
                    <View key={idx} style={{ marginBottom: 8, paddingLeft: 8 }}>
                      <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                        {n.logicalKey || 'unknown'}: {n.title}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'monospace' }}>
                        ID: {n.identifier}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    No scheduled notifications
                  </Text>
                )}
              </Card.Content>
            </Card>

            <Card mode="outlined" style={{ marginBottom: 16 }}>
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '700' }}>
                  AsyncStorage Keys
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Reclaim-related keys ({diagnostics.reclaimKeys?.length || 0}):
                </Text>
                {diagnostics.reclaimKeys?.map((key: string, idx: number) => (
                  <Text key={idx} variant="bodySmall" style={{ fontFamily: 'monospace', marginBottom: 2 }}>
                    • {key}
                  </Text>
                ))}
              </Card.Content>
            </Card>

            {diagnostics.error && (
              <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: theme.colors.errorContainer }}>
                <Card.Content>
                  <Text variant="titleSmall" style={{ color: theme.colors.error, marginBottom: 8 }}>
                    Error
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
                    {diagnostics.error}
                  </Text>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
