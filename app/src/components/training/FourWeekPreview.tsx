// Four Week Preview - Show 4-week program block overview
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, Chip, IconButton } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { ProgramDay, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';

interface FourWeekPreviewProps {
  programDays: ProgramDay[];
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeekMonday(dateIn: Date) {
  const date = new Date(dateIn);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateIn: Date, days: number) {
  const d = new Date(dateIn);
  d.setDate(d.getDate() + days);
  return d;
}

function toYMD(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function FourWeekPreview({ programDays }: FourWeekPreviewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  // Anchor the 4-week view to the earliest program day date (then normalize to Monday)
  const anchorMonday = useMemo(() => {
    if (!programDays || programDays.length === 0) return startOfWeekMonday(new Date());

    const dates = programDays
      .map((pd) => {
        const dt = new Date(pd.date);
        return isNaN(dt.getTime()) ? null : dt;
      })
      .filter(Boolean) as Date[];

    if (dates.length === 0) return startOfWeekMonday(new Date());

    dates.sort((a, b) => a.getTime() - b.getTime());
    return startOfWeekMonday(dates[0]);
  }, [programDays]);

  const weeks = useMemo(() => {
    return [0, 1, 2, 3].map((i) => {
      const start = addDays(anchorMonday, i * 7);
      const end = addDays(start, 6);
      return { index: i + 1, start, end };
    });
  }, [anchorMonday]);

  const toggleWeek = (weekIndex: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekIndex)) {
        next.delete(weekIndex);
      } else {
        next.add(weekIndex);
      }
      return next;
    });
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Filter weeks: remove past weeks with no training days
  const visibleWeeks = useMemo(() => {
    return weeks.filter((wk) => {
      const weekEndDate = new Date(wk.end);
      weekEndDate.setHours(23, 59, 59, 999);
      
      // Keep if week is in the future or includes today
      if (weekEndDate >= today) return true;
      
      // If week is in the past, only keep if it has training days
      const startYMD = toYMD(wk.start);
      const endYMD = toYMD(wk.end);
      const weekDays = (programDays || [])
        .filter((pd) => pd.date >= startYMD && pd.date <= endYMD);
      
      return weekDays.length > 0;
    });
  }, [weeks, programDays, today]);

  return (
    <View style={{ gap: appTheme.spacing.md }}>
      {visibleWeeks.map((wk) => {
        const startYMD = toYMD(wk.start);
        const endYMD = toYMD(wk.end);

        // Filter by date range (not week_index) so this works regardless of how week_index is stored.
        const weekDays = (programDays || [])
          .filter((pd) => pd.date >= startYMD && pd.date <= endYMD)
          .sort((a, b) => a.date.localeCompare(b.date));

        const isExpanded = expandedWeeks.has(wk.index);

        // Collect all intents from week's days for focus labels
        const allWeekIntents = weekDays.reduce((acc, day) => {
          const intents = Array.isArray((day as any).intents) ? ((day as any).intents as MovementIntent[]) : [];
          return [...acc, ...intents];
        }, [] as MovementIntent[]);
        const focusLabels = getPrimaryIntentLabels(Array.from(new Set(allWeekIntents)), 3);

        return (
          <Card key={wk.index} mode="outlined" style={{ borderRadius: appTheme.borderRadius.lg }}>
            <Card.Content style={{ padding: appTheme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: appTheme.spacing.xs,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    variant="titleSmall"
                    style={{
                      fontWeight: '700',
                      marginBottom: appTheme.spacing.xs,
                      color: theme.colors.onSurface,
                    }}
                  >
                    Week {wk.index}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                    {weekDays.length} session{weekDays.length !== 1 ? 's' : ''}
                    {focusLabels.length > 0 ? ` • focus: ${focusLabels.join(' / ')}` : ''}
                  </Text>
                </View>
                <IconButton
                  icon={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  onPress={() => toggleWeek(wk.index)}
                  iconColor={theme.colors.onSurfaceVariant}
                />
              </View>

              {isExpanded ? (
                <View style={{ gap: appTheme.spacing.xs, marginTop: appTheme.spacing.sm }}>
                  {weekDays.length > 0 ? (
                    weekDays.map((day) => {
                      const date = new Date(day.date);
                      const weekdayName = WEEKDAY_NAMES[date.getDay()];
                      const intents = Array.isArray((day as any).intents) ? ((day as any).intents as MovementIntent[]) : [];
                      const intentLabels = getPrimaryIntentLabels(intents, 2);

                      return (
                        <View
                          key={day.id}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingVertical: appTheme.spacing.xs,
                            borderTopWidth: 1,
                            borderTopColor: theme.colors.outline,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {weekdayName} {date.getDate()}
                            </Text>
                            <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                              {day.label}
                            </Text>
                          </View>

                          {intentLabels.length > 0 ? (
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              {intentLabels.map((label, idx) => (
                                <Chip
                                  key={`${day.id}_intent_${idx}`}
                                  compact
                                  mode="outlined"
                                  textStyle={{
                                    fontSize: 10,
                                    fontWeight: '500',
                                    color: theme.colors.onSurfaceVariant,
                                  }}
                                  style={{
                                    backgroundColor: 'transparent',
                                    borderColor: theme.colors.outline,
                                  }}
                                >
                                  {label}
                                </Chip>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  ) : (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                      No training days this week
                    </Text>
                  )}
                </View>
              ) : null}
            </Card.Content>
          </Card>
        );
      })}
    </View>
  );
}
