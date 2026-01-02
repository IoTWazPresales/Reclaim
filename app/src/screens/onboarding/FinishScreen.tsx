import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Button, useTheme, Card } from 'react-native-paper';
import { completeOnboarding } from './completeOnboarding';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';

export default function FinishScreen() {
  const theme = useTheme();
  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const insightStatus = insightsCtx.status;

  useEffect(() => {
    // If RootNavigator flips to App after completion, this screen will unmount naturally.
  }, []);

  const insight = rankedInsights?.[0];
  const showInsight = insightStatus === 'ready' && insight;

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>You’re set.</Text>
      <Text style={{ opacity: 0.8, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
        Log once a day to unlock more personal insights. No streaks required.
      </Text>

      {showInsight ? (
        <InsightCard insight={insight as any} />
      ) : (
        <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
          <Card.Content>
            <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>No insight yet.</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Log once and we’ll start tailoring guidance for you.
            </Text>
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        onPress={async () => {
          await completeOnboarding();
        }}
        style={{ marginTop: 12 }}
      >
        Go to app
      </Button>
    </View>
  );
}


