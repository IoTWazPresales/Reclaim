import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import RingStat from '@/components/RingStat';

export default function Dashboard({ navigation }: any) {
  return (
    <ScrollView className="flex-1 bg-[#0b1220] px-5 pt-14">
      <Text className="text-white text-2xl font-bold mb-4">Reclaim</Text>
      <View className="flex-row justify-between">
        <RingStat label="Mood" value="🙂" />
        <RingStat label="Sleep" value="7.3h" />
        <RingStat label="Focus" value="2 x 25m" />
      </View>

      <View className="mt-6">
        <Text className="text-white/80 mb-2">Quick Actions</Text>
        <View className="flex-row flex-wrap">
          {[
            { label: 'Focus Arena', route: 'FocusArena' },
            { label: 'Mindfulness', route: 'Mindfulness' },
            { label: 'Meds', route: 'Meds' },
            { label: 'Settings', route: 'Settings' }
          ].map((b) => (
            <TouchableOpacity key={b.route}
              onPress={() => navigation.navigate(b.route)}
              className="mr-3 mb-3 px-4 py-3 rounded-2xl bg-white/10">
              <Text className="text-white">{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
