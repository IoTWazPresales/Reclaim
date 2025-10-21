import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { scheduleMindfulnessPing } from '@/hooks/useNotifications';

export default function MindfulnessScreen() {
  const schedule = async (mins: number) => {
    try {
      await scheduleMindfulnessPing(mins);
      Alert.alert('Scheduled', `Mindfulness ping in ${mins} minute${mins === 1 ? '' : 's'}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to schedule');
    }
  };

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Mindfulness</Text>
      <Text style={{ opacity: 0.8, marginBottom: 16 }}>
        Quick reminders to pause, breathe, and reset.
      </Text>

      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={() => schedule(1)}
          style={{ backgroundColor: '#111827', padding: 14, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Ping me in 1 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => schedule(5)}
          style={{ backgroundColor: '#0ea5e9', padding: 14, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Ping me in 5 mins</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => schedule(15)}
          style={{ backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>Ping me in 15 mins</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
