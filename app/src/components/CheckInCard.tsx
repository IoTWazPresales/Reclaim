import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';

type Props = {
  defaultMood?: number;
  defaultSleep?: number;
  onSave: (v: { mood?: number; sleep_hours?: number; note?: string }) => void;
  saving?: boolean;
};

export default function CheckInCard({ defaultMood = 3, defaultSleep = 7, onSave, saving }: Props) {
  const [mood, setMood] = useState<number>(defaultMood);
  const [sleep, setSleep] = useState<number>(defaultSleep);
  const [note, setNote] = useState<string>('');

  const moodLabel = useMemo(() => {
    const map = ['—', 'Very low', 'Low', 'Okay', 'Good', 'Great'];
    return map[mood] ?? String(mood);
  }, [mood]);

  return (
    <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 16, marginBottom: 16, backgroundColor: '#ffffff' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#111827' }}>Today's check-in</Text>

      <Text style={{ marginBottom: 6, color: '#111827' }}>Mood: {mood} ({moodLabel})</Text>
      <Slider
        value={mood}
        onValueChange={(v) => setMood(Math.round(v))}
        minimumValue={1}
        maximumValue={5}
        step={1}
      />

      <Text style={{ marginTop: 16, marginBottom: 6, color: '#111827' }}>Sleep (hours): {sleep.toFixed(1)}</Text>
      <Slider
        value={sleep}
        onValueChange={(v) => setSleep(Math.round(v * 10) / 10)}
        minimumValue={0}
        maximumValue={12}
        step={0.1}
      />

      <Text style={{ marginTop: 16, marginBottom: 6, color: '#111827' }}>Note (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What helped or hindered today?"
        placeholderTextColor="#9ca3af"
        multiline
        style={{
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderRadius: 12,
          padding: 10,
          minHeight: 60,
          color: '#111827',
          backgroundColor: '#ffffff',
        }}
      />

      <TouchableOpacity
        onPress={() => onSave({ mood, sleep_hours: sleep, note })}
        disabled={!!saving}
        style={{
          marginTop: 16,
          backgroundColor: '#111827',
          padding: 12,
          borderRadius: 12,
          alignItems: 'center',
          opacity: saving ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save today'}</Text>
      </TouchableOpacity>
    </View>
  );
}
