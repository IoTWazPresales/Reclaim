/**
 * GuidedPrepScreen - Preparation period before guided training starts.
 * Gives users time to lock the phone and put on the watch so the first
 * notification routes to the correct device.
 * Uses a scheduled notification so the alert fires even when app is backgrounded.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Portal, Modal, Card, Text, Button, useTheme, ProgressBar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';
import { logger } from '@/lib/logger';

export type GuidedPrepScreenProps = {
  visible: boolean;
  secondsTotal: number;
  /** True while the session is being created; shows a loading state and blocks interactions */
  isStarting?: boolean;
  onComplete: () => void;
  onCancel: () => void;
};

export default function GuidedPrepScreen({
  visible,
  secondsTotal,
  isStarting = false,
  onComplete,
  onCancel,
}: GuidedPrepScreenProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [remaining, setRemaining] = useState(secondsTotal);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const prepNotificationIdRef = useRef<string | null>(null);
  const prepStartNotificationIdRef = useRef<string | null>(null);
  // Guard: ensure onComplete fires exactly once per countdown regardless of how many
  // code paths reach it (interval, useEffect, AppState listener).
  const hasCompletedRef = useRef(false);

  const progress = secondsTotal > 0 ? 1 - remaining / secondsTotal : 1;

  const checkElapsedAndComplete = useCallback(() => {
    if (!startedAtRef.current || secondsTotal <= 0) return;
    if (hasCompletedRef.current) return;
    const elapsed = (Date.now() - startedAtRef.current) / 1000;
    if (elapsed >= secondsTotal) {
      hasCompletedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (prepNotificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(prepNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
        prepNotificationIdRef.current = null;
      }
      if (prepStartNotificationIdRef.current) {
        Notifications.dismissNotificationAsync(prepStartNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
        prepStartNotificationIdRef.current = null;
      }
      onComplete();
    } else {
      setRemaining(Math.max(0, Math.ceil(secondsTotal - elapsed)));
    }
  }, [secondsTotal, onComplete]);

  useEffect(() => {
    if (!visible || secondsTotal <= 0) return;
    hasCompletedRef.current = false; // reset for each new countdown
    setRemaining(secondsTotal);
    startedAtRef.current = Date.now();

    const schedulePrepNotifications = async () => {
      try {
        const typeInterval = (Notifications as any).SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval';
        const mins = Math.floor(secondsTotal / 60);
        const secs = secondsTotal % 60;
        const countdownStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
        const startId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Session about to start',
            body: `Starting in ${countdownStr}. Lock your phone and get ready.`,
            data: { type: 'TRAINING_PREP_START' },
            channelId: 'reminder-chime',
          },
          trigger: null,
        });
        prepStartNotificationIdRef.current = startId;
        const endId = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time to start',
            body: 'Tap to begin your workout.',
            data: { type: 'TRAINING_PREP_COMPLETE' },
            channelId: 'reminder-chime',
          },
          trigger: {
            type: typeInterval,
            seconds: Math.max(1, secondsTotal),
            repeats: false,
            channelId: 'reminder-chime',
          } as Notifications.NotificationTriggerInput,
        });
        prepNotificationIdRef.current = endId;
      } catch {
        prepNotificationIdRef.current = null;
        prepStartNotificationIdRef.current = null;
      }
    };
    schedulePrepNotifications();

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (prepNotificationIdRef.current) {
            Notifications.cancelScheduledNotificationAsync(prepNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
            prepNotificationIdRef.current = null;
          }
          if (prepStartNotificationIdRef.current) {
            Notifications.dismissNotificationAsync(prepStartNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
            prepStartNotificationIdRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') checkElapsedAndComplete();
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (prepNotificationIdRef.current) {
        Notifications.cancelScheduledNotificationAsync(prepNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
        prepNotificationIdRef.current = null;
      }
      if (prepStartNotificationIdRef.current) {
        Notifications.dismissNotificationAsync(prepStartNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
        prepStartNotificationIdRef.current = null;
      }
      sub.remove();
    };
  }, [visible, secondsTotal, checkElapsedAndComplete]);

  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (prepNotificationIdRef.current) {
      Notifications.cancelScheduledNotificationAsync(prepNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
      prepNotificationIdRef.current = null;
    }
    if (prepStartNotificationIdRef.current) {
      Notifications.dismissNotificationAsync(prepStartNotificationIdRef.current).catch((e) => { if (__DEV__) logger.debug('[GuidedPrepScreen]', e); });
      prepStartNotificationIdRef.current = null;
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (visible && remaining === 0 && secondsTotal > 0) {
      handleComplete();
    }
  }, [visible, remaining, secondsTotal, handleComplete]);

  if (!visible) return null;

  const showCountdown = secondsTotal > 0;
  const primaryColor = theme.colors.primary;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: appTheme.spacing.lg,
        }}
      >
        <Card
          mode="elevated"
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: appTheme.borderRadius.xl,
            overflow: 'hidden',
          }}
        >
          <Card.Content style={{ padding: appTheme.spacing.xl }}>
            <View
              style={{
                alignItems: 'center',
                marginBottom: appTheme.spacing.lg,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: `${primaryColor}20`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: appTheme.spacing.md,
                }}
              >
                <MaterialCommunityIcons
                  name="watch-variant"
                  size={36}
                  color={primaryColor}
                />
              </View>
              <Text
                variant="headlineSmall"
                style={{
                  fontWeight: '700',
                  color: theme.colors.onSurface,
                  textAlign: 'center',
                }}
              >
                Get ready
              </Text>
              <Text
                variant="bodyLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  marginTop: appTheme.spacing.sm,
                  lineHeight: 24,
                }}
              >
                You can lock or close your device now. Your watch will alert you when it's time to start.
              </Text>
            </View>

            {showCountdown && (
              <>
                <View
                  style={{
                    alignItems: 'center',
                    marginVertical: appTheme.spacing.lg,
                  }}
                >
                  <Text
                    variant="displaySmall"
                    style={{
                      fontWeight: '800',
                      color: primaryColor,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {remaining}
                  </Text>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: appTheme.spacing.xs,
                    }}
                  >
                    seconds
                  </Text>
                </View>
                <ProgressBar
                  progress={progress}
                  color={primaryColor}
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: `${primaryColor}30`,
                  }}
                />
              </>
            )}

            {isStarting ? (
              <View
                style={{
                  alignItems: 'center',
                  marginTop: appTheme.spacing.xl,
                  paddingVertical: appTheme.spacing.md,
                }}
              >
                <ActivityIndicator animating size="small" color={primaryColor} />
                <Text
                  variant="bodyMedium"
                  style={{ marginTop: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}
                >
                  Starting session…
                </Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  gap: appTheme.spacing.md,
                  marginTop: appTheme.spacing.xl,
                }}
              >
                <Button
                  mode="outlined"
                  onPress={onCancel}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleComplete}
                  style={{ flex: 1 }}
                >
                  {showCountdown ? 'Start now' : 'Start'}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}
