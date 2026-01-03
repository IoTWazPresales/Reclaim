import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Button, Chip, useTheme, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { createMoodCheckin } from '@/lib/api';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'MoodCheckin'>;

export default function MoodCheckinScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [rating, setRating] = useState<number>(7);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await createMoodCheckin({ rating, note: note.trim() || undefined, source: 'onboarding' });
      Alert.alert('Logged', 'Mood saved.');
      navigation.replace('Reset');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to save mood');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
        Quick mood check-in
      </Text>
      <Text style={{ opacity: 0.8, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
        Mood in two taps. Pick a number, add a note if you like.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = n === rating;
          return (
            <Chip
              key={n}
              selected={selected}
              onPress={() => setRating(n)}
              mode={selected ? 'flat' : 'outlined'}
              style={{ marginRight: 8, marginBottom: 8 }}
            >
              {n}
            </Chip>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        label="Optional note"
        value={note}
        onChangeText={setNote}
        placeholder="One line about how you feel"
        style={{ marginBottom: 20 }}
      />

      <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ marginBottom: 12 }}>
        Save and continue
      </Button>
      <Button mode="text" onPress={() => navigation.replace('Reset')} disabled={saving}>
        Do later
      </Button>
    </View>
  );
}


