import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { reclaimGuidedIconWell } from '@/theme/reclaimVisualLanguage';
import { reclaimTextRoles } from '@/theme/reclaimTypography';

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
  const iconWell = reclaimGuidedIconWell(appTheme);
  const cobalt = theme.dark ? 'rgba(129, 170, 240, 0.92)' : theme.colors.primary;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: appTheme.spacing.md }}>
      <View style={iconWell}>
        <MaterialCommunityIcons name={icon} size={22} color={cobalt} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="titleMedium" style={[reclaimTextRoles.cardTitle, { color: theme.colors.onSurface }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            variant="bodySmall"
            style={[reclaimTextRoles.meta, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightSlot ? <View style={{ marginLeft: 12 }}>{rightSlot}</View> : null}
    </View>
  );
}

