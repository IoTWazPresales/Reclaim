import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { RECLAIM_SCREEN_SECTION_GAP } from '@/theme/reclaimScreenLayout';

type Props = {
  hints: string[];
  accessibilityLabel?: string;
  /** Dashboard: collapsed by default; Meds screen: expanded. */
  defaultExpanded?: boolean;
  collapsible?: boolean;
};

const MAX_HINTS = 2;

/**
 * Non-scored medication context lines shown below insight cards (educational boundary).
 */
export function MedicationContextFootnotes({
  hints,
  accessibilityLabel,
  defaultExpanded = false,
  collapsible = true,
}: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!hints?.length) return null;

  const visible = hints.slice(0, MAX_HINTS);
  const hiddenCount = Math.max(0, hints.length - MAX_HINTS);

  return (
    <View
      style={{
        marginTop: RECLAIM_SCREEN_SECTION_GAP,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.surfaceVariant,
      }}
      accessibilityLabel={accessibilityLabel ?? 'Medication context'}
    >
      <Pressable
        onPress={collapsible ? () => setExpanded((v) => !v) : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        accessibilityRole={collapsible ? 'button' : undefined}
        accessibilityState={collapsible ? { expanded } : undefined}
      >
        <MaterialCommunityIcons name="pill" size={18} color={theme.colors.primary} />
        <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', flex: 1 }}>
          Medication context {collapsible && !expanded ? '▸' : collapsible ? '▾' : ''}
        </Text>
      </Pressable>
      {(expanded || !collapsible) &&
        visible.map((h, i) => (
          <Text
            key={i}
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20, marginTop: i === 0 ? 8 : 6 }}
          >
            {h}
          </Text>
        ))}
      {expanded && hiddenCount > 0 ? (
        <Text variant="labelSmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
          +{hiddenCount} more in Meds
        </Text>
      ) : null}
    </View>
  );
}
