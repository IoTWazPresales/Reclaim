import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';

type Props = {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
};

export default function TagPills({ options, value, onChange }: Props) {
  const theme = useTheme();
  const toggle = (t: string) => {
    const has = value.includes(t);
    onChange(has ? value.filter(x => x !== t) : [...value, t]);
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((t) => {
        const selected = value.includes(t);
        return (
          <TouchableOpacity
            key={t}
            onPress={() => toggle(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
              backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
            }}
          >
            <Text style={{ fontSize: 14 }}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
