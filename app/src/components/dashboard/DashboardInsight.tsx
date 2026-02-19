import React from 'react';
import { Linking, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InsightCard } from '@/components/InsightCard';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { InsightMatch } from '@/lib/insights/InsightEngine';

const CRISIS_ID = 'mood-sustained-low';

export type DashboardInsightProps = {
  insightsEnabled: boolean;
  insightStatus: 'idle' | 'loading' | 'ready' | 'error';
  dashboardInsight: InsightMatch | null;
  onActionPress: () => void;
  onRefreshPress: () => void;
  isProcessing: boolean;
};

export function DashboardInsight({
  insightsEnabled,
  insightStatus,
  dashboardInsight,
  onActionPress,
  onRefreshPress,
  isProcessing,
}: DashboardInsightProps) {
  const theme = useTheme();

  if (!insightsEnabled) {
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-insight-off', componentTitle: "Today's insight", tags: ['dashboard'] }}>
        <FeatureCardHeader icon="lightbulb-on-outline" title="Today's insight" subtitle="One helpful nudge." />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
          Scientific insights are turned off.
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Re-enable them in Settings → Scientific insights to see tailored nudges here.
        </Text>
      </InformationalCard>
    );
  }

  if (insightStatus === 'loading') {
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-insight-loading', componentTitle: "Today's insight", tags: ['dashboard'] }}>
        <FeatureCardHeader icon="lightbulb-on-outline" title="Today's insight" subtitle="One helpful nudge." />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Refreshing…</Text>
        </View>
      </InformationalCard>
    );
  }

  if (insightStatus === 'error') {
    return (
      <InformationalCard feedbackScope={{ componentKey: 'dashboard-insight-error', componentTitle: "Today's insight", tags: ['dashboard'] }}>
        <FeatureCardHeader
          icon="lightbulb-on-outline"
          title="Today's insight"
          subtitle="One helpful nudge."
          rightSlot={
            <Button mode="text" compact onPress={onRefreshPress}>
              Try again
            </Button>
          }
        />
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          We couldn't refresh insights right now.
        </Text>
      </InformationalCard>
    );
  }

  if (insightStatus === 'ready' && dashboardInsight) {
    const isSustainedLow = dashboardInsight.id === CRISIS_ID;
    return (
      <View
        style={
          isSustainedLow
            ? {
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: 'rgba(251, 191, 36, 0.55)',
              }
            : undefined
        }
      >
        <InsightCard
          insight={dashboardInsight}
          onActionPress={onActionPress}
          onRefreshPress={onRefreshPress}
          isProcessing={isProcessing}
          disabled={isProcessing}
          testID="dashboard-insight-card"
          screenSource="dashboard"
        />
        {isSustainedLow ? (
          <View
            style={{
              marginTop: -12,
              marginBottom: 16,
              marginHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <MaterialCommunityIcons name="phone-outline" size={16} color={theme.colors.onSurfaceVariant} />
            <Button
              mode="text"
              compact
              onPress={() => Linking.openURL('tel:988').catch(() => {})}
              accessibilityLabel="Call or text 988 Suicide and Crisis Lifeline"
            >
              Call or text 988
            </Button>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-insight-empty', componentTitle: "Today's insight", tags: ['dashboard'] }}>
      <FeatureCardHeader icon="lightbulb-on-outline" title="Today's signal" subtitle="Your daily personalised nudge." />
      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
        Log a mood check-in so Reclaim can start building your personalised daily signal.
      </Text>
      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
        <Button mode="contained-tonal" compact onPress={onRefreshPress}>
          Check for signal
        </Button>
      </View>
    </InformationalCard>
  );
}
