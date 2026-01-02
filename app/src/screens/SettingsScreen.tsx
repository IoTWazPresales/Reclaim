// C:\Reclaim\app\src\screens\SettingsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  UIManager,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Divider,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import * as RNPaper from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/ui';
import { RecoveryResetModal } from '@/components/RecoveryResetModal';

import { loadSleepSettings, saveSleepSettings, type SleepSettings } from '@/lib/sleepSettings';

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
  type RecoveryStageId,
  type RecoveryType,
} from '@/lib/recovery';

import { getUserSettings, updateUserSettings } from '@/lib/userSettings';

import { enableBackgroundHealthSync, disableBackgroundHealthSync } from '@/lib/backgroundSync';
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

import { supabase } from '@/lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 10 }}>{children}</View>;
}

function animateToggle() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      180,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  );
}

type ExpandableCardProps = {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  subtitle?: string;
};

function ExpandableCard({
  title,
  icon,
  open,
  onToggle,
  subtitle,
  children,
}: ExpandableCardProps) {
  const theme = useTheme();

  const toggle = () => {
    animateToggle();
    onToggle();
  };

  return (
    <Card
      mode="elevated"
      style={{
        borderRadius: 16,
        marginBottom: 14,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={open ? `Collapse ${title}` : `Expand ${title}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: pressed ? theme.colors.surfaceVariant : theme.colors.surface,
        })}
      >
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceVariant,
              marginRight: 10,
            }}
          >
            <MaterialCommunityIcons name={icon} size={18} color={theme.colors.onSurfaceVariant} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '800' }}>
              {title}
            </Text>
            {!!subtitle && (
              <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>

      {open && (
        <View>
          <Divider />
          <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>{children}</View>
        </View>
      )}
    </Card>
  );
}

type FeedbackKind = 'problem' | 'feature' | 'feedback';

// ✅ These are the params we pass from Drawer → Settings.
// We keep it local/loose so it works even if your navigator types haven't been updated yet.
type SettingsRouteParams = {
  openSection?: 'support' | 'profile' | 'notifications' | 'sleep' | 'recovery' | 'meds' | 'privacy' | 'about';
  openModal?: FeedbackKind;
};

function buildDiagnostics() {
  const v = getAppVersionInfo();
  const nowISO = new Date().toISOString();

  const deviceName =
    (Constants as any)?.deviceName ?? (Constants as any)?.platform?.ios?.model ?? null;

  return {
    timestamp: nowISO,
    app: {
      version: v.version,
      buildNumber: v.buildNumber,
      runtimeVersion: v.runtimeVersion ?? null,
      channel: v.channel ?? null,
    },
    platform: {
      os: Platform.OS,
      osVersion: String(Platform.Version),
    },
    device: {
      name: deviceName,
    },
    expo: {
      sdkVersion: Constants.expoConfig?.sdkVersion ?? null,
    },
  };
}

export default function SettingsScreen() {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

  // ✅ Route params (from Drawer Support tile)
  const route = useRoute();
  const routeParams = ((route as any)?.params ?? {}) as SettingsRouteParams;

  const sectionSpacing = 16;

  // Use Modal via namespace to avoid TS named-export complaints
  // @ts-ignore Modal exists at runtime on react-native-paper
  const PaperModal = (RNPaper as any).Modal;

  const sendTestNotifications = useCallback(async () => {
    try {
      const now = Date.now();
      const items = [
        { title: 'Test Meds reminder', body: 'Time to take your medication.', offset: 10 },
        { title: 'Test Sleep reminder', body: 'Wind down and prepare for sleep.', offset: 12 },
        { title: 'Test Mindfulness', body: 'Take a quick reset.', offset: 14 },
        { title: 'Test Mood check-in', body: 'Log how you feel right now.', offset: 16 },
      ];
      for (const item of items) {
        await Notifications.scheduleNotificationAsync({
          content: { title: item.title, body: item.body },
          trigger: { seconds: item.offset, channelId: undefined } as Notifications.NotificationTriggerInput,
        });
      }
      Alert.alert('Scheduled', 'Test notifications will fire in ~10-16 seconds.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to schedule test notifications.');
    }
  }, []);

  const isDevOrPreview = __DEV__ || (Updates.channel && Updates.channel === 'preview');

  // App update checking
  const { isUpdatePending, isChecking, checkForUpdates, applyUpdate } = useAppUpdates();
  const versionInfo = getAppVersionInfo();

  // ---- expand/collapse state (independent)
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({
    profile: true,
    support: true,
    notifications: false,
    sleep: false,
    recovery: false,
    meds: false,
    privacy: false,
    about: false,
  });

  const setOpenOnly = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next: Record<string, boolean> = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = k === key;
      });
      return next;
    });
  }, []);

  const toggleKey = useCallback((key: string) => {
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Sleep settings
  const settingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
  });

  const [desiredWake, setDesiredWake] = useState<string>('');
  const [typicalWake, setTypicalWake] = useState<string>('');
  const [targetSleep, setTargetSleep] = useState<string>('480');

  useEffect(() => {
    if (!settingsQ.data) return;
    setDesiredWake(settingsQ.data.desiredWakeHHMM ?? '');
    setTypicalWake(settingsQ.data.typicalWakeHHMM ?? '07:00');
    setTargetSleep(String(settingsQ.data.targetSleepMinutes ?? 480));
  }, [
    settingsQ.data?.desiredWakeHHMM,
    settingsQ.data?.typicalWakeHHMM,
    settingsQ.data?.targetSleepMinutes,
  ]);

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

  const [quietStart, setQuietStart] = useState<string>('');
  const [quietEnd, setQuietEnd] = useState<string>('');
  const [snoozeMinutes, setSnoozeMinutes] = useState<string>(
    String(DEFAULT_NOTIFICATION_PREFS.snoozeMinutes),
  );

  useEffect(() => {
    if (!notifPrefsQ.data) return;
    setQuietStart(notifPrefsQ.data.quietStartHHMM ?? '');
    setQuietEnd(notifPrefsQ.data.quietEndHHMM ?? '');
    setSnoozeMinutes(
      String(notifPrefsQ.data.snoozeMinutes ?? DEFAULT_NOTIFICATION_PREFS.snoozeMinutes),
    );
  }, [
    notifPrefsQ.data?.quietStartHHMM,
    notifPrefsQ.data?.quietEndHHMM,
    notifPrefsQ.data?.snoozeMinutes,
  ]);

  // Meds (for bulk reschedule)
  const medsQ = useQuery({
    queryKey: ['meds'],
    queryFn: () => listMeds(),
  });
  const { scheduleForMed } = useMedReminderScheduler();

  // ---- Support & Feedback (logs table)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>('problem');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);

  // ✅ Respond to Drawer → Settings params: open support, optionally open modal.
  useEffect(() => {
    const openSection = routeParams?.openSection;
    const openModal = routeParams?.openModal;

    if (!openSection && !openModal) return;

    if (openSection) {
      // Prefer opening only the requested section (clean UX)
      setOpenOnly(openSection);
    } else if (openModal) {
      // If modal requested without openSection, still open support card
      setOpenOnly('support');
    }

    if (openModal) {
      setFeedbackKind(openModal);
      setFeedbackModalOpen(true);
    }

    // Clear params so it doesn't re-trigger when screen re-renders / goes back
    // This is safe even if your navigator types don't include these params.
    try {
      (navigation as any).setParams({ openSection: undefined, openModal: undefined });
    } catch {
      // ignore
    }
  }, [routeParams?.openSection, routeParams?.openModal, navigation, setOpenOnly]);

  const reportMut = useMutation({
    mutationFn: async (payload: {
      kind: FeedbackKind;
      text: string;
      includeDiagnostics: boolean;
    }) => {
      const userId: string | null = authUserQ.data?.id ?? null;

      const diag = payload.includeDiagnostics
        ? buildDiagnostics()
        : { timestamp: new Date().toISOString() };

      const level =
        payload.kind === 'problem' ? 'error' : payload.kind === 'feature' ? 'info' : 'warn';

      const details = {
        kind: payload.kind,
        note: payload.text,
        ...diag,
      };

      const { error } = await supabase.from('logs').insert({
        level,
        message: 'user_feedback',
        details,
        user_id: userId,
      });

      if (error) throw error;

      await logTelemetry({
        name: 'user_feedback_submitted',
        properties: { kind: payload.kind, includeDiagnostics: payload.includeDiagnostics },
      });
    },
    onSuccess: () => {
      setFeedbackModalOpen(false);
      setFeedbackText('');
      Alert.alert('Sent', 'Thanks — your report was saved.');
    },
    onError: (e: any) => {
      Alert.alert('Failed', e?.message ?? 'Could not submit your report. Check connection / RLS.');
    },
  });

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
    onSuccess: (prefs: NotificationPreferences) => {
      qc.setQueryData(['notifications:prefs'], prefs);
      Alert.alert('Saved', 'Notification preferences updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message ?? 'Failed to save notification preferences');
    },
  });

  const [recoveryResetModalVisible, setRecoveryResetModalVisible] = useState<boolean>(false);

  const resetRecoveryMut = useMutation({
    mutationFn: (args: { week?: number; recoveryType?: RecoveryType; custom?: string }) =>
      resetRecoveryProgress(args.week, args.recoveryType, args.custom),
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
    onSuccess: (settings: any) => {
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
        if (value) await enableBackgroundHealthSync();
        else await disableBackgroundHealthSync();

        await updateSettingsMut.mutateAsync({ backgroundSyncEnabled: value });
      } catch (error: any) {
        Alert.alert('Background Sync', error?.message ?? 'Failed to update background sync preference.');
        void logTelemetry({
          name: 'background_sync_toggle_failed',
          severity: 'error',
          properties: { desiredState: value, message: error?.message ?? String(error) },
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
        await logTelemetry({ name: 'refill_reminders_toggle', properties: { enabled: value } });
      } catch (error: any) {
        Alert.alert('Refill reminders', error?.message ?? 'Failed to update refill reminder preference.');
      }
    },
    [updateSettingsMut],
  );

  const handleExportData = useCallback(async () => {
    try {
      const fileUri = await exportUserData();
      await logTelemetry({ name: 'data_export', properties: { fileUri } });
      Alert.alert('Export ready', 'Your data export was generated. Check the share sheet or files app for the JSON file.');
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
              Alert.alert('Data deleted', 'Your personal data has been removed. Sign in again to start fresh.');
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
    onSuccess: async (result: any) => {
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
      // handled
    }
  }, [logoutMut]);

  const profileName =
    authUserQ.data?.user_metadata?.full_name ||
    authUserQ.data?.user_metadata?.name ||
    authUserQ.data?.email ||
    'Your profile';
  const profileEmail = authUserQ.data?.email ?? 'Signed-in user';

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        style={{ backgroundColor: theme.colors.background }}
      >
        <SectionHeader title="Settings" icon="cog-outline" />

        <ExpandableCard
          title="Profile"
          icon="account-circle-outline"
          open={!!openKeys.profile}
          onToggle={() => toggleKey('profile')}
          subtitle="Account & sign out"
        >
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            {profileName}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
            {profileEmail}
          </Text>

          {!!authUserQ.data?.id && (
            <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 10 }}>
              User ID: {authUserQ.data.id}
            </Text>
          )}

          <Row>
            <Button
              mode="contained-tonal"
              onPress={handleLogout}
              loading={logoutMut.isPending}
              disabled={logoutMut.isPending}
            >
              Log out
            </Button>
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Support & Feedback"
          icon="message-alert-outline"
          open={!!openKeys.support}
          onToggle={() => toggleKey('support')}
          subtitle="Report bugs or suggest features"
        >
          <Text variant="bodySmall" style={{ opacity: 0.75 }}>
            This sends a private report to your Supabase logs table.
          </Text>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Include diagnostics</Text>
              <Switch value={includeDiagnostics} onValueChange={setIncludeDiagnostics} />
            </View>
            <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
              Adds app version/build, platform/OS, and timestamp.
            </Text>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={{ marginRight: 10, marginBottom: 10 }}>
                <Button
                  mode="contained"
                  icon="bug-outline"
                  onPress={() => {
                    setFeedbackKind('problem');
                    setFeedbackModalOpen(true);
                  }}
                >
                  Report a problem
                </Button>
              </View>

              <View style={{ marginRight: 10, marginBottom: 10 }}>
                <Button
                  mode="outlined"
                  icon="lightbulb-on-outline"
                  onPress={() => {
                    setFeedbackKind('feature');
                    setFeedbackModalOpen(true);
                  }}
                >
                  Suggest a feature
                </Button>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Button
                  mode="text"
                  icon="message-text-outline"
                  onPress={() => {
                    setFeedbackKind('feedback');
                    setFeedbackModalOpen(true);
                  }}
                >
                  General feedback
                </Button>
              </View>
            </View>
          </Row>

          <Row>
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              Tip: if something feels “off”, include what you expected vs what happened.
            </Text>
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Notifications"
          icon="bell-outline"
          open={!!openKeys.notifications}
          onToggle={() => toggleKey('notifications')}
          subtitle="Quiet hours, snooze, scheduling"
        >
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
              <View style={{ marginRight: 10, marginBottom: 10 }}>
                <Button
                  mode="contained"
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
              </View>

              <View style={{ marginBottom: 10 }}>
                <Button
                  mode="outlined"
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
            </View>
          </Row>

          <Row>
            <Button
              mode="outlined"
              onPress={async () => {
                try {
                  await cancelAllReminders();
                  Alert.alert('Cleared', 'All scheduled notifications canceled.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to cancel notifications');
                }
              }}
            >
              Cancel all notifications
            </Button>
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Sleep"
          icon="moon-waning-crescent"
          open={!!openKeys.sleep}
          onToggle={() => toggleKey('sleep')}
          subtitle="Wake targets and bedtime helpers"
        >
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
              <View style={{ marginRight: 10, marginBottom: 10 }}>
                <Button mode="contained" onPress={() => saveMut.mutate()}>
                  Save sleep settings
                </Button>
              </View>

              <View style={{ marginRight: 10, marginBottom: 10 }}>
                <Button
                  mode="outlined"
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
              </View>

              <View style={{ marginBottom: 10 }}>
                <Button
                  mode="outlined"
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
            </View>
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Recovery & Preferences"
          icon="heart-pulse"
          open={!!openKeys.recovery}
          onToggle={() => toggleKey('recovery')}
          subtitle="Progress, toggles, background sync"
        >
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            Current stage: {currentStage.title}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.75, marginTop: 4 }}>
            {currentStage.summary}
          </Text>

          <Row>
            <Button
              mode="outlined"
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
          </Row>

          <Row>
            <Button
              mode="outlined"
              onPress={async () => {
                await setProviderOnboardingComplete();
                Alert.alert('Tip dismissed', 'Provider priority helper will stay hidden.');
              }}
            >
              Hide provider priority helper
            </Button>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Background health sync</Text>
              <Switch
                value={userSettingsQ.data?.backgroundSyncEnabled ?? false}
                onValueChange={handleBackgroundSyncToggle}
              />
            </View>
            <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
              Auto-syncs providers about once per hour, even while the app is closed.
            </Text>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Show streak badges</Text>
              <Switch
                value={userSettingsQ.data?.badgesEnabled ?? true}
                onValueChange={(value: boolean) => updateSettingsMut.mutate({ badgesEnabled: value })}
              />
            </View>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Hide short streaks</Text>
              <Switch
                value={userSettingsQ.data?.hideShortStreaks ?? false}
                onValueChange={(value: boolean) => updateSettingsMut.mutate({ hideShortStreaks: value })}
              />
            </View>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Nerd mode</Text>
              <Switch
                value={userSettingsQ.data?.nerdModeEnabled ?? false}
                onValueChange={(value: boolean) => updateSettingsMut.mutate({ nerdModeEnabled: value })}
              />
            </View>
            <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
              Show receptor and element tags on insights (educational only).
            </Text>
          </Row>

          <Row>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyMedium">Scientific insights</Text>
              <Switch
                value={userSettingsQ.data?.scientificInsightsEnabled ?? true}
                onValueChange={(value: boolean) =>
                  updateSettingsMut.mutate({ scientificInsightsEnabled: value })
                }
              />
            </View>
          </Row>

          <Row>
            <Button
              mode="outlined"
              style={{ alignSelf: 'flex-start' }}
              onPress={() => navigation.navigate('EvidenceNotes')}
            >
              View evidence notes
            </Button>
          </Row>

          <Row>
            <Text variant="titleSmall" style={{ marginTop: 8 }}>
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
                      fontWeight: isCurrent ? '800' : '700',
                      color: isCurrent ? theme.colors.primary : theme.colors.onSurface,
                    }}
                  >
                    {stage.title} {isCurrent ? '• Current' : isDone ? '• Complete' : ''}
                  </Text>
                  <Text variant="bodySmall" style={{ opacity: 0.75, marginTop: 4 }}>
                    {stage.summary}
                  </Text>
                </View>
              );
            })}
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Med reminders"
          icon="pill"
          open={!!openKeys.meds}
          onToggle={() => toggleKey('meds')}
          subtitle="Refills + reschedule next 24h"
        >
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
                try {
                  await cancelAllReminders();
                  Alert.alert('Cleared', 'All scheduled notifications canceled.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to cancel notifications');
                }
              }}
            >
              Cancel all notifications
            </Button>
          </Row>
        </ExpandableCard>

        <ExpandableCard
          title="Data & Privacy"
          icon="shield-lock-outline"
          open={!!openKeys.privacy}
          onToggle={() => toggleKey('privacy')}
          subtitle="Export or delete your data"
        >
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
        </ExpandableCard>

        <ExpandableCard
          title="About"
          icon="information-outline"
          open={!!openKeys.about}
          onToggle={() => toggleKey('about')}
          subtitle="Version and updates"
        >
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>
            Version
          </Text>
          <Text variant="bodyMedium" style={{ marginTop: 4 }}>
            {versionInfo.version} (Build {versionInfo.buildNumber})
          </Text>

          {versionInfo.runtimeVersion && (
            <Text variant="bodySmall" style={{ marginTop: 2, opacity: 0.7 }}>
              Runtime: {versionInfo.runtimeVersion} • Channel: {versionInfo.channel}
            </Text>
          )}

          {isUpdatePending && (
            <View style={{ marginTop: 12 }}>
              <Text variant="bodySmall" style={{ opacity: 0.75, marginBottom: 8 }}>
                Update downloaded. Restart to apply.
              </Text>
              <Button
                mode="contained"
                onPress={async () => {
                  try {
                    await applyUpdate();
                  } catch (error: any) {
                    Alert.alert('Update failed', error?.message ?? 'Failed to apply update. Restart manually.');
                  }
                }}
              >
                Restart & apply update
              </Button>
            </View>
          )}

          {!isUpdatePending && (
            <Row>
              <Button mode="outlined" loading={isChecking} disabled={isChecking} onPress={checkForUpdates}>
                {isChecking ? 'Checking...' : 'Check for updates'}
              </Button>
            </Row>
          )}
        </ExpandableCard>

        <View style={{ height: sectionSpacing }} />

      {isDevOrPreview ? (
        <View style={{ marginHorizontal: 16, marginBottom: sectionSpacing }}>
          <Button mode="outlined" onPress={sendTestNotifications}>
            Send test notifications (10-16s)
          </Button>
        </View>
      ) : null}
      </ScrollView>

      <Portal>
        <PaperModal
          visible={feedbackModalOpen}
          onDismiss={() => setFeedbackModalOpen(false)}
          contentContainerStyle={{
            marginHorizontal: 16,
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '900' }}>
            {feedbackKind === 'problem'
              ? 'Report a problem'
              : feedbackKind === 'feature'
                ? 'Suggest a feature'
                : 'Feedback'}
          </Text>

          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 6 }}>
            Keep it short. Include “expected vs happened” if it’s a bug.
          </Text>

          <TextInput
            mode="outlined"
            label="Your note"
            value={feedbackText}
            onChangeText={setFeedbackText}
            multiline
            numberOfLines={5}
            style={{ marginTop: 12 }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
            <View style={{ marginRight: 10 }}>
              <Button mode="text" onPress={() => setFeedbackModalOpen(false)}>
                Cancel
              </Button>
            </View>
            <Button
              mode="contained"
              loading={reportMut.isPending}
              disabled={reportMut.isPending || !feedbackText.trim()}
              onPress={() => {
                reportMut.mutate({
                  kind: feedbackKind,
                  text: feedbackText.trim(),
                  includeDiagnostics,
                });
              }}
            >
              Send
            </Button>
          </View>
        </PaperModal>
      </Portal>
    </>
  );
}
