import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';

type Props = {
  hints: string[];
  /** Screen reader label for the block */
  accessibilityLabel?: string;
};

/**
 * Non-scored medication context lines shown below insight cards (educational boundary).
 */
export function MedicationContextFootnotes({ hints, accessibilityLabel }: Props) {
  const theme = useTheme();
  if (!hints?.length) return null;

  return (
    <View
      style={{
        marginTop: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceVariant,
      }}
      accessibilityLabel={accessibilityLabel ?? 'Medication context'}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <MaterialCommunityIcons name="pill" size={18} color={theme.colors.primary} style={{ marginTop: 2 }} />
        <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', flex: 1 }}>
          Medication context
        </Text>
      </View>
      {hints.map((h, i) => (
        <Text
          key={i}
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            lineHeight: 20,
            marginTop: i === 0 ? 0 : 8,
          }}
        >
          {h}
        </Text>
      ))}
    </View>
  );
}
