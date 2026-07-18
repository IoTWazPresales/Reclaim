/**
 * GuidedPrepScreen - Preparation period before guided training starts.
 * Gives users time to lock the phone and put on the watch so the first
 * notification routes to the correct device.
 * Uses a scheduled notification so the alert fires even when app is backgrounded.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, AppState, AppStateStatus } from 'react-native';
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
  // Guard: ensure onComplete fires exactly once per countdown regardless of how many
  // code paths reach it (interval, useEffect, AppState listener).
  const hasCompletedRef = useRef(false);
  /** Parent often passes inline handlers; must not be a useEffect dep or the prep timer restarts on every re-render. */
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  onCompleteRef.current = onComplete;
  onCancelRef.current = onCancel;

  const progress = secondsTotal > 0 ? 1 - remaining / secondsTotal : 1;

  const finalizePrepCompletion = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    logger.debug('[GUIDED_PREP] countdown complete → activate session');
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (!visible || secondsTotal <= 0) return;
    logger.debug('[GUIDED_PREP] prep countdown arm', { secondsTotal, visible });
    hasCompletedRef.current = false; // reset for each new countdown
    setRemaining(secondsTotal);
    startedAtRef.current = Date.now();

    // Do NOT schedule OS "Time to start / Tap to begin" notifications here.
    // They bridge to Wear with no Done actions (only "Open on phone") and confuse
    // users when createTrainingSession fails. In-app countdown is the prep UX.

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (!startedAtRef.current || secondsTotal <= 0) return;
      if (hasCompletedRef.current) return;
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      if (elapsed >= secondsTotal) {
        finalizePrepCompletion();
      } else {
        setRemaining(Math.max(0, Math.ceil(secondsTotal - elapsed)));
      }
    });

    return () => {
      logger.debug('[GUIDED_PREP] prep countdown cleanup (visible/seconds changed or unmount)');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      sub.remove();
    };
  }, [visible, secondsTotal, finalizePrepCompletion]);

  const handleComplete = useCallback(() => {
    logger.debug('[GUIDED_PREP] Start now pressed');
    finalizePrepCompletion();
  }, [finalizePrepCompletion]);

  useEffect(() => {
    if (visible && remaining === 0 && secondsTotal > 0) {
      finalizePrepCompletion();
    }
  }, [visible, remaining, secondsTotal, finalizePrepCompletion]);

  if (!visible) return null;

  const showCountdown = secondsTotal > 0;
  const primaryColor = theme.colors.primary;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => onCancelRef.current()}
        contentContainerStyle={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: appTheme.spacing.lg,
          margin: appTheme.spacing.md,
          // Do not use flex:1 here — Paper Modal + flex:1 yields empty dim overlay on Android.
          alignSelf: 'center',
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Card
          mode="elevated"
          style={{
            width: '100%',
            maxWidth: 360,
            borderRadius: appTheme.borderRadius.xl,
            overflow: 'hidden',
            backgroundColor: theme.colors.elevation.level3,
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
                You can lock your phone after the session is created. Lock-screen (and watch-mirrored) set notifications will guide each set — tap Done there to log and start rest. Keep the phone nearby so actions can reach the app.
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
                  onPress={() => {
                    logger.debug('[GUIDED_PREP] cancel pressed');
                    onCancelRef.current();
                  }}
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
