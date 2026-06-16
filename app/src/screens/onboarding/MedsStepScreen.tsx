import React, { useState } from 'react';
import { View, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Button, TextInput, useTheme, Card, Text, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { upsertMed } from '@/lib/api';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Meds'>;

type MedKind = 'scheduled' | 'prn';

type MedEntry = {
  id: string;
  name: string;
  dose: string;
  time: string;
  kind: MedKind;
};

export default function MedsStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  useSyncOnboardingRoute('Meds');
  const [meds, setMeds] = useState<MedEntry[]>([
    { id: '1', name: '', dose: '', time: '', kind: 'scheduled' },
  ]);
  const [saving, setSaving] = useState(false);

  function addMed() {
    setMeds([...meds, { id: Date.now().toString(), name: '', dose: '', time: '', kind: 'scheduled' }]);
  }

  function removeMed(id: string) {
    if (meds.length > 1) {
      setMeds(meds.filter((m) => m.id !== id));
    }
  }

  function updateMed(id: string, field: keyof MedEntry, value: string | MedKind) {
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
          if (m.kind === 'prn') {
            return upsertMed({
              name: m.name.trim(),
              dose: m.dose.trim() || undefined,
              schedule: { prn: true },
            });
          }
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
            Name required; dose optional. Choose scheduled (fixed times) or as-needed — PRN meds are tracked by logging
            doses, not daily adherence. You can finish this later.
          </Text>

          <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginBottom: 8, fontStyle: 'italic' }}>
                How it looks
              </Text>
              <Text variant="bodyMedium" style={{ marginBottom: 6, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                Use the name your clinician or pharmacy uses. Scheduled meds can use one anchor time for reminders.
                As-needed meds don&apos;t need a daily time — log when you take a dose later in the Meds tab.
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.85 }}>
                Reclaim does not give medical advice or dosing instructions.
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

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <Chip
                  mode={med.kind === 'scheduled' ? 'flat' : 'outlined'}
                  selected={med.kind === 'scheduled'}
                  onPress={() => updateMed(med.id, 'kind', 'scheduled')}
                  disabled={saving}
                >
                  Scheduled
                </Chip>
                <Chip
                  mode={med.kind === 'prn' ? 'flat' : 'outlined'}
                  selected={med.kind === 'prn'}
                  onPress={() => updateMed(med.id, 'kind', 'prn')}
                  disabled={saving}
                >
                  As needed (PRN)
                </Chip>
              </View>

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
              {med.kind === 'scheduled' ? (
                <TextInput
                  mode="outlined"
                  label="Anchor time (HH:MM, optional)"
                  value={med.time}
                  onChangeText={(v) => updateMed(med.id, 'time', v)}
                  placeholder="08:00"
                  disabled={saving}
                />
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.9, lineHeight: 18 }}>
                  No recurring reminder time needed. Track use from the Meds tab (&quot;log taken&quot;) when you take a dose.
                </Text>
              )}
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
