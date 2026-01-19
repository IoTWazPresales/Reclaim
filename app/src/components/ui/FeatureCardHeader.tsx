import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

type FeatureCardHeaderProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

/**
 * FeatureCardHeader
 * A compact, reusable “card identity” row: icon tile + title/subtitle + optional right slot.
 */
export function FeatureCardHeader({ icon, title, subtitle, rightSlot }: FeatureCardHeaderProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: theme.colors.primaryContainer,
        }}
      >
        <MaterialCommunityIcons name={icon} size={22} color={theme.colors.onPrimaryContainer} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightSlot ? <View style={{ marginLeft: 12 }}>{rightSlot}</View> : null}
    </View>
  );
}

