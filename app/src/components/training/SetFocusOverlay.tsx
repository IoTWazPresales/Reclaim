// Set Focus Overlay - Watch-like interface for current set
import React from 'react';
import { View, Modal } from 'react-native';
import { Button, Card, Text, useTheme, Portal } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { formatWeightReps } from './uiFormat';

interface SetFocusOverlayProps {
  visible: boolean;
  exerciseName: string;
  setIndex: number;
  totalSets: number;
  plannedWeight: number;
  plannedReps: number;
  isCompleted: boolean;
  isResting: boolean;
  restRemaining?: number;
  restPaused?: boolean;
  onDone: () => void;
  onAdjust: () => void;
  onStartRest?: () => void;
  onToggleRestPause?: () => void;
  onClose: () => void;
}

export default function SetFocusOverlay({
  visible,
  exerciseName,
  setIndex,
  totalSets,
  plannedWeight,
  plannedReps,
  isCompleted,
  isResting,
  restRemaining,
  restPaused,
  onDone,
  onAdjust,
  onStartRest,
  onToggleRestPause,
  onClose,
}: SetFocusOverlayProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: appTheme.spacing.lg,
          }}
        >
          <Card
            mode="elevated"
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: theme.colors.surface,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content style={{ padding: appTheme.spacing.lg }}>
              <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: appTheme.spacing.xs }} numberOfLines={2}>
                {exerciseName}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.md }}>
                Set {setIndex} of {totalSets}
              </Text>

              {isResting && restRemaining !== undefined ? (
                <View style={{ marginBottom: appTheme.spacing.md }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.primary, textAlign: 'center', marginBottom: appTheme.spacing.sm }}>
                    Rest: {Math.floor(restRemaining / 60)}:{(restRemaining % 60).toString().padStart(2, '0')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
                    <Button
                      mode="outlined"
                      compact
                      icon={restPaused ? 'play' : 'pause'}
                      onPress={onToggleRestPause}
                      style={{ flex: 1 }}
                    >
                      {restPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button mode="contained" compact onPress={onClose} style={{ flex: 1 }}>
                      Close
                    </Button>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ alignItems: 'center', marginBottom: appTheme.spacing.lg }}>
                    <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {formatWeightReps(plannedWeight, plannedReps)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                      Planned
                    </Text>
                  </View>

                  <View style={{ gap: appTheme.spacing.sm }}>
                    {!isCompleted ? (
                      <Button mode="contained" onPress={onDone} style={{ marginBottom: appTheme.spacing.xs }}>
                        Done
                      </Button>
                    ) : onStartRest ? (
                      <Button mode="contained" onPress={onStartRest} style={{ marginBottom: appTheme.spacing.xs }}>
                        Start Rest
                      </Button>
                    ) : null}
                    <Button mode="outlined" onPress={onAdjust}>
                      Adjust
                    </Button>
                    <Button mode="text" onPress={onClose} textColor={theme.colors.onSurfaceVariant}>
                      Close
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </Portal>
  );
}
