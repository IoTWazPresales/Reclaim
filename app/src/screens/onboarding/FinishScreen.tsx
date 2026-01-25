import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Button, useTheme, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { completeOnboarding } from './completeOnboarding';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { logTelemetry } from '@/lib/telemetry';
import { markInsightSeen, filterUnseenInsights } from '@/lib/insights/seenStore';
import { useAuth } from '@/providers/AuthProvider';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Finish'>;

interface FinishScreenProps {
  onFinish: () => void;
}

export default function FinishScreen({ onFinish }: FinishScreenProps) {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const insightStatus = insightsCtx.status;
  const { session } = useAuth();

  useEffect(() => {
    // If RootNavigator flips to App after completion, this screen will unmount naturally.
  }, []);

  // Filtered unseen insights (for rotation policy)
  const [unseenInsights, setUnseenInsights] = useState<typeof rankedInsights>(rankedInsights);

  // Filter insights to unseen candidates (async, non-blocking)
  useEffect(() => {
    if (!rankedInsights?.length) {
      setUnseenInsights(rankedInsights);
      return;
    }

    const userId = session?.user?.id ?? null;
    const nowTs = Date.now();

    filterUnseenInsights({
      insights: rankedInsights,
      screen: 'finish',
      userId,
      nowTs,
    })
      .then((filtered) => {
        // If all are seen, fall back to original list (show something)
        setUnseenInsights(filtered.length > 0 ? filtered : rankedInsights);
      })
      .catch(() => {
        // On error, use original list
        setUnseenInsights(rankedInsights);
      });
  }, [rankedInsights, session?.user?.id]);

  // Use unseen insights if available, otherwise fall back to rankedInsights
  const insight = unseenInsights?.[0] ?? rankedInsights?.[0];
  const showInsight = insightStatus === 'ready' && insight;

  // Track last logged insight ID to prevent spam
  const lastLoggedInsightIdRef = useRef<string | null>(null);

  // Log insight_shown telemetry and mark as seen when insight ID changes
  useEffect(() => {
    if (!insight) return;
    const currentId = insight.id;
    if (lastLoggedInsightIdRef.current === currentId) return; // Already logged this insight

    lastLoggedInsightIdRef.current = currentId;
    const userId = session?.user?.id ?? null;
    const nowTs = Date.now();

    // Log telemetry
    logTelemetry({
      name: 'insight_shown',
      properties: {
        insightId: currentId,
        screenSource: 'finish',
        sourceTag: insight.sourceTag ?? null,
        scopes: Array.isArray((insight as any).scopes) ? (insight as any).scopes : null,
      },
    }).catch(() => {}); // Non-blocking, don't fail if telemetry fails

    // Mark as seen
    markInsightSeen({
      userId,
      screen: 'finish',
      insightId: currentId,
      ts: nowTs,
    }).catch(() => {}); // Non-blocking
  }, [insight?.id, insight?.sourceTag, session?.user?.id]);

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.colors.background }}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginBottom: 16, alignSelf: 'flex-start' }}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 8, color: theme.colors.onSurface }}>You're set.</Text>
        <Text style={{ opacity: 0.8, marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
          Log once a day to unlock more personal insights. No streaks required.
        </Text>

        {showInsight ? (
          <InsightCard insight={insight as any} screenSource="finish" />
        ) : (
          <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>No insight yet.</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                Log once and we'll start tailoring guidance for you.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      <View style={{ paddingTop: 16 }}>
        <Button
          mode="contained"
          onPress={async () => {
            console.log('[ONBOARD] GoToApp pressed');
            await completeOnboarding();
            onFinish();
          }}
        >
          Go to app
        </Button>
      </View>
    </View>
  );
}


