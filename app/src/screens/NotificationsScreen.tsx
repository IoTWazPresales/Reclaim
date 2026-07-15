import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Card, Chip, Divider, IconButton, List, Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimSectionCardShell, reclaimPrimaryCapsuleButton, reclaimSecondaryCapsuleButton } from '@/theme/reclaimVisualLanguage';
import { RECLAIM_SCREEN_SECTION_GAP, reclaimSectionSpacing, reclaimStandardScreenScroll } from '@/theme/reclaimScreenLayout';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { SchedulingCard } from '@/components/SchedulingCard';
import { navigateToSettings } from '@/navigation/nav';

import { getNotificationPreferences } from '@/lib/notificationPreferences';
import { rescheduleRefillRemindersIfEnabled } from '@/lib/refillReminders';
import { ensureNotificationPermission } from '@/hooks/useNotifications';

type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export default function NotificationsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionShell = useMemo(() => reclaimSectionCardShell(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const secondaryCapsule = useMemo(() => reclaimSecondaryCapsuleButton(appTheme), [appTheme]);
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
      contentContainerStyle={reclaimStandardScreenScroll}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
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
      <Text variant="bodyMedium" style={[reclaimSectionSpacing, { opacity: 0.7 }]}>
        Manage how Reclaim keeps you in the loop. Fine-tune permissions, quiet hours, and reminders for medications, moods, and sleep.
      </Text>

      <Card mode="elevated" style={[sectionShell as any, reclaimSectionSpacing]}>
        <Card.Content>
          <FeatureCardHeader icon="shield-check" title="Permission status" />
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
            Notifications help you stay on track with meds, mood check-ins, and sleep wind-down. We only send reminders you opt into.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 16, columnGap: 12, flexWrap: 'wrap' }}>
            <Button
              mode="contained"
              onPress={handleRequestPermission}
              loading={loadingPermission}
              accessibilityLabel="Request notification permissions"
              style={primaryCapsule.style}
              contentStyle={primaryCapsule.contentStyle}
              labelStyle={primaryCapsule.labelStyle}
            >
              {permissionStatus === 'granted' ? 'Re-check' : 'Enable notifications'}
            </Button>
            <Button
              mode="outlined"
              onPress={handleOpenSettings}
              accessibilityLabel="Open system notification settings"
              style={secondaryCapsule.style}
              contentStyle={secondaryCapsule.contentStyle}
              labelStyle={secondaryCapsule.labelStyle}
            >
              Open system settings
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={[sectionShell as any, reclaimSectionSpacing]}>
        <Card.Content>
          <FeatureCardHeader icon="bell-sleep" title="Quiet hours & snooze" />
          {quietHours ? (
            <>
              <List.Item
                title="Quiet hours"
                description={
                  !quietHours.start && !quietHours.end
                    ? 'Not set'
                    : `${formatClock(quietHours.start)} → ${formatClock(quietHours.end)}`
                }
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
            Edit quiet hours or snooze length in the Settings tab (Notifications section). Snoozed reminders respect your quiet window automatically.
          </Text>
          <Pressable
            onPress={() => navigateToSettings({ openSection: 'notifications' })}
            accessibilityRole="button"
            accessibilityLabel="Open Settings Notifications section"
            style={{ marginTop: 8, minHeight: 48, justifyContent: 'center' }}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              Open Settings → Notifications
            </Text>
          </Pressable>
        </Card.Content>
      </Card>

      <SchedulingCard
        title="Scheduled reminders"
        subtitle="Upcoming reminder status"
        status={
          <View>
            <List.Item
              title="Upcoming reminders"
              description={
                scheduledCount === null ? '—' : `${scheduledCount} scheduled notification${scheduledCount === 1 ? '' : 's'}`
              }
              left={() => <List.Icon icon="bell" />}
            />
            <Divider style={{ marginVertical: 12 }} />
            <Text variant="bodySmall" style={{ opacity: 0.7 }}>
              Medication reminders refresh automatically when you edit a schedule. You can also force a refresh below.
            </Text>
          </View>
        }
        primaryActionLabel="Refresh medication reminders"
        onPrimaryAction={handleRefreshSchedule}
      />
    </ScrollView>
  );
}

