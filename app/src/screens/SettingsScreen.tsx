import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { RecoveryResetModal } from '@/components/RecoveryResetModal';

import {
  loadSleepSettings,
  saveSleepSettings,
  type SleepSettings,
} from '@/lib/sleepSettings';

import {
  ensureNotificationPermission,
  scheduleMoodCheckinReminders,
  cancelMoodCheckinReminders,
  scheduleBedtimeSuggestion,
  scheduleMorningConfirm,
  cancelAllReminders,
} from '@/hooks/useNotifications';

import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { listMeds, type Med, getCurrentUser } from '@/lib/api';
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
} from '@/lib/notificationPreferences';
import {
  getRecoveryProgress,
  resetRecoveryProgress,
  RECOVERY_STAGES,
  getStageById,
  setRecoveryType,
  setRecoveryWeek,
  type RecoveryStageId,
  type RecoveryType,
} from '@/lib/recovery';
import { getUserSettings, updateUserSettings } from '@/lib/userSettings';
import {
  enableBackgroundHealthSync,
  disableBackgroundHealthSync,
  BACKGROUND_HEALTH_SYNC_TASK,
} from '@/lib/backgroundSync';
// Ensure task is defined before enabling
import '@/lib/backgroundSync';
import { logTelemetry } from '@/lib/telemetry';
import { setProviderOnboardingComplete } from '@/state/providerPreferences';
import {
  scheduleRefillReminders,
  cancelRefillReminders,
  rescheduleRefillRemindersIfEnabled,
} from '@/lib/refillReminders';
import { exportUserData, deleteAllPersonalData } from '@/lib/dataPrivacy';
import { signOut } from '@/lib/auth';
import { useAppUpdates, getAppVersionInfo } from '@/hooks/useAppUpdates';
import type { DrawerParamList } from '@/navigation/types';

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 10 }}>{children}</View>;
}

