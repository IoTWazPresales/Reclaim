import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function Mindfulness() {
  const [count, setCount] = useState(4);
  return (
    <View className="flex-1 bg-[#0b1220] items-center justify-center px-6">
      <Text className="text-white text-xl mb-4">Box Breathing</Text>
      <Text className="text-white/80 mb-1">Inhale • Hold • Exhale • Hold</Text>
      <Text className="text-white text-5xl my-6">{count}</Text>
      <TouchableOpacity className="bg-white/10 px-5 py-3 rounded-2xl"
        onPress={() => setCount((c)=> (c===4?6:4))}>
        <Text className="text-white">Toggle 4s / 6s</Text>
      </TouchableOpacity>
    </View>
  );
}
