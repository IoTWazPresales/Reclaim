import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MEDITATION_CATALOG, type MeditationType } from '@/lib/meditations';
import { MEDITATION_PRACTICE_INTENTS } from '@/lib/meditation/practiceIntents';
import { MeditationWaveGlyph } from '@/components/meditation/MeditationWaveGlyph';

type Props = {
  selectedType?: MeditationType;
  onSelect: (type: MeditationType) => void;
};

export function MeditationPracticePicker({ selectedType, onSelect }: Props) {
  const theme = useTheme();
  const accent = theme.colors.primary;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
    >
      {MEDITATION_CATALOG.map((m) => {
        const selected = selectedType === m.id;
        return (
          <Pressable
            key={m.id}
            onPress={() => onSelect(m.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={{
              width: 168,
              borderRadius: 14,
              padding: 12,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? accent : theme.colors.outlineVariant,
              backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
            }}
          >
            <MeditationWaveGlyph accent={selected ? accent : theme.colors.onSurfaceVariant} />
            <Text
              variant="titleSmall"
              style={{
                marginTop: 8,
                color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                fontWeight: '700',
              }}
              numberOfLines={2}
            >
              {m.name}
            </Text>
            <Text variant="labelSmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {m.estMinutes} min
            </Text>
            <Text
              variant="bodySmall"
              style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 16 }}
              numberOfLines={2}
            >
              {MEDITATION_PRACTICE_INTENTS[m.id]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
