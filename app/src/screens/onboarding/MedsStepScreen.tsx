import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Button, TextInput, useTheme, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { upsertMed } from '@/lib/api';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Meds'>;

type MedEntry = {
  id: string;
  name: string;
  dose: string;
  time: string;
};

export default function MedsStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [meds, setMeds] = useState<MedEntry[]>([{ id: '1', name: '', dose: '', time: '' }]);
  const [saving, setSaving] = useState(false);

  function addMed() {
    setMeds([...meds, { id: Date.now().toString(), name: '', dose: '', time: '' }]);
  }

  function removeMed(id: string) {
    if (meds.length > 1) {
      setMeds(meds.filter((m) => m.id !== id));
    }
  }

  function updateMed(id: string, field: keyof MedEntry, value: string) {
    setMeds(meds.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  async function save() {
    const validMeds = meds.filter((m) => m.name.trim());
    if (validMeds.length === 0) {
      Alert.alert('Medication', 'At least one medication name is required.');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        validMeds.map((m) => {
          const schedule =
            m.time.trim() && /^\d{1,2}:\d{2}$/.test(m.time.trim())
              ? { times: [m.time.trim()], days: [1, 2, 3, 4, 5, 6, 7] }
              : undefined;
          return upsertMed({ name: m.name.trim(), dose: m.dose.trim() || undefined, schedule });
        }),
      );
      Alert.alert('Added', `${validMeds.length} medication${validMeds.length === 1 ? '' : 's'} saved.`);
      navigation.replace('Sleep');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to save medications');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginBottom: 16, alignSelf: 'flex-start' }}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
            Add your medications?
          </Text>
          <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
            Name required; dose optional; schedule is a single anchor time. You can do this later.
          </Text>

          <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text variant="bodyLarge" style={{ marginBottom: 4, color: theme.colors.onSurface }}>
                Aspirin
              </Text>
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                100mg • 08:00 daily
              </Text>
            </Card.Content>
          </Card>

          {meds.map((med, index) => (
            <View key={med.id} style={{ marginBottom: 16 }}>
              {meds.length > 1 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    Medication {index + 1}
                  </Text>
                  <Button mode="text" compact onPress={() => removeMed(med.id)} disabled={saving}>
                    Remove
                  </Button>
                </View>
              ) : null}
              <TextInput
                mode="outlined"
                label="Name (required)"
                value={med.name}
                onChangeText={(v) => updateMed(med.id, 'name', v)}
                style={{ marginBottom: 12 }}
                disabled={saving}
              />
              <TextInput
                mode="outlined"
                label="Dose (optional)"
                value={med.dose}
                onChangeText={(v) => updateMed(med.id, 'dose', v)}
                style={{ marginBottom: 12 }}
                disabled={saving}
              />
              <TextInput
                mode="outlined"
                label="Anchor time (HH:MM, optional)"
                value={med.time}
                onChangeText={(v) => updateMed(med.id, 'time', v)}
                placeholder="08:00"
                disabled={saving}
              />
            </View>
          ))}

          <Button mode="outlined" onPress={addMed} disabled={saving} style={{ marginBottom: 16 }}>
            Add another medication
          </Button>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <Button mode="contained" onPress={save} loading={saving} disabled={saving} style={{ marginBottom: 12 }}>
          Save and continue
        </Button>
        <Button mode="text" onPress={() => navigation.replace('Sleep')} disabled={saving}>
          Do later
        </Button>
      </View>
    </View>
  );
}


