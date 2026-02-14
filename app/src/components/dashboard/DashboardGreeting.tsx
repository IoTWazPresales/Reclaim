import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { ActionCard } from '@/components/ui';

export type DashboardGreetingProps = {
  greetingText: string;
  greetingSubtitle: string;
  greetingIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  lastSyncedAt: string | null;
  onSync: () => void;
  isSyncing: boolean;
};

export function DashboardGreeting({
  greetingText,
  greetingSubtitle,
  greetingIcon,
  lastSyncedAt,
  onSync,
  isSyncing,
}: DashboardGreetingProps) {
  const theme = useTheme();

  return (
    <ActionCard style={{ backgroundColor: theme.colors.secondaryContainer }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            backgroundColor: theme.colors.primary,
          }}
        >
          <MaterialCommunityIcons name={greetingIcon} size={26} color={theme.colors.onPrimary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {greetingText}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {greetingSubtitle}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, opacity: 0.85 }}>
            Health sync:{' '}
            {lastSyncedAt ? `${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}` : 'never'}.
          </Text>
        </View>

        <Button
          mode="contained-tonal"
          compact
          onPress={onSync}
          loading={isSyncing}
          disabled={isSyncing}
          accessibilityLabel="Manually sync health data"
        >
          Sync
        </Button>
      </View>
    </ActionCard>
  );
}