export default function SettingsScreen() {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  
  // App update checking
  const { isUpdateAvailable, isUpdatePending, isChecking, checkForUpdates, applyUpdate, currentUpdateInfo } = useAppUpdates();
  const versionInfo = getAppVersionInfo();

  // Sleep settings
  const settingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
  });

  // Local form state
  const [desiredWake, setDesiredWake] = useState('');
  const [typicalWake, setTypicalWake] = useState('');
  const [targetSleep, setTargetSleep] = useState('480'); // minutes

  useEffect(() => {
    if (!settingsQ.data) return;
    setDesiredWake(settingsQ.data.desiredWakeHHMM ?? '');
    setTypicalWake(settingsQ.data.typicalWakeHHMM ?? '07:00');
    setTargetSleep(String(settingsQ.data.targetSleepMinutes ?? 480));
  }, [settingsQ.data?.desiredWakeHHMM, settingsQ.data?.typicalWakeHHMM, settingsQ.data?.targetSleepMinutes]);

  const notifPrefsQ = useQuery<NotificationPreferences>({
    queryKey: ['notifications:prefs'],
    queryFn: getNotificationPreferences,
  });

  const authUserQ = useQuery({
    queryKey: ['auth:user'],
    queryFn: getCurrentUser,
  });

  const recoveryQ = useQuery({
    queryKey: ['recovery:progress'],
    queryFn: getRecoveryProgress,
  });

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const currentStage = useMemo(
    () => getStageById((recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId),
    [recoveryQ.data?.currentStageId],
  );
  const completedStages = useMemo(
    () => new Set(recoveryQ.data?.completedStageIds ?? []),
    [recoveryQ.data?.completedStageIds],
  );

  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState(String(DEFAULT_NOTIFICATION_PREFS.snoozeMinutes));

  useEffect(() => {
    if (!notifPrefsQ.data) return;
    setQuietStart(notifPrefsQ.data.quietStartHHMM ?? '');
    setQuietEnd(notifPrefsQ.data.quietEndHHMM ?? '');
    setSnoozeMinutes(String(notifPrefsQ.data.snoozeMinutes ?? DEFAULT_NOTIFICATION_PREFS.snoozeMinutes));
  }, [notifPrefsQ.data?.quietStartHHMM, notifPrefsQ.data?.quietEndHHMM, notifPrefsQ.data?.snoozeMinutes]);

  // Meds (for bulk reschedule)
  const medsQ = useQuery({
    queryKey: ['meds'],
    queryFn: () => listMeds(),
  });
  const { scheduleForMed } = useMedReminderScheduler();

  // Save sleep settings
  const saveMut = useMutation({
    mutationFn: async () => {
      const next = await saveSleepSettings({
        desiredWakeHHMM: desiredWake?.trim() || undefined,
        typicalWakeHHMM: typicalWake?.trim() || '07:00',
        targetSleepMinutes: Math.max(60, Math.min(720, parseInt(targetSleep || '480', 10) || 480)),
      });
      return next;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep:settings'] });
      Alert.alert('Saved', 'Sleep settings updated.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save settings'),
  });

  const saveNotificationPrefsMut = useMutation({
    mutationFn: async () => {
      const quietStartValue = quietStart.trim() ? quietStart.trim() : null;
      const quietEndValue = quietEnd.trim() ? quietEnd.trim() : null;
      const snoozeValue = Math.max(1, Math.min(240, parseInt(snoozeMinutes || '10', 10) || 10));
      const saved = await setNotificationPreferences({
        quietStartHHMM: quietStartValue,
        quietEndHHMM: quietEndValue,
        snoozeMinutes: snoozeValue,
      });
      return saved;
    },
    onSuccess: (prefs) => {
      qc.setQueryData(['notifications:prefs'], prefs);
      Alert.alert('Saved', 'Notification preferences updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to save notification preferences');
    },
  });

  const [recoveryResetModalVisible, setRecoveryResetModalVisible] = useState(false);

  const resetRecoveryMut = useMutation({
    mutationFn: ({ week, recoveryType, custom }: { week?: number; recoveryType?: RecoveryType; custom?: string }) =>
      resetRecoveryProgress(week, recoveryType, custom),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recovery:progress'] });
      Alert.alert('Reset', 'Recovery progress reset. You can start fresh anytime.');
      await logTelemetry({ name: 'recovery_reset' });
      setRecoveryResetModalVisible(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to reset recovery progress');
    },
  });

  const updateSettingsMut = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: (settings) => {
      qc.setQueryData(['user:settings'], settings);
      void logTelemetry({
        name: 'user_settings_updated',
        properties: settings,
      });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to update settings');
    },
  });

  const handleBackgroundSyncToggle = useCallback(
    async (value: boolean) => {
      if (Platform.OS === 'web') {
        Alert.alert('Unavailable', 'Background sync is not supported on the web.');
        return;
      }
      try {
        if (value) {
          await enableBackgroundHealthSync();
        } else {
          await disableBackgroundHealthSync();
        }
        await updateSettingsMut.mutateAsync({ backgroundSyncEnabled: value });
      } catch (error: any) {
        Alert.alert(
          'Background Sync',
          error?.message ?? 'Failed to update background sync preference.',
        );
      void logTelemetry({
        name: 'background_sync_toggle_failed',
        severity: 'error',
        properties: {
          desiredState: value,
          message: error?.message ?? String(error),
        },
      });
      }
    },
    [updateSettingsMut],
  );

  const handleRefillToggle = useCallback(
    async (value: boolean) => {
      try {
        if (value) {
          const meds = await listMeds();
          await scheduleRefillReminders(meds);
        } else {
          await cancelRefillReminders();
        }
        await updateSettingsMut.mutateAsync({ refillRemindersEnabled: value });
        await logTelemetry({
          name: 'refill_reminders_toggle',
          properties: { enabled: value },
        });
      } catch (error: any) {
        Alert.alert(
          'Refill reminders',
          error?.message ?? 'Failed to update refill reminder preference.',
        );
      }
    },
    [updateSettingsMut],
  );

  const handleExportData = useCallback(async () => {
    try {
      const fileUri = await exportUserData();
      await logTelemetry({ name: 'data_export', properties: { fileUri } });
      Alert.alert(
        'Export ready',
        'Your data export was generated. Check the share sheet or files app for the JSON file.',
      );
    } catch (error: any) {
      Alert.alert('Export failed', error?.message ?? 'Unable to export your data at this time.');
    }
  }, []);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Delete all data',
      'This will permanently remove your medications, logs, mood history, sleep data, and mindfulness records. You will be signed out and this action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllPersonalData();
              qc.clear();
              await logTelemetry({ name: 'data_delete' });
              Alert.alert(
                'Data deleted',
                'Your personal data has been removed. Sign in again to start fresh.',
              );
            } catch (error: any) {
              Alert.alert('Delete failed', error?.message ?? 'Unable to delete your data.');
            }
          },
        },
      ],
    );
  }, [qc]);

  const logoutMut = useMutation({
    mutationFn: signOut,
    onSuccess: async (result) => {
      if (!result.success) {
        Alert.alert('Sign out failed', result.error?.message ?? 'Unable to sign out right now.');
        return;
      }
      await qc.cancelQueries();
      qc.clear();
      Alert.alert('Signed out', 'You have been signed out. Please sign in again to continue.');
    },
    onError: (error: any) => {
      Alert.alert('Sign out failed', error?.message ?? 'Unable to sign out right now.');
    },
  });

  const handleLogout = useCallback(async () => {
    try {
      await logoutMut.mutateAsync();
    } catch {
      // onError already handled user feedback
    }
  }, [logoutMut]);

  const profileName =
    authUserQ.data?.user_metadata?.full_name ||
    authUserQ.data?.user_metadata?.name ||
    authUserQ.data?.email ||
    'Your profile';
  const profileEmail = authUserQ.data?.email ?? 'Signed-in user';

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Card
        mode="elevated"
        style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}
      >
        <Card.Title title={profileName} subtitle={profileEmail} />
        <Card.Content>
          {!!authUserQ.data?.id && (
            <Text variant="bodySmall" style={{ opacity: 0.7, marginBottom: 12 }}>
              User ID: {authUserQ.data.id}
            </Text>
          )}
          <Button
            mode="contained-tonal"
            onPress={handleLogout}
            loading={logoutMut.isPending}
            disabled={logoutMut.isPending}
          >
            Log out
          </Button>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Notifications" />
        <Card.Content>
          <Button
            mode="contained"
            onPress={async () => {
              const ok = await ensureNotificationPermission();
              Alert.alert('Permissions', ok ? 'Granted' : 'Not granted');
            }}
          >
            Request permission
          </Button>

          <Row>
            <Text variant="titleSmall" style={{ marginBottom: 6 }}>
              Quiet hours (leave blank to disable)
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TextInput
                mode="outlined"
                label="Start (HH:MM)"
                value={quietStart}
                onChangeText={setQuietStart}
                keyboardType="numbers-and-punctuation"
                style={{ flex: 1, marginRight: 8 }}
              />
              <TextInput
                mode="outlined"
                label="End (HH:MM)"
                value={quietEnd}
                onChangeText={setQuietEnd}
                keyboardType="numbers-and-punctuation"
                style={{ flex: 1 }}
              />
            </View>
          </Row>

          <Row>
            <Text variant="titleSmall" style={{ marginBottom: 6 }}>
              Snooze duration (minutes)
            </Text>
            <TextInput
              mode="outlined"
              label="Minutes"
              value={snoozeMinutes}
              onChangeText={setSnoozeMinutes}
              keyboardType="number-pad"
            />
          </Row>

          <Row>
            <Button mode="contained" onPress={() => saveNotificationPrefsMut.mutate()}>
              Save notification settings
            </Button>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Button
                mode="contained"
                style={{ marginRight: 10, marginBottom: 8 }}
                onPress={async () => {
                  try {
                    await scheduleMoodCheckinReminders();
                    Alert.alert('Scheduled', 'Mood check-ins at 08:00 and 20:00.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule mood check-ins');
                  }
                }}
              >
                Enable mood check-ins
              </Button>
              <Button
                mode="outlined"
                style={{ marginBottom: 8 }}
                onPress={async () => {
                  try {
                    await cancelMoodCheckinReminders();
                    Alert.alert('Canceled', 'Mood check-ins disabled.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to cancel mood check-ins');
                  }
                }}
              >
                Disable mood check-ins
              </Button>
            </View>
          </Row>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Sleep" />
        <Card.Content>
          <Row>
            <TextInput
              mode="outlined"
              label="Desired wake (HH:MM)"
              value={desiredWake}
              onChangeText={setDesiredWake}
              keyboardType="numbers-and-punctuation"
            />
          </Row>

          <Row>
            <TextInput
              mode="outlined"
              label="Typical wake (HH:MM)"
              value={typicalWake}
              onChangeText={setTypicalWake}
              keyboardType="numbers-and-punctuation"
            />
          </Row>

          <Row>
            <TextInput
              mode="outlined"
              label="Target sleep (minutes)"
              value={targetSleep}
              onChangeText={setTargetSleep}
              keyboardType="number-pad"
            />
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Button
                mode="contained"
                style={{ marginRight: 10, marginBottom: 8, minWidth: 160 }}
                contentStyle={{ paddingVertical: 4 }}
                labelStyle={{ fontSize: 14 }}
                onPress={() => saveMut.mutate()}
              >
                Save sleep settings
              </Button>

              <Button
                mode="outlined"
                style={{ marginBottom: 8 }}
                onPress={async () => {
                  try {
                    const s = settingsQ.data;
                    const wake = s?.typicalWakeHHMM ?? '07:00';
                    const mins = s?.targetSleepMinutes ?? 480;
                    await scheduleBedtimeSuggestion(wake, mins);
                    Alert.alert(
                      'Scheduled',
                      `Bedtime suggestion based on wake ${wake} and ${(mins / 60).toFixed(1)}h target.`,
                    );
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule bedtime');
                  }
                }}
              >
                Schedule bedtime
              </Button>

              <Button
                mode="outlined"
                style={{ marginBottom: 8 }}
                onPress={async () => {
                  try {
                    const s = settingsQ.data;
                    const wake = s?.typicalWakeHHMM ?? '07:00';
                    await scheduleMorningConfirm(wake);
                    Alert.alert('Scheduled', `Morning confirm at ${wake}.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule morning confirm');
                  }
                }}
              >
                Schedule morning confirm
              </Button>
            </View>
          </Row>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Recovery Progress" />
        <Card.Content>
          <Text variant="titleMedium">
            Current stage: {currentStage.title}
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4, opacity: 0.8 }}>
            {currentStage.summary}
          </Text>

          <Button
            mode="outlined"
            style={{ marginTop: 12 }}
            onPress={() => setRecoveryResetModalVisible(true)}
            loading={resetRecoveryMut.isPending}
            disabled={resetRecoveryMut.isPending}
          >
            Reset progress
          </Button>
          <RecoveryResetModal
            visible={recoveryResetModalVisible}
            onDismiss={() => setRecoveryResetModalVisible(false)}
            onConfirm={(week, recoveryType, custom) => {
              resetRecoveryMut.mutate({ week, recoveryType, custom });
            }}
            currentWeek={recoveryQ.data?.currentWeek}
            currentRecoveryType={recoveryQ.data?.recoveryType ?? null}
            currentCustom={recoveryQ.data?.recoveryTypeCustom}
          />
          <Button
            mode="outlined"
            style={{ marginTop: 12 }}
            onPress={async () => {
              await setProviderOnboardingComplete();
              Alert.alert('Tip dismissed', 'Provider priority helper will stay hidden.');
            }}
          >
            Hide provider priority helper
          </Button>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Background health sync</Text>
            <Switch
              value={userSettingsQ.data?.backgroundSyncEnabled ?? false}
              onValueChange={(value: boolean) => handleBackgroundSyncToggle(value)}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Auto-syncs providers about once per hour, even while the app is closed.
          </Text>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Show streak badges</Text>
            <Switch
              value={userSettingsQ.data?.badgesEnabled ?? true}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ badgesEnabled: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Badges highlight mood and medication streaks on the dashboard.
          </Text>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Hide short streaks</Text>
            <Switch
              value={userSettingsQ.data?.hideShortStreaks ?? false}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ hideShortStreaks: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Hide streak badges when current streak is less than 3 days.
          </Text>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Nerd mode</Text>
            <Switch
              value={userSettingsQ.data?.nerdModeEnabled ?? false}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ nerdModeEnabled: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Show receptor and element tags on insights (educational only).
          </Text>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Scientific insights</Text>
            <Switch
              value={userSettingsQ.data?.scientificInsightsEnabled ?? true}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ scientificInsightsEnabled: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Toggle the contextual science nudges on the home and mood screens.
          </Text>

          <Button
            mode="outlined"
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            onPress={() => navigation.navigate('EvidenceNotes')}
          >
            View evidence notes
          </Button>

          <View
            style={{
              marginTop: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Haptics</Text>
            <Switch
              value={userSettingsQ.data?.hapticsEnabled ?? true}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ hapticsEnabled: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Light feedback for mood taps, quick meds, and successful syncs. Respects reduced-motion settings.
          </Text>

          <View
            style={{
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="bodyMedium">Reminder chime</Text>
            <Switch
              value={userSettingsQ.data?.notificationChimeEnabled ?? true}
              onValueChange={(value: boolean) => updateSettingsMut.mutate({ notificationChimeEnabled: value })}
            />
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            Plays a soft chime for scheduled reminders. Off = silent (still respects system mute/DND).
          </Text>

          <Text variant="titleSmall" style={{ marginTop: 16 }}>
            Stage roadmap
          </Text>

          {RECOVERY_STAGES.map((stage) => {
            const isCurrent = stage.id === currentStage.id;
            const isDone = completedStages.has(stage.id);
            return (
              <View key={stage.id} style={{ marginTop: 12 }}>
                <Text
                  variant="bodyLarge"
                  style={{
                    fontWeight: isCurrent ? '700' : '600',
                    color: isCurrent ? theme.colors.primary : theme.colors.onSurface,
                  }}
                >
                  {stage.title} {isCurrent ? '• Current' : isDone ? '• Complete' : ''}
                </Text>
                <Text variant="bodySmall" style={{ opacity: 0.75, marginTop: 4 }}>
                  {stage.summary}
                </Text>
                <View style={{ marginTop: 6, marginLeft: 12 }}>
                  {stage.focus.map((item) => (
                    <Text key={item} variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
                      • {item}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Med Reminders" />
        <Card.Content>
          <Row>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyMedium">Refill reminders</Text>
              <Switch
                value={userSettingsQ.data?.refillRemindersEnabled ?? false}
                onValueChange={handleRefillToggle}
              />
            </View>
            <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
              Sends a weekly reminder before your earliest dose day to confirm medication supply.
            </Text>
          </Row>

          <Row>
            <Button
              mode="outlined"
              onPress={async () => {
                await rescheduleRefillRemindersIfEnabled();
                Alert.alert('Refill reminders', 'Re-scheduled refill reminders if enabled.');
              }}
            >
              Reschedule refill reminders
            </Button>
          </Row>

          <Row>
            <Button
              mode="contained"
              onPress={async () => {
                try {
                  const meds = (medsQ.data as Med[] | undefined) ?? [];
                  if (!meds.length) {
                    Alert.alert('No meds', 'Add a medication first.');
                    return;
                  }
                  let count = 0;
                  for (const m of meds) {
                    await scheduleForMed(m);
                    count++;
                  }
                  Alert.alert(
                    'Scheduled',
                    `Refreshed next 24h reminders for ${count} med${count === 1 ? '' : 's'}.`,
                  );
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule med reminders');
                }
              }}
            >
              Reschedule next 24h
            </Button>
          </Row>

          <Row>
            <Button
              mode="outlined"
              onPress={async () => {
                await cancelAllReminders();
                Alert.alert('Cleared', 'All scheduled notifications canceled.');
              }}
            >
              Cancel all notifications
            </Button>
          </Row>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Data & Privacy" />
        <Card.Content>
          <Row>
            <Button mode="contained" onPress={handleExportData}>
              Export my data
            </Button>
          </Row>

          <Row>
            <Button mode="outlined" onPress={handleDeleteData} textColor={theme.colors.error}>
              Delete all personal data
            </Button>
          </Row>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="About" />
        <Card.Content>
          <Row>
            <Text variant="titleMedium">Version</Text>
            <Text variant="bodyMedium" style={{ marginTop: 4 }}>
              {versionInfo.version} (Build {versionInfo.buildNumber})
            </Text>
            {versionInfo.runtimeVersion && (
              <Text variant="bodySmall" style={{ marginTop: 2, opacity: 0.7 }}>
                Runtime: {versionInfo.runtimeVersion} • Channel: {versionInfo.channel}
              </Text>
            )}
            {isUpdatePending && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: theme.colors.primaryContainer, borderRadius: 8 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginBottom: 8 }}>
                  Update downloaded! Restart the app to apply.
                </Text>
                <Button
                  mode="contained"
                  onPress={async () => {
                    try {
                      await applyUpdate();
                    } catch (error: any) {
                      Alert.alert('Update Failed', error?.message ?? 'Failed to apply update. Please restart manually.');
                    }
                  }}
                >
                  Restart & Apply Update
                </Button>
              </View>
            )}
            {isUpdateAvailable && !isUpdatePending && (
              <View style={{ marginTop: 8 }}>
                <Text variant="bodySmall" style={{ marginBottom: 8, opacity: 0.7 }}>
                  Update available
                </Text>
                <Button
                  mode="outlined"
                  loading={isChecking}
                  disabled={isChecking}
                  onPress={checkForUpdates}
                >
                  {isChecking ? 'Checking...' : 'Check for Updates'}
                </Button>
              </View>
            )}
          </Row>

          {!isUpdateAvailable && !isUpdatePending && versionInfo.isUpdateEnabled && (
            <Row>
              <Button
                mode="text"
                loading={isChecking}
                disabled={isChecking}
                onPress={checkForUpdates}
              >
                {isChecking ? 'Checking for updates...' : 'Check for Updates'}
              </Button>
            </Row>
          )}

          <Row>
            <Button
              mode="outlined"
              onPress={() => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('https://apps.apple.com/app/reclaim').catch(() => {});
                } else {
                  Linking.openURL('https://play.google.com/store/apps/details?id=com.yourcompany.reclaim').catch(() => {});
                }
              }}
            >
              Rate App
            </Button>
          </Row>

          <Row>
            <Button
              mode="text"
              onPress={() => {
                Linking.openURL('https://your-domain.com/privacy-policy').catch(() => {
                  Alert.alert('Privacy Policy', 'Privacy policy URL not configured. Please contact support.');
                });
              }}
            >
              Privacy Policy
            </Button>
          </Row>

          <Row>
            <Button
              mode="text"
              onPress={() => {
                Linking.openURL('https://your-domain.com/terms-of-service').catch(() => {
                  Alert.alert('Terms of Service', 'Terms of service URL not configured. Please contact support.');
                });
              }}
            >
              Terms of Service
            </Button>
          </Row>

          <Row>
            <Button
              mode="text"
              onPress={() => {
                const subject = encodeURIComponent('Reclaim Beta Feedback');
                const body = encodeURIComponent(
                  `App Version: ${Constants.expoConfig?.version ?? '1.0.0'}\n` +
                  `Platform: ${Platform.OS} ${Platform.Version}\n` +
                  `Device: ${Constants.deviceName ?? 'Unknown'}\n\n` +
                  `Please describe your feedback or issue:\n\n`
                );
                Linking.openURL(`mailto:feedback@your-domain.com?subject=${subject}&body=${body}`).catch(() => {
                  Alert.alert('Send Feedback', 'Email client not available. Please contact feedback@your-domain.com');
                });
              }}
            >
              Send Feedback
            </Button>
          </Row>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16, marginTop: 16, marginBottom: 24, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Platform" />
        <Card.Content>
          <Text variant="bodyMedium">
            {Platform.OS === 'android'
              ? 'Android with Google Fit sleep support.'
              : 'iOS — Apple HealthKit sleep import.'}
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
