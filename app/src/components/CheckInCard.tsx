import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useAppTheme } from '@/theme';
import { AppCard } from './ui/AppCard';

type Props = {
  defaultMood?: number;
  defaultSleep?: number;
  onSave: (v: { mood?: number; sleep_hours?: number; note?: string }) => void;
  saving?: boolean;
};

export default function CheckInCard({ defaultMood = 3, defaultSleep = 7, onSave, saving }: Props) {
  const theme = useAppTheme();
  const [mood, setMood] = useState<number>(defaultMood);
  const [sleep, setSleep] = useState<number>(defaultSleep);
  const [note, setNote] = useState<string>('');

  const moodLabel = useMemo(() => {
    const map = ['—', 'Very low', 'Low', 'Okay', 'Good', 'Great'];
    return map[mood] ?? String(mood);
  }, [mood]);

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        title: {
          ...theme.typography.h3,
          color: theme.colors.onSurface,
          marginBottom: theme.spacing.md,
        },
        label: {
          ...theme.typography.body,
          color: theme.colors.onSurface,
          marginBottom: theme.spacing.xs,
        },
        sliderContainer: {
          marginTop: theme.spacing.lg,
        },
        textInput: {
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.sm,
          minHeight: 60,
          color: theme.colors.onSurface,
          backgroundColor: theme.colors.surface,
          ...theme.typography.body,
        },
        button: {
          marginTop: theme.spacing.lg,
          backgroundColor: theme.colors.primary,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.lg,
          alignItems: 'center',
          opacity: saving ? 0.6 : 1,
        },
        buttonText: {
          color: theme.colors.onPrimary,
          ...theme.typography.body,
          fontWeight: '700',
        },
      }),
    [theme, saving]
  );

  return (
    <AppCard mode="outlined" marginBottom="lg">
      <View style={{ padding: theme.spacing.lg }}>
        <Text style={styles.title}>Today's check-in</Text>

        <Text style={styles.label}>Mood: {mood} ({moodLabel})</Text>
        <Slider
          value={mood}
          onValueChange={(v) => setMood(Math.round(v))}
          minimumValue={1}
          maximumValue={5}
          step={1}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.outlineVariant}
          thumbTintColor={theme.colors.primary}
        />

        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Sleep (hours): {sleep.toFixed(1)}</Text>
          <Slider
            value={sleep}
            onValueChange={(v) => setSleep(Math.round(v * 10) / 10)}
            minimumValue={0}
            maximumValue={12}
            step={0.1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.outlineVariant}
            thumbTintColor={theme.colors.primary}
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What helped or hindered today?"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            mode="outlined"
            style={styles.textInput}
            outlineColor={theme.colors.outlineVariant}
            activeOutlineColor={theme.colors.primary}
          />
        </View>

        <TouchableOpacity
          onPress={() => onSave({ mood, sleep_hours: sleep, note })}
          disabled={!!saving}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save today'}</Text>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}
