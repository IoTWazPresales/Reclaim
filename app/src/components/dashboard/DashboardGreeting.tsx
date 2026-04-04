import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { ActionCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimSecondaryCapsuleButton } from '@/theme/reclaimVisualLanguage';

export type DashboardGreetingProps = {
  greetingText: string;
  greetingSubtitle: string;
  greetingIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  lastSyncedAt: string | null;
  onSync: () => void;
  isSyncing: boolean;
};

/**
 * Slimmer, matte header that supports tiles below — not a loud marketing hero.
 */
export function DashboardGreeting({
  greetingText,
  greetingSubtitle,
  greetingIcon,
  lastSyncedAt,
  onSync,
  isSyncing,
}: DashboardGreetingProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const syncCapsule = reclaimSecondaryCapsuleButton(appTheme);
  const dark = theme.dark;
  const panel = dark ? '#0f1522' : '#e8edf5';
  const border = dark ? 'rgba(96, 140, 200, 0.1)' : 'rgba(37, 99, 235, 0.09)';
  const iconBg = dark ? 'rgba(96, 165, 250, 0.12)' : 'rgba(37, 99, 235, 0.1)';

  return (
    <ActionCard
      feedbackScope={{ componentKey: 'dashboard-greeting', componentTitle: 'Greeting' }}
      style={{
        backgroundColor: panel,
        borderColor: border,
        borderWidth: 1,
        elevation: dark ? 1 : 2,
        /// Softer shadow so tiles remain the focal plane
        shadowOpacity: dark ? 0.14 : 0.08,
        shadowRadius: dark ? 6 : 8,
        shadowOffset: { width: 0, height: 2 },
      }}
      contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: iconBg,
          }}
        >
          <MaterialCommunityIcons name={greetingIcon} size={20} color={theme.colors.primary} />
        </View>

        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '700', letterSpacing: -0.15 }}
          >
            {greetingText}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, opacity: 0.88 }}>
            {greetingSubtitle}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 3, opacity: 0.62, fontSize: 11 }}>
            Sync {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) : 'never'}
          </Text>
        </View>

        <Button
          mode="outlined"
          onPress={onSync}
          loading={isSyncing}
          disabled={isSyncing}
          accessibilityLabel="Manually sync health data"
          style={[
            syncCapsule.style,
            {
              borderColor: dark ? 'rgba(96, 165, 250, 0.38)' : 'rgba(37, 99, 235, 0.32)',
              backgroundColor: dark ? 'rgba(96, 165, 250, 0.06)' : 'rgba(37, 99, 235, 0.05)',
            },
          ]}
          contentStyle={syncCapsule.contentStyle}
          labelStyle={syncCapsule.labelStyle}
        >
          Sync
        </Button>
      </View>
    </ActionCard>
  );
}
