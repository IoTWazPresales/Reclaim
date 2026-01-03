import React from 'react';
import { View, Text, Alert } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Sleep'>;

export default function SleepStepScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();

  const goNext = () => navigation.replace('Finish');

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
        Connect sleep
      </Text>
      <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
        Choose how you want to bring in sleep: connect data or log manually.
      </Text>

      <Button
        mode="contained"
        onPress={() => {
          Alert.alert('Sleep', 'So Reclaim can see your sleep — nothing else.');
          goNext();
        }}
        style={{ marginBottom: 12 }}
      >
        Connect health data
      </Button>

      <Button mode="outlined" onPress={goNext} style={{ marginBottom: 12 }}>
        Log manually
      </Button>

      <Button mode="text" onPress={goNext}>
        Do later
      </Button>
    </View>
  );
}


