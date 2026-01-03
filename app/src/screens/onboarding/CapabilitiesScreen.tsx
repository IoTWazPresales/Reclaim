import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Capabilities'>;

const slides = [
  { title: 'Daily guidance', body: 'A single insight that actually matters today.' },
  { title: 'Mood in two taps', body: 'Check in fast. Track patterns over time.' },
  { title: 'Sleep & meds support', body: 'Keep your recovery steady — without guilt.' },
] as const;

export default function CapabilitiesScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [index, setIndex] = useState(0);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>{slide.title}</Text>
      <Text style={{ opacity: 0.8, marginBottom: 28, color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>{slide.body}</Text>

      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              marginRight: 6,
              backgroundColor: i === index ? theme.colors.primary : theme.colors.outlineVariant,
            }}
          />
        ))}
      </View>

      <Button
        mode="contained"
        onPress={() => {
          if (isLast) {
            navigation.replace('MoodCheckin');
          } else {
            setIndex((i) => Math.min(i + 1, slides.length - 1));
          }
        }}
        style={{ marginBottom: 12 }}
        accessibilityLabel={isLast ? 'Continue to mood check-in' : 'Next capability'}
      >
        {isLast ? 'Continue' : 'Next'}
      </Button>
      <Button mode="text" onPress={() => navigation.replace('MoodCheckin')} accessibilityLabel="Skip to mood check-in">
        Skip
      </Button>
    </View>
  );
}


