import React, { useMemo } from 'react';
import { View, Modal } from 'react-native';
import { Button, Text, useTheme, Portal } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import {
  reclaimUtilityCardSurface,
  reclaimPrimaryCapsuleButton,
  reclaimSecondaryCapsuleButton,
  reclaimGhostCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
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
  const cardSurface = useMemo(() => reclaimUtilityCardSurface(appTheme, 'expressive'), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const secondaryCapsule = useMemo(() => reclaimSecondaryCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);

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
            backgroundColor: appTheme.dark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: appTheme.spacing.lg,
          }}
        >
          <View
            style={[
              cardSurface as any,
              {
                width: '100%',
                maxWidth: 400,
                borderRadius: appTheme.borderRadius.xl,
                padding: appTheme.spacing.lg,
              },
            ]}
          >
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
                      style={[secondaryCapsule.style, { flex: 1 }]}
                      contentStyle={secondaryCapsule.contentStyle}
                      labelStyle={secondaryCapsule.labelStyle}
                    >
                      {restPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      mode="contained"
                      compact
                      onPress={onClose}
                      style={[primaryCapsule.style, { flex: 1 }]}
                      contentStyle={primaryCapsule.contentStyle}
                      labelStyle={primaryCapsule.labelStyle}
                    >
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
                      <Button
                        mode="contained"
                        onPress={onDone}
                        style={[primaryCapsule.style, { marginBottom: appTheme.spacing.xs }]}
                        contentStyle={primaryCapsule.contentStyle}
                        labelStyle={primaryCapsule.labelStyle}
                      >
                        Done
                      </Button>
                    ) : onStartRest ? (
                      <Button
                        mode="contained"
                        onPress={onStartRest}
                        style={[primaryCapsule.style, { marginBottom: appTheme.spacing.xs }]}
                        contentStyle={primaryCapsule.contentStyle}
                        labelStyle={primaryCapsule.labelStyle}
                      >
                        Start Rest
                      </Button>
                    ) : null}
                    <Button
                      mode="outlined"
                      onPress={onAdjust}
                      style={secondaryCapsule.style}
                      contentStyle={secondaryCapsule.contentStyle}
                      labelStyle={secondaryCapsule.labelStyle}
                    >
                      Adjust
                    </Button>
                    <Button
                      mode="text"
                      onPress={onClose}
                      textColor={theme.colors.onSurfaceVariant}
                      style={ghostCapsule.style}
                      contentStyle={ghostCapsule.contentStyle}
                      labelStyle={ghostCapsule.labelStyle}
                    >
                      Close
                    </Button>
                  </View>
                </>
              )}
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
