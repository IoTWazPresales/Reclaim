import React from 'react';
import { View, Text } from 'react-native';

export default function RingStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center justify-center w-28 h-28 rounded-full border border-white/20 m-2">
      <Text className="text-2xl text-white font-semibold">{value}</Text>
      <Text className="text-white/70 text-xs mt-1">{label}</Text>
    </View>
  );
}
