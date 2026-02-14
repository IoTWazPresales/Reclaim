import React from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Button, Card, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { ScheduleItem } from '@/lib/dashboard/types';
import type { RoutineTemplate } from '@/lib/routines';
import { formatTime, formatRange, ROUTINE_NO_SLOT_REASON } from '@/lib/dashboard/utils';

export type RoutineSuggestion = {
  template: RoutineTemplate;
  start: Date;
  end: Date;
  reason: string;
  state: string;
};

export type DashboardTodayProps = {
  scheduleItems: ScheduleItem[];
  isLoading: boolean;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
  onOpenSchedule: () => void;
  onSyncHealth: () => void;
  isSyncing: boolean;
  routineSuggestions: RoutineSuggestion[];
  reviewExpanded: boolean;
  onAcceptRoutine: (tpl: RoutineTemplate, start: Date, end: Date) => void;
  onAdjustRoutine: (tpl: RoutineTemplate, start: Date, end: Date) => void;
  onSkipRoutine: (tpl: RoutineTemplate) => void;
  isAcceptAllSafe: boolean;
  onAcceptAll: () => void;
  cardRadius: number;
  cardSurface: string;
};

function ScheduleRow({
  item,
  onTakeDose,
  takeDosePending,
  takeDoseMedId,
  takeDoseScheduledISO,
}: {
  item: ScheduleItem;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
}) {
  const theme = useTheme();
  const isPast = item.time.getTime() < Date.now() - 60 * 1000;
  const timeLabel = formatTime(item.time);
  const leftTitle = item.kind === 'med' ? timeLabel : `${timeLabel} • ${item.title}`;
  const line2 = item.kind === 'med' ? item.title : item.subtitle ?? '';

  const kindStyle = (() => {
    switch (item.kind) {
      case 'med':
        return {
          bg: theme.colors.primaryContainer,
          stripe: theme.colors.primary,
          iconBg: theme.colors.background,
          iconColor: theme.colors.onSurface,
        };
      case 'sleep':
        return {
          bg: theme.colors.secondaryContainer,
          stripe: theme.colors.secondary,
          iconBg: theme.colors.background,
          iconColor: theme.colors.onSurface,
        };
      case 'info':
      default:
        return {
          bg: theme.colors.surfaceVariant,
          stripe: theme.colors.outlineVariant ?? theme.colors.outline,
          iconBg: theme.colors.background,
          iconColor: theme.colors.onSurface,
        };
    }
  })();

  const a11yLabel =
    item.kind === 'med'
      ? `${leftTitle}, ${line2}. Mark as taken.`
      : item.kind === 'sleep'
        ? `Sleep: ${leftTitle}`
        : `${leftTitle}${line2 ? `, ${line2}` : ''}`;

  return (
    <Pressable
      onPress={item.onPress}
      disabled={!item.onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: kindStyle.bg,
        marginBottom: 10,
        opacity: isPast ? 0.6 : 1,
        borderLeftWidth: 4,
        borderLeftColor: kindStyle.stripe,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: kindStyle.iconBg,
        }}
      >
        <MaterialCommunityIcons name={item.icon} size={20} color={kindStyle.iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {leftTitle}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
          {line2}
        </Text>
        {item.kind === 'med' && item.subtitle ? (
          <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.85 }}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {item.kind === 'med' ? (
        <Button
          mode="contained"
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
  routineSuggestions,
  reviewExpanded,
  onAcceptRoutine,
  onAdjustRoutine,
  onSkipRoutine,
  isAcceptAllSafe,
  onAcceptAll,
  cardRadius,
  cardSurface,
}: DashboardTodayProps) {
  const theme = useTheme();

  return (
    <InformationalCard>
      <FeatureCardHeader icon="calendar-today" title="Today" subtitle="Your schedule, simplified." />

      <View style={{ marginTop: 10 }}>
        {isLoading ? <ActivityIndicator style={{ paddingVertical: 8 }} /> : null}

        {!isLoading && scheduleItems.length === 0 ? (
          <View style={{ paddingVertical: 12 }}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Nothing scheduled yet. Add meds, set a wake time, or add calendar events.
            </Text>
          </View>
        ) : null}

        {scheduleItems.map((it) => (
          <ScheduleRow
            key={it.key}
            item={it}
            onTakeDose={onTakeDose}
            takeDosePending={takeDosePending}
            takeDoseMedId={takeDoseMedId}
            takeDoseScheduledISO={takeDoseScheduledISO}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        <Button mode="outlined" onPress={onOpenSchedule} compact icon="calendar-month-outline">
          Open schedule
        </Button>
        <Button mode="outlined" onPress={onSyncHealth} compact loading={isSyncing} disabled={isSyncing}>
          Sync health
        </Button>
      </View>

      {routineSuggestions.length > 0 ? (
        <>
          <View style={{ marginTop: 20, marginBottom: 10 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Today's intentions
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {(reviewExpanded ? routineSuggestions : routineSuggestions).map((sugg) => {
              const hasSlot = !!sugg.start && !!sugg.end && sugg.reason !== ROUTINE_NO_SLOT_REASON;
              return (
                <Card
                  key={sugg.template.id}
                  mode="elevated"
                  style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}
                >
                  <Card.Content style={{ gap: 6 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {sugg.template.title}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {hasSlot ? formatRange(sugg.start, sugg.end) : 'Pick a time to place this.'}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                      {sugg.reason}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button
                        mode={hasSlot ? 'contained' : 'outlined'}
                        onPress={() => {
                          if (hasSlot) {
                            onAcceptRoutine(sugg.template, sugg.start, sugg.end);
                          } else {
                            onAdjustRoutine(sugg.template, sugg.start, sugg.end);
                          }
                        }}
                        compact
                      >
                        Accept
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => onAdjustRoutine(sugg.template, sugg.start, sugg.end)}
                        compact
                      >
                        Adjust
                      </Button>
                      <Button mode="text" onPress={() => onSkipRoutine(sugg.template)} compact>
                        Not today
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
          {isAcceptAllSafe && !reviewExpanded ? (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
              <Button mode="contained-tonal" onPress={onAcceptAll} compact>
                Accept all
              </Button>
            </View>
          ) : null}
        </>
      ) : null}
    </InformationalCard>
  );
}
