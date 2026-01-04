import React from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Button, useTheme, Card } from 'react-native-paper';
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>
            Connect sleep
          </Text>
          <Text style={{ opacity: 0.8, marginBottom: 20, color: theme.colors.onSurfaceVariant }}>
            Choose how you want to bring in sleep: connect data or log manually.
          </Text>

          <Card mode="outlined" style={{ marginBottom: 24, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ marginBottom: 12, color: theme.colors.onSurface, fontWeight: '700' }}>
                Example sleep session
              </Text>
              <Text variant="bodyMedium" style={{ marginBottom: 4, color: theme.colors.onSurface }}>
                Last night
              </Text>
              <Text variant="bodyLarge" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
                23:00 → 07:30
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                8.5 hours • Efficiency: 85%
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      <View style={{ paddingTop: 16 }}>
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
    </View>
  );
}


