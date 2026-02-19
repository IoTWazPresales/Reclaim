import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Button, Chip, useTheme, TextInput, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { createMoodCheckin } from '@/lib/api';
import Animated, { FadeInUp, ReduceMotion } from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'MoodCheckin'>;

const enter = (delay: number) =>
  FadeInUp.delay(delay).duration(450).springify().damping(22).reduceMotion(ReduceMotion.System);

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
      navigation.replace('Reset');
    } catch {
      // Silent failure — don't block onboarding for a non-critical log
      navigation.replace('Reset');
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
        <View style={{ flex: 1, justifyContent: 'center' }}>

          <Animated.View entering={enter(0)}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                marginBottom: 8,
                color: theme.colors.onSurface,
              }}
            >
              How are you feeling{'\n'}right now?
            </Text>
          </Animated.View>

          <Animated.View entering={enter(100)}>
            <Text
              style={{
                opacity: 0.8,
                marginBottom: 6,
                color: theme.colors.onSurfaceVariant,
                lineHeight: 22,
              }}
            >
              Pick a number — that's all it takes.
            </Text>
            <Text
              style={{
                opacity: 0.55,
                marginBottom: 20,
                color: theme.colors.onSurfaceVariant,
                fontSize: 12,
              }}
            >
              1 = not great at all · 10 = feeling excellent
            </Text>
          </Animated.View>

          <Animated.View entering={enter(200)}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
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
            />
          </Animated.View>

        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
        <Button
          mode="contained"
          onPress={save}
          loading={saving}
          disabled={saving}
          style={{ marginBottom: 12 }}
          contentStyle={{ paddingVertical: 4 }}
        >
          Save and continue
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.replace('Reset')}
          disabled={saving}
        >
          Do later
        </Button>
      </View>
    </View>
  );
}
