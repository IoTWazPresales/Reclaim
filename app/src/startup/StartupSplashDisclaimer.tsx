import React, { useCallback } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MEDICAL_DISCLAIMER, HEALTHCARE_REMINDER } from '@/lib/storeCompliance';
import { markHealthDisclaimerSeen } from '@/startup/healthDisclaimerGate';

type Props = {
  visible: boolean;
  onComplete: () => void;
};

/**
 * Blocking health disclaimer shown on the splash overlay (Phase B).
 * Replaces post-mount HealthDisclaimerModal for first-time users.
 */
export function StartupSplashDisclaimer({ visible, onComplete }: Props) {
  const theme = useTheme();

  const dismiss = useCallback(async () => {
    await markHealthDisclaimerSeen();
    onComplete();
  }, [onComplete]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
        onPress={dismiss}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 380,
          }}
        >
          <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 12, color: theme.colors.onSurface }}>
            Before you start
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
            {MEDICAL_DISCLAIMER}
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 20, color: theme.colors.onSurface }}>
            {HEALTHCARE_REMINDER}
          </Text>
          <Button mode="contained" onPress={dismiss}>
            I understand
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
