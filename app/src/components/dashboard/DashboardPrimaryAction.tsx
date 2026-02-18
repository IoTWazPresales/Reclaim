import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { ActionCard } from '@/components/ui';

export type PrimaryAction = {
  title: string;
  subtitle: string;
  meta: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  cta: string;
  onPress: () => void;
  loading: boolean;
};

export type DashboardPrimaryActionProps = {
  primaryAction: PrimaryAction;
};

export function DashboardPrimaryAction({ primaryAction }: DashboardPrimaryActionProps) {
  const theme = useTheme();

  return (
    <ActionCard feedbackScope={{ componentKey: 'dashboard-primary-action', componentTitle: 'Primary action' }}>
      <View style={{ paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                backgroundColor: theme.colors.surfaceVariant,
              }}
            >
              <MaterialCommunityIcons name={primaryAction.icon} size={22} color={theme.colors.onSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {primaryAction.title}
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                {primaryAction.subtitle}
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                {primaryAction.meta}
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            onPress={primaryAction.onPress}
            loading={primaryAction.loading}
            disabled={primaryAction.loading}
          >
            {primaryAction.cta}
          </Button>
        </View>
      </View>
    </ActionCard>
  );
}
