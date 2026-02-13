/**
 * GuidedPrepScreen - Preparation period before guided training starts.
 * Gives users time to lock the phone and put on the watch so the first
 * notification routes to the correct device.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { Portal, Modal, Card, Text, Button, useTheme, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme';

export type GuidedPrepScreenProps = {
  visible: boolean;
  secondsTotal: number;
  onComplete: () => void;
  onCancel: () => void;
};

export default function GuidedPrepScreen({
  visible,
  secondsTotal,
  onComplete,
  onCancel,
}: GuidedPrepScreenProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [remaining, setRemaining] = useState(secondsTotal);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const progress = secondsTotal > 0 ? 1 - remaining / secondsTotal : 1;

  useEffect(() => {
    if (!visible || secondsTotal <= 0) return;
    setRemaining(secondsTotal);
    startedAtRef.current = Date.now();
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
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, secondsTotal]);

  const handleComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}
