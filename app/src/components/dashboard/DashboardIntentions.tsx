import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { formatRange, ROUTINE_NO_SLOT_REASON } from '@/lib/dashboard/utils';
import type { RoutineSuggestion } from './DashboardToday';

export type DashboardIntentionsProps = {
  routineSuggestions: RoutineSuggestion[];
  reviewExpanded: boolean;
  onAcceptRoutine: (tpl: RoutineSuggestion['template'], start: Date, end: Date) => void;
  onAdjustRoutine: (tpl: RoutineSuggestion['template'], start: Date, end: Date) => void;
  onSkipRoutine: (tpl: RoutineSuggestion['template']) => void;
  isAcceptAllSafe: boolean;
  onAcceptAll: () => void;
};

function intentionActions(
  sugg: RoutineSuggestion,
  hasSlot: boolean,
  onAcceptRoutine: DashboardIntentionsProps['onAcceptRoutine'],
  onAdjustRoutine: DashboardIntentionsProps['onAdjustRoutine'],
  onSkipRoutine: DashboardIntentionsProps['onSkipRoutine'],
) {
  return (
    <View style={styles.actionRow}>
      <Button
        mode={hasSlot ? 'contained-tonal' : 'outlined'}
        onPress={() => {
          if (hasSlot) onAcceptRoutine(sugg.template, sugg.start, sugg.end);
          else onAdjustRoutine(sugg.template, sugg.start, sugg.end);
        }}
        compact
        style={styles.actionBtn}
      >
        Accept
      </Button>
      <Button mode="text" onPress={() => onAdjustRoutine(sugg.template, sugg.start, sugg.end)} compact style={styles.actionBtn}>
        Adjust
      </Button>
      <Button mode="text" onPress={() => onSkipRoutine(sugg.template)} compact style={styles.actionBtn}>
        Not today
      </Button>
    </View>
  );
}

export function DashboardIntentions({
  routineSuggestions,
  reviewExpanded,
  onAcceptRoutine,
  onAdjustRoutine,
  onSkipRoutine,
  isAcceptAllSafe,
  onAcceptAll,
}: DashboardIntentionsProps) {
  const theme = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const showAll = reviewExpanded || moreOpen;
  const visible = showAll ? routineSuggestions : routineSuggestions.slice(0, 1);
  const hiddenCount = Math.max(0, routineSuggestions.length - visible.length);
  const [featured, ...restVisible] = visible;

  if (routineSuggestions.length === 0) return null;

  const hasSlotFeatured =
    !!featured && !!featured.start && !!featured.end && featured.reason !== ROUTINE_NO_SLOT_REASON;

  return (
    <InformationalCard
      feedbackScope={{ componentKey: 'dashboard-intentions', componentTitle: 'Intentions', tags: ['dashboard'] }}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 14 }}
    >
      <FeatureCardHeader
        icon="lightbulb-outline"
        title="Intentions"
        subtitle="Optional adds — place if they fit, or skip without reshaping your plan."
      />

      {featured ? (
        <View style={{ marginTop: 6 }}>
          <Text
            variant="labelSmall"
            style={[styles.kicker, { color: theme.colors.onSurfaceVariant }]}
          >
            SUGGESTED
          </Text>
          <Text variant="titleMedium" style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
            {featured.template.title}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, fontWeight: '500' }}>
            {hasSlotFeatured ? formatRange(featured.start, featured.end) : 'Pick a time to place this.'}
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant, opacity: 0.82, lineHeight: 18 }}>
            {featured.reason}
          </Text>
          <View style={{ marginTop: 10 }}>
            {intentionActions(featured, hasSlotFeatured, onAcceptRoutine, onAdjustRoutine, onSkipRoutine)}
          </View>
        </View>
      ) : null}

      {restVisible.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          {restVisible.map((sugg, idx) => {
            const hasSlot = !!sugg.start && !!sugg.end && sugg.reason !== ROUTINE_NO_SLOT_REASON;
            return (
              <View
                key={sugg.template.id}
                style={[
                  idx === 0 ? styles.secondaryFirst : styles.secondaryNext,
                  {
                    borderTopColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                  },
                ]}
              >
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {sugg.template.title}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant }}>
                  {hasSlot ? formatRange(sugg.start, sugg.end) : 'Pick a time to place this.'}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant, opacity: 0.8 }} numberOfLines={2}>
                  {sugg.reason}
                </Text>
                <View style={{ marginTop: 8 }}>
                  {intentionActions(sugg, hasSlot, onAcceptRoutine, onAdjustRoutine, onSkipRoutine)}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {!reviewExpanded && hiddenCount > 0 && !moreOpen ? (
        <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
          <Button mode="text" compact onPress={() => setMoreOpen(true)}>
            Show {hiddenCount} more
          </Button>
        </View>
      ) : null}

      {!reviewExpanded && moreOpen && routineSuggestions.length > 1 ? (
        <View style={{ marginTop: 6, alignItems: 'flex-start' }}>
          <Button mode="text" compact onPress={() => setMoreOpen(false)}>
            Show less
          </Button>
        </View>
      ) : null}

      {isAcceptAllSafe && !reviewExpanded && routineSuggestions.length >= 2 ? (
        <View style={styles.acceptAllRow}>
          <Button mode="outlined" onPress={onAcceptAll} compact>
            Accept all
          </Button>
        </View>
      ) : null}
    </InformationalCard>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.85,
    fontSize: 10,
    opacity: 0.78,
    marginBottom: 4,
  },
  featureTitle: {
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.25,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: -4,
  },
  actionBtn: {
    marginVertical: 0,
  },
  secondaryFirst: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryNext: {
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  acceptAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
});
