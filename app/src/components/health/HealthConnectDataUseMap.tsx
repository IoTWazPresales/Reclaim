import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import {
  HEALTH_CONNECT_DATA_USE_INTRO,
  HEALTH_CONNECT_DATA_USE_ROWS,
} from '@/lib/health/healthConnectDataUseCopy';

type Props = {
  /** When true, omit the title (parent already titled the section). */
  hideTitle?: boolean;
};

/**
 * Shared “Health Connect data we use” map for Integrations + Data & Privacy.
 * Keep aligned with withHealthConnectPermissions.js / Play declaration.
 */
export function HealthConnectDataUseMap({ hideTitle = false }: Props) {
  const theme = useTheme();
  const textPrimary = theme.colors.onSurface;
  const textSecondary = theme.colors.onSurfaceVariant;

  return (
    <View>
      {hideTitle ? null : (
        <Text variant="titleSmall" style={{ color: textPrimary, fontWeight: '700', marginBottom: 6 }}>
          Health Connect data we use
        </Text>
      )}
      <Text variant="bodySmall" style={{ color: textSecondary, lineHeight: 18, marginBottom: 10 }}>
        {HEALTH_CONNECT_DATA_USE_INTRO}
      </Text>
      {HEALTH_CONNECT_DATA_USE_ROWS.map((row) => (
        <View key={row.type} style={{ marginBottom: 8 }}>
          <Text variant="labelLarge" style={{ color: textPrimary, fontWeight: '600' }}>
            {row.type}
          </Text>
          <Text variant="bodySmall" style={{ color: textSecondary, lineHeight: 18, marginTop: 2 }}>
            {row.purpose}
          </Text>
        </View>
      ))}
    </View>
  );
}
