import React from 'react';
import { View } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';

import type { reclaimGhostCapsuleButton } from '@/theme/reclaimVisualLanguage';

type CapsuleButtonStyles = ReturnType<typeof reclaimGhostCapsuleButton>;

type DashboardSleepSnapshotModalProps = {
  visible: boolean;
  onDismiss: () => void;
  headline: string;
  subline: string;
  onOpenSleep: () => void;
  primaryCapsule: CapsuleButtonStyles;
  ghostCapsule: CapsuleButtonStyles;
};

export function DashboardSleepSnapshotModal({
  visible,
  onDismiss,
  headline,
  subline,
  onOpenSleep,
  primaryCapsule,
  ghostCapsule,
}: DashboardSleepSnapshotModalProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{
          marginHorizontal: 20,
          borderRadius: 16,
          padding: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Sleep snapshot
        </Text>
        <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          {headline}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
          {subline}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <Button
            mode="text"
            onPress={onDismiss}
            style={ghostCapsule.style}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            Close
          </Button>
          <Button
            mode="contained"
            onPress={onOpenSleep}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={primaryCapsule.style}
            contentStyle={primaryCapsule.contentStyle}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
          >
            Open sleep
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
