import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Props = {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
};

export default function TagPills({ options, value, onChange }: Props) {
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
              borderColor: selected ? '#4f46e5' : '#e5e7eb',
              backgroundColor: selected ? '#eef2ff' : '#fff',
            }}
          >
            <Text style={{ fontSize: 14 }}>{t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
