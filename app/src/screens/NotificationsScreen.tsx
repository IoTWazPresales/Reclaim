import React, { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Card, Chip, Divider, IconButton, List, Text, useTheme } from 'react-native-paper';

import { getNotificationPreferences } from '@/lib/notificationPreferences';
import { rescheduleRefillRemindersIfEnabled } from '@/lib/refillReminders';
import { ensureNotificationPermission } from '@/hooks/useNotifications';

type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [loadingPermission, setLoadingPermission] = useState(false);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);
  const [quietHours, setQuietHours] = useState<{ start: string | null; end: string | null; snooze: number } | null>(
    null,
  );

  const loadPermissions = useCallback(async () => {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      setPermissionStatus(permissions.status);
    } catch {
      setPermissionStatus('unavailable');
    }
  }, []);

  const loadScheduled = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledCount(scheduled.length);
    } catch {
      setScheduledCount(null);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    const prefs = await getNotificationPreferences();
    setQuietHours({
      start: prefs.quietStartHHMM,
      end: prefs.quietEndHHMM,
      snooze: prefs.snoozeMinutes,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPermissions();
      loadScheduled();
      loadPreferences();
    }, [loadPermissions, loadScheduled, loadPreferences]),
  );

  const handleRequestPermission = useCallback(async () => {
    try {
      setLoadingPermission(true);
      const granted = await ensureNotificationPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error: any) {
      Alert.alert('Permission', error?.message ?? 'Failed to request notification permission.');
    } finally {
      setLoadingPermission(false);
    }
  }, []);

  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert('Settings', 'Unable to open system settings on this device.');
    }
  }, []);

  const formatClock = (value: string | null) => {
    if (!value) return 'Off';
    const [hoursStr, minutesStr] = value.split(':');
    const date = new Date();
    date.setHours(Number(hoursStr), Number(minutesStr), 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleRefreshSchedule = useCallback(async () => {
    await rescheduleRefillRemindersIfEnabled();
    await loadScheduled();
    Alert.alert('Reminders', 'Medication reminders have been refreshed.');
  }, [loadScheduled]);

  const permissionLabel = (() => {
    switch (permissionStatus) {
      case 'granted':
        return { text: 'Allowed', color: theme.colors.primary };
      case 'denied':
        return { text: 'Denied', color: theme.colors.error };
      case 'undetermined':
        return { text: 'Not requested', color: theme.colors.onSurfaceVariant };
      default:
        return { text: 'Unavailable', color: theme.colors.onSurfaceVariant };
    }
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headlineSmall">Notifications</Text>
        <IconButton
          icon="refresh"
          onPress={() => {
            loadPermissions();
            loadScheduled();
            loadPreferences();
          }}
          accessibilityLabel="Refresh notification status"
        />
      </View>
      <Text variant="bodyMedium" style={{ marginBottom: 16, opacity: 0.7 }}>
        Manage how Reclaim keeps you in the loop. Fine-tune permissions, quiet hours, and reminders
        for medications, moods, and sleep.
      </Text>

      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: 16 }}>
        <Card.Title title="Permission status" />
        <Card.Content>
          <Chip
            icon={
              permissionStatus === 'granted'
                ? 'check-circle'
                : permissionStatus === 'denied'
                ? 'alert-circle'
                : 'help-circle'
            }
            style={{ backgroundColor: theme.colors.surfaceVariant, alignSelf: 'flex-start' }}
            textStyle={{ color: permissionLabel.color }}
          >
            {permissionLabel.text}
          </Chip>
          <Text variant="bodyMedium" style={{ marginTop: 12 }}>
            Notifications help you stay on track with meds, mood check-ins, and sleep wind-down. We only
            send reminders you opt into.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <Button
              mode="contained"
              onPress={handleRequestPermission}
              loading={loadingPermission}
              style={{ marginRight: 12 }}
              accessibilityLabel="Request notification permissions"
            >
              {permissionStatus === 'granted' ? 'Re-check' : 'Enable notifications'}
            </Button>
            <Button
              mode="outlined"
              onPress={handleOpenSettings}
              accessibilityLabel="Open system notification settings"
            >
              Open system settings
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ marginBottom: 16, borderRadius: 16 }}>
        <Card.Title title="Quiet hours & snooze" />
        <Card.Content>
          {quietHours ? (
            <>
              <List.Item
                title="Quiet hours"
                description={`${formatClock(quietHours.start)} → ${formatClock(quietHours.end)}`}
                left={() => <List.Icon icon="moon-waning-crescent" />}
              />
              <List.Item
                title="Snooze duration"
                description={`${quietHours.snooze} minutes`}
                left={() => <List.Icon icon="alarm-snooze" />}
              />
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <ActivityIndicator size="small" />
            </View>
          )}
          <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 12 }}>
            Adjust quiet hours or snooze length from Settings → Notifications. Snoozed reminders
            respect your quiet window automatically.
          </Text>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={{ borderRadius: 16 }}>
        <Card.Title title="Scheduled reminders" />
        <Card.Content>
          <List.Item
            title="Upcoming reminders"
            description={
              scheduledCount === null ? '—' : `${scheduledCount} scheduled notification${scheduledCount === 1 ? '' : 's'}`
            }
            left={() => <List.Icon icon="bell" />}
          />
          <Divider style={{ marginVertical: 12 }} />
          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
            Medication reminders refresh automatically when you edit a schedule. You can also force a
            refresh below.
          </Text>
          <Button mode="outlined" style={{ marginTop: 16 }} onPress={handleRefreshSchedule}>
            Refresh medication reminders
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

