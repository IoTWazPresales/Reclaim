import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, useTheme, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/routing/OnboardingNavigator';
import { completeOnboarding } from './completeOnboarding';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { logTelemetry } from '@/lib/telemetry';
import { markInsightSeen, filterUnseenInsights } from '@/lib/insights/seenStore';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import { useSyncOnboardingRoute } from '@/hooks/useSyncOnboardingRoute';
import { hasOnboardingMoodSavedHint } from '@/lib/onboardingProgress';
import Animated, {
  FadeInUp,
  ZoomIn,
  ReduceMotion,
} from 'react-native-reanimated';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Finish'>;

interface FinishScreenProps {
  onFinish: () => void;
}

const enter = (delay: number) =>
  FadeInUp.delay(delay).duration(500).springify().damping(22).reduceMotion(ReduceMotion.System);

export default function FinishScreen({ onFinish }: FinishScreenProps) {
  const theme         = useTheme();
  const navigation    = useNavigation<Nav>();
  const insightsCtx   = useScientificInsights();
  const rankedInsights  = insightsCtx.insights;
  const insightStatus   = insightsCtx.status;
  const insightError    = insightsCtx.error;
  const refreshInsights = insightsCtx.refresh;
  const { session }   = useAuth();
  useSyncOnboardingRoute('Finish');

  const [unseenInsights, setUnseenInsights] = useState<typeof rankedInsights>(rankedInsights);
  const [moodSavedDuringOnboarding, setMoodSavedDuringOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hint = await hasOnboardingMoodSavedHint(session?.user?.id);
      if (!cancelled) setMoodSavedDuringOnboarding(hint);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!rankedInsights?.length) { setUnseenInsights(rankedInsights); return; }
    const userId = session?.user?.id ?? null;
    const nowTs  = Date.now();
    filterUnseenInsights({ insights: rankedInsights, screen: 'finish', userId, nowTs })
      .then(filtered => setUnseenInsights(filtered.length > 0 ? filtered : rankedInsights))
      .catch(() => setUnseenInsights(rankedInsights));
  }, [rankedInsights, session?.user?.id]);

  const insight    = unseenInsights?.[0] ?? rankedInsights?.[0];
  const showInsight = insightStatus === 'ready' && insight;
  const insightLoading = insightStatus === 'idle' || insightStatus === 'loading';

  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!insight) return;
    const currentId = insight.id;
    if (lastLoggedRef.current === currentId) return;
    lastLoggedRef.current = currentId;

    const userId = session?.user?.id ?? null;
    const nowTs  = Date.now();
    logTelemetry({
      name: 'insight_shown',
      properties: {
        insightId:   currentId,
        screenSource: 'finish',
        sourceTag:   insight.sourceTag ?? null,
        scopes:      Array.isArray((insight as any).scopes) ? (insight as any).scopes : null,
      },
    }).catch((e) => { if (__DEV__) logger.debug('[FinishScreen]', e); });
    markInsightSeen({ userId, screen: 'finish', insightId: currentId, ts: nowTs }).catch((e) => { if (__DEV__) logger.debug('[FinishScreen]', e); });
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
        {/* Animated checkmark badge */}
        <Animated.View
          entering={ZoomIn
            .delay(0)
            .duration(600)
            .springify()
            .damping(12)
            .reduceMotion(ReduceMotion.System)
          }
          style={{ alignSelf: 'flex-start', marginBottom: 20 }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: theme.colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: theme.colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <MaterialCommunityIcons
              name="check-bold"
              size={30}
              color={theme.colors.primary}
            />
          </View>
        </Animated.View>

        <Animated.View entering={enter(120)}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              marginBottom: 10,
              color: theme.colors.onSurface,
              lineHeight: 34,
            }}
          >
            Welcome to Reclaim.
          </Text>
          <Text
            style={{
              opacity: 0.8,
              marginBottom: 24,
              color: theme.colors.onSurfaceVariant,
              lineHeight: 22,
              fontSize: 15,
            }}
          >
            Log mood daily to unlock personalised insights.{'\n'}No streaks, no pressure.
            {moodSavedDuringOnboarding ? (
              <>
                {'\n'}
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  Your check-in from setup is saved.
                </Text>
              </>
            ) : null}
          </Text>
        </Animated.View>

        <Animated.View entering={enter(260)}>
          {insightStatus === 'error' ? (
            <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
              <Card.Content>
                <Text style={{ color: theme.colors.error, marginBottom: 12, lineHeight: 20 }}>
                  {insightError ?? 'Insights could not be loaded.'}
                </Text>
                <Button mode="outlined" onPress={() => refreshInsights('finish_retry')}>
                  Try again
                </Button>
              </Card.Content>
            </Card>
          ) : insightLoading ? (
            <Card mode="outlined" style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 28 }}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                  Preparing your first insight…
                </Text>
              </Card.Content>
            </Card>
          ) : showInsight ? (
            <InsightCard insight={insight as any} screenSource="finish" />
          ) : (
            <Card
              mode="outlined"
              style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}
            >
              <Card.Content>
                <Text
                  variant="labelSmall"
                  style={{
                    color: theme.colors.primary,
                    marginBottom: 8,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                  }}
                >
                  Your first insight
                </Text>
                <Text
                  style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6 }}
                >
                  Log once — we'll start tailoring guidance for you.
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                  The more you log, the more personal it gets.
                </Text>
              </Card.Content>
            </Card>
          )}
        </Animated.View>
      </View>

      <Animated.View entering={enter(380)} style={{ paddingTop: 16 }}>
        <Text
          variant="bodySmall"
          style={{
            marginBottom: 14,
            color: theme.colors.onSurfaceVariant,
            lineHeight: 20,
            fontSize: 14,
          }}
        >
          Next you&apos;ll land on <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Home</Text>. Your
          daily signal sits at the top; use the menu for Sleep, Mood, Meds, and Training.
        </Text>
        <Button
          mode="contained"
          onPress={async () => {
            try {
              await completeOnboarding();
            } catch (e: any) {
              // Non-critical: always proceed to the app even if marking fails
              if (__DEV__) console.warn('[FinishScreen] completeOnboarding error:', e?.message);
            }
            onFinish();
          }}
          contentStyle={{ paddingVertical: 4 }}
        >
          Go to app
        </Button>
      </Animated.View>
    </View>
  );
}
