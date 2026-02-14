import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text, useTheme } from 'react-native-paper';
import { MEDICAL_DISCLAIMER, HEALTHCARE_REMINDER } from '@/lib/storeCompliance';

const STORAGE_KEY = '@reclaim/health_disclaimer_seen';

/**
 * One-time modal shown when the user first enters the main app.
 * Stores a flag so it only appears once. Full disclaimer remains in Settings → Data & Privacy.
 */
export function HealthDisclaimerModal() {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          setVisible(seen !== '1');
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          setChecked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }, []);

  if (!checked || !visible) return null;

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
            Got it
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
