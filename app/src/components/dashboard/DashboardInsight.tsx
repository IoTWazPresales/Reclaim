import React from 'react';
import { Linking, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InsightCard } from '@/components/InsightCard';
import { InformationalCard, ReclaimButton } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import { logger } from '@/lib/logger';

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
      <InformationalCard>
        <FeatureCardHeader icon="lightbulb-on-outline" title="Daily signal" subtitle="Scientific insights are paused." />
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
      <InformationalCard>
        <FeatureCardHeader icon="lightbulb-on-outline" title="Daily signal" subtitle="Updating your read…" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Refreshing…</Text>
        </View>
      </InformationalCard>
    );
  }

  if (insightStatus === 'error') {
    return (
      <InformationalCard>
        <FeatureCardHeader
          icon="lightbulb-on-outline"
          title="Daily signal"
          subtitle="Couldn’t refresh this read."
          rightSlot={
            <ReclaimButton variant="tertiary" onPress={onRefreshPress}>
              Try again
            </ReclaimButton>
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
          embedInTightVerticalStack
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
            <ReclaimButton
              variant="ghost"
              compact
              onPress={() => Linking.openURL('tel:988').catch((e) => { if (__DEV__) logger.debug('[DashboardInsight]', e); })}
              accessibilityLabel="Call or text 988 Suicide and Crisis Lifeline"
            >
              Call or text 988
            </ReclaimButton>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <InformationalCard>
      <FeatureCardHeader icon="lightbulb-on-outline" title="Daily signal" subtitle="Your primary read for today." />
      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
        Log a mood check-in so Reclaim can start building your personalised daily signal.
      </Text>
      <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
        <ReclaimButton variant="primary" onPress={onRefreshPress} contentStyle={{ minHeight: 46 }}>
          Check for signal
        </ReclaimButton>
      </View>
    </InformationalCard>
  );
}
