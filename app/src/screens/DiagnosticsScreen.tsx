import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, Button, Card, Divider, useTheme } from 'react-native-paper';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useAppTheme } from '@/theme';
import { reclaimSectionCardShell, reclaimPrimaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { useAuth } from '@/providers/AuthProvider';
import { getHasOnboarded } from '@/state/onboarding';
import { getNotificationDiagnostics } from '@/lib/notifications/NotificationScheduler';
import { getBadgeCount } from '@/lib/notifications/BadgeManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { DrawerParamList } from '@/navigation/types';

export default function DiagnosticsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionShell = useMemo(() => reclaimSectionCardShell(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const isDevOrPreview = __DEV__ || Updates.channel === 'preview';
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

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
        appIdentity: {
          profileGuess: __DEV__ ? 'development' : Updates.channel === 'preview' ? 'preview' : Updates.channel === 'production' ? 'production' : 'unknown',
          channel: Updates.channel ?? null,
          runtimeVersion: Updates.runtimeVersion ?? null,
          updateId: Updates.updateId ?? null,
          createdAt: Updates.createdAt ?? null,
          isEmbeddedLaunch: Updates.isEmbeddedLaunch,
          isEmergencyLaunch: Updates.isEmergencyLaunch,
          isEnabled: Updates.isEnabled,
          appVersion: Constants.expoConfig?.version ?? null,
          androidVersionCode: Constants.expoConfig?.android?.versionCode ?? null,
        },
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

  if (!isDevOrPreview) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: theme.colors.background }}>
        <Text>Diagnostics screen is available only in development/preview builds.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16, fontWeight: '700' }}>
          Diagnostics
        </Text>

        <Button
          mode="contained"
          onPress={loadDiagnostics}
          loading={loading}
          style={[primaryCapsule.style, { marginBottom: 16 }]}
          contentStyle={primaryCapsule.contentStyle}
          labelStyle={primaryCapsule.labelStyle}
        >
          Refresh
        </Button>

        {__DEV__ ? (
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('GuidedTraceViewer')}
            style={{ marginBottom: 16 }}
          >
            Open guided trace viewer
          </Button>
        ) : null}

        {diagnostics?.error && (
          <Card mode="outlined" style={[sectionShell as any, { marginBottom: 16, backgroundColor: theme.colors.errorContainer }]}>
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

        {diagnostics && !diagnostics.error && (
          <>
            <Card mode="outlined" style={[sectionShell as any, { marginBottom: 16 }]}>
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '700' }}>
                  App Identity
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Profile guess:</Text> {diagnostics.appIdentity?.profileGuess ?? 'unknown'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Channel:</Text> {diagnostics.appIdentity?.channel ?? 'unknown'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Runtime version:</Text> {diagnostics.appIdentity?.runtimeVersion ?? 'unknown'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Update ID:</Text> {diagnostics.appIdentity?.updateId ?? 'none'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>OTA enabled:</Text> {diagnostics.appIdentity?.isEnabled ? 'Yes' : 'No'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Embedded launch:</Text>{' '}
                  {diagnostics.appIdentity?.isEmbeddedLaunch ? 'Yes' : 'No'}
                </Text>
                <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: '600' }}>Emergency launch:</Text>{' '}
                  {diagnostics.appIdentity?.isEmergencyLaunch ? 'Yes' : 'No'}
                </Text>
                {diagnostics.appIdentity?.createdAt ? (
                  <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                    <Text style={{ fontWeight: '600' }}>Update created:</Text>{' '}
                    {new Date(diagnostics.appIdentity.createdAt).toLocaleString()}
                  </Text>
                ) : null}
                <Divider style={{ marginVertical: 8 }} />
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

            <Card mode="outlined" style={[sectionShell as any, { marginBottom: 16 }]}>
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

            <Card mode="outlined" style={[sectionShell as any, { marginBottom: 16 }]}>
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

          </>
        )}
      </View>
    </ScrollView>
  );
}
