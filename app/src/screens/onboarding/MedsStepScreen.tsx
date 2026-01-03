import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { upsertMed } from '@/lib/api';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Meds'>;

export default function MedsStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      Alert.alert('Medication', 'Name is required.');
      return;
    }
    setSaving(true);
    try {
      const schedule =
        time.trim() && /^\d{1,2}:\d{2}$/.test(time.trim())
          ? { times: [time.trim()], days: [1, 2, 3, 4, 5, 6, 7] }
          : undefined;
      await upsertMed({ name: name.trim(), dose: dose.trim() || undefined, schedule });
      Alert.alert('Added', 'Medication saved.');
      navigation.replace('Sleep');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to save medication');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
        Add your first medication?
      </Text>
      <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
        Name required; dose optional; schedule is a single anchor time. You can do this later.
      </Text>

      <TextInput
        mode="outlined"
        label="Name (required)"
        value={name}
        onChangeText={setName}
        style={{ marginBottom: 12 }}
      />
      <TextInput mode="outlined" label="Dose (optional)" value={dose} onChangeText={setDose} style={{ marginBottom: 12 }} />
      <TextInput
        mode="outlined"
        label="Anchor time (HH:MM, optional)"
        value={time}
        onChangeText={setTime}
        placeholder="08:00"
        style={{ marginBottom: 20 }}
      />

      <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ marginBottom: 12 }}>
        Save and continue
      </Button>
      <Button mode="text" onPress={() => navigation.replace('Sleep')} disabled={saving}>
        Do later
      </Button>
    </View>
  );
}


