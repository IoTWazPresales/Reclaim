import React from 'react';
import { Linking, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InsightCard } from '@/components/InsightCard';
import { InsightQuotaBadge } from '@/components/premium/InsightQuotaBadge';
import { MedicationContextFootnotes } from '@/components/MedicationContextFootnotes';
import { Reveal } from '@/components/motion/Reveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
  /** Optional medication context (wording only; from insight context builder) */
  medicationContextHints?: string[];
  onUpgradePress?: () => void;
};

export function DashboardInsight({
  insightsEnabled,
  insightStatus,
  dashboardInsight,
  onActionPress,
  onRefreshPress,
  isProcessing,
  medicationContextHints,
  onUpgradePress,
}: DashboardInsightProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [dismissedInsightId, setDismissedInsightId] = React.useState<string | null>(null);

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
    // Dismissible — but the crisis read stays until state changes.
    if (!isSustainedLow && dismissedInsightId === dashboardInsight.id) {
      return null;
    }
    return (
      <Reveal delay={0}>
        <Animated.View
          key={dashboardInsight.id}
          entering={reduceMotion ? undefined : FadeIn.duration(320)}
          exiting={reduceMotion ? undefined : FadeOut.duration(200)}
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
        {onUpgradePress ? (
          <View style={{ marginBottom: 10 }}>
            <InsightQuotaBadge onUpgradePress={onUpgradePress} />
          </View>
        ) : (
          <View style={{ marginBottom: 10 }}>
            <InsightQuotaBadge />
          </View>
        )}
        <InsightCard
          insight={dashboardInsight}
          onActionPress={onActionPress}
          onRefreshPress={onRefreshPress}
          onDismiss={isSustainedLow ? undefined : () => setDismissedInsightId(dashboardInsight.id)}
          isProcessing={isProcessing}
          disabled={isProcessing}
          testID="dashboard-insight-card"
          screenSource="dashboard"
          embedInTightVerticalStack
        />
        {medicationContextHints?.length ? (
          <MedicationContextFootnotes hints={medicationContextHints} accessibilityLabel="Medication context for daily signal" />
        ) : null}
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
        </Animated.View>
      </Reveal>
    );
  }

  return (
    <View>
      {onUpgradePress ? (
        <View style={{ marginBottom: 10 }}>
          <InsightQuotaBadge onUpgradePress={onUpgradePress} />
        </View>
      ) : (
        <View style={{ marginBottom: 10 }}>
          <InsightQuotaBadge />
        </View>
      )}
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
      {medicationContextHints?.length ? (
        <MedicationContextFootnotes hints={medicationContextHints} accessibilityLabel="Medication context for daily signal" />
      ) : null}
    </View>
  );
}
