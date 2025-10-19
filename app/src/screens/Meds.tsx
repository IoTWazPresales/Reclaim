import React from 'react';
import { View, Text } from 'react-native';

export default function Meds() {
  return (
    <View className="flex-1 bg-[#0b1220] items-center justify-center">
      <Text className="text-white/80">Medication scheduler placeholder</Text>
      <Text className="text-white/60 mt-2 text-center px-8">
        We’ll add reminders, taken/skip logs, and interaction notices here.
      </Text>
    </View>
  );
}
