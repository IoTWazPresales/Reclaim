import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { ScheduleItem } from '@/lib/dashboard/types';
import type { RoutineTemplate } from '@/lib/routines';
import { formatTime } from '@/lib/dashboard/utils';

export type RoutineSuggestion = {
  template: RoutineTemplate;
  start: Date;
  end: Date;
  reason: string;
  state: string;
};

export type TodayPlanTomorrowPreview = {
  label: string;
  onPress: () => void;
};

export type DashboardTodayProps = {
  /** Anchored items for today only, excluding whatever Next up already owns. */
  scheduleItems: ScheduleItem[];
  isLoading: boolean;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
  onOpenSchedule: () => void;
  onSyncHealth: () => void;
  isSyncing: boolean;
  /** Shown only when there are no remaining today anchors; opens schedule. */
  tomorrowPreview?: TodayPlanTomorrowPreview | null;
};

const GRACE_MS = 60 * 1000;

function AgendaRow({
  item,
  onTakeDose,
  takeDosePending,
  takeDoseMedId,
  takeDoseScheduledISO,
  isLast,
}: {
  item: ScheduleItem;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
  isLast: boolean;
}) {
  const theme = useTheme();
  const isPast = item.time.getTime() < Date.now() - GRACE_MS;
  const timeLabel = formatTime(item.time);
  const stripe = (() => {
    switch (item.kind) {
      case 'med':
        return theme.colors.primary;
      case 'sleep':
        return theme.colors.secondary;
      default:
        return theme.colors.outlineVariant ?? theme.colors.outline;
    }
  })();

  const a11yLabel =
    item.kind === 'med'
      ? `${timeLabel}, ${item.title}. Mark as taken.`
      : `${timeLabel}, ${item.title}`;

  return (
    <Pressable
      onPress={item.onPress}
      disabled={!item.onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={[
        styles.agendaRow,
        { opacity: isPast ? 0.5 : 1 },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)',
        },
      ]}
    >
      <View style={styles.agendaMarkerCol}>
        <View style={[styles.agendaRing, { borderColor: stripe }]}>
          <View style={[styles.agendaDot, { backgroundColor: stripe }]} />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingRight: 8, paddingVertical: 2 }}>
        <Text
          variant="labelLarge"
          style={{
            color: theme.colors.onSurface,
            fontWeight: '700',
            fontSize: 13,
            letterSpacing: -0.15,
          }}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text
          variant="bodySmall"
          style={{
            marginTop: 3,
            color: theme.colors.primary,
            fontWeight: '600',
            fontSize: 11,
            letterSpacing: 0.2,
          }}
        >
          {timeLabel}
        </Text>
        {item.subtitle ? (
          <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.9 }} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {item.kind === 'med' ? (
        <Button
          mode="contained-tonal"
          compact
          onPress={() => onTakeDose(item.medId, item.scheduledISO)}
          loading={takeDosePending && takeDoseMedId === item.medId && takeDoseScheduledISO === item.scheduledISO}
          disabled={takeDosePending && takeDoseMedId === item.medId && takeDoseScheduledISO === item.scheduledISO}
        >
          Taken
        </Button>
      ) : null}
    </Pressable>
  );
}

const INITIAL_VISIBLE = 5;

export function DashboardToday({
  scheduleItems,
  isLoading,
  onTakeDose,
  takeDosePending,
  takeDoseMedId,
  takeDoseScheduledISO,
  onOpenSchedule,
  onSyncHealth,
  isSyncing,
  tomorrowPreview,
}: DashboardTodayProps) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? scheduleItems : scheduleItems.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, scheduleItems.length - visible.length);
  const hasRows = scheduleItems.length > 0;

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-today', componentTitle: 'Today plan', tags: ['dashboard'] }}>
      <FeatureCardHeader
        icon="calendar-today"
        title="Today plan"
        subtitle="The rest of what’s already on your day — Next up handles your immediate action."
      />

      <View style={{ marginTop: 10 }}>
        {isLoading ? <ActivityIndicator style={{ paddingVertical: 8 }} /> : null}

        {!isLoading && !hasRows ? (
          <View style={{ paddingVertical: 8 }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
              No more anchors left today
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
              You’re clear of other fixed moments for the rest of the day. Intentions below are optional adds.
            </Text>
            {tomorrowPreview ? (
              <Button mode="text" compact onPress={tomorrowPreview.onPress} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                Tomorrow · {tomorrowPreview.label}
              </Button>
            ) : null}
          </View>
        ) : null}

        {!isLoading && hasRows ? (
          <>
            <View
              style={[
                styles.timelineRail,
                {
                  borderColor: theme.dark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.28)',
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.025)',
                },
              ]}
            >
              {visible.map((it, idx) => (
                <AgendaRow
                  key={it.key}
                  item={it}
                  onTakeDose={onTakeDose}
                  takeDosePending={takeDosePending}
                  takeDoseMedId={takeDoseMedId}
                  takeDoseScheduledISO={takeDoseScheduledISO}
                  isLast={idx === visible.length - 1}
                />
              ))}
            </View>

            {hiddenCount > 0 && !showAll ? (
              <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
                <Button mode="text" compact onPress={() => setShowAll(true)}>
                  Show more ({hiddenCount})
                </Button>
              </View>
            ) : null}
            {showAll && scheduleItems.length > INITIAL_VISIBLE ? (
              <View style={{ marginTop: 4, alignItems: 'flex-start' }}>
                <Button mode="text" compact onPress={() => setShowAll(false)}>
                  Show less
                </Button>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        <Button mode="outlined" onPress={onOpenSchedule} compact icon="calendar-month-outline">
          Open schedule
        </Button>
        <Button mode="outlined" onPress={onSyncHealth} compact loading={isSyncing} disabled={isSyncing}>
          Sync health
        </Button>
      </View>
    </InformationalCard>
  );
}

const styles = StyleSheet.create({
  timelineRail: {
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 6,
  },
  agendaMarkerCol: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  agendaRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  agendaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
