import React from 'react';
import { View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_TOP_INSET,
} from '@/theme/reclaimScreenLayout';

type Props = {
  onRetry: () => void;
};

/** Signed-in profile probe failed. Must not dump the user onto Welcome. */
export default function OnboardRetryScreen({ onRetry }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top + RECLAIM_SCREEN_TOP_INSET,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
        justifyContent: 'center',
      }}
    >
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        Couldn’t confirm your profile
      </Text>
      <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '800', marginBottom: 12 }}>
        Still here.
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 24, marginBottom: 24 }}>
        We could not reach the server to confirm you have already set up Reclaim. You are signed in. We will not send you
        through Welcome again.
      </Text>
      <Button mode="contained" onPress={onRetry} accessibilityLabel="Try again">
        Try again
      </Button>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
        Your mood, sleep, meds and training stay on this account.
      </Text>
    </View>
  );
}
