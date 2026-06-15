import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

const labels = ['😖', '🙁', '😐', '🙂', '😄'];

type Props = {
  value: number | null;
  onChange: (v: number) => void;
};

export default function MoodFaces({ value, onChange }: Props) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      {labels.map((emoji, idx) => {
        const v = idx + 1;
        const selected = value === v;
        return (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v)}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
              backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
            }}
          >
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
