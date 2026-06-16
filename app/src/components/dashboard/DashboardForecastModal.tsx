import React from 'react';
import { View } from 'react-native';
import { Button, Chip, Modal, Portal, Text, useTheme } from 'react-native-paper';

import type { reclaimGhostCapsuleButton } from '@/theme/reclaimVisualLanguage';

type CapsuleButtonStyles = ReturnType<typeof reclaimGhostCapsuleButton>;

type DashboardForecastModalProps = {
  visible: boolean;
  onDismiss: () => void;
  forecast: {
    headline: string;
    tone: '+' | '~' | '-';
    confidence: number;
    drivers: string[];
    action: string;
  };
  ghostCapsule: CapsuleButtonStyles;
};

export function DashboardForecastModal({
  visible,
  onDismiss,
  forecast,
  ghostCapsule,
}: DashboardForecastModalProps) {
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
          Forecast (next 12h)
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
          <Chip compact>{forecast.tone} Forecast</Chip>
          <Chip compact>Confidence {forecast.confidence}%</Chip>
        </View>
        <Text variant="bodyMedium" style={{ marginTop: 10, color: theme.colors.onSurface }}>
          {forecast.headline}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
          Drivers: {forecast.drivers.length ? forecast.drivers.join(' • ') : 'stable baseline'}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
          Next move: {forecast.action}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
          <Button
            mode="text"
            onPress={onDismiss}
            style={ghostCapsule.style}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            Close
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}
