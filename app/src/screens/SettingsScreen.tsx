import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Switch, Text, TextInput, useTheme } from 'react-native-paper';

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
import { listMeds, type Med } from '@/lib/api';
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
  type RecoveryStageId,
} from '@/lib/recovery';
import { getUserSettings, updateUserSettings } from '@/lib/userSettings';
import {
  enableBackgroundHealthSync,
  disableBackgroundHealthSync,
} from '@/lib/backgroundSync';
import { logTelemetry } from '@/lib/telemetry';

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 10 }}>{children}</View>;
}

export default function SettingsScreen() {
  const qc = useQueryClient();
  const theme = useTheme();

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

  const resetRecoveryMut = useMutation({
    mutationFn: resetRecoveryProgress,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['recovery:progress'] });
      Alert.alert('Reset', 'Recovery progress cleared. You can start fresh anytime.');
      await logTelemetry({ name: 'recovery_reset' });
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

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      style={{ backgroundColor: theme.colors.background }}
    >
      <Text variant="headlineSmall">Settings</Text>

      <Card mode="elevated" style={{ marginTop: 16 }}>
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

      <Card mode="elevated" style={{ marginTop: 16 }}>
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
                style={{ marginRight: 10, marginBottom: 8 }}
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

      <Card mode="elevated" style={{ marginTop: 16 }}>
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
            onPress={() => resetRecoveryMut.mutate()}
            loading={resetRecoveryMut.isPending}
            disabled={resetRecoveryMut.isPending}
          >
            Reset progress
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

      <Card mode="elevated" style={{ marginTop: 16 }}>
        <Card.Title title="Med Reminders" />
        <Card.Content>
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

      <Card mode="elevated" style={{ marginTop: 16, marginBottom: 24 }}>
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
