// Four Week Preview - Show 4-week program block overview
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { ProgramDay } from '@/lib/training/types';

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

  return (
    <View style={{ gap: appTheme.spacing.md }}>
      {weeks.map((wk) => {
        const startYMD = toYMD(wk.start);
        const endYMD = toYMD(wk.end);

        // Filter by date range (not week_index) so this works regardless of how week_index is stored.
        const weekDays = (programDays || [])
          .filter((pd) => pd.date >= startYMD && pd.date <= endYMD)
          .sort((a, b) => a.date.localeCompare(b.date));

        return (
          <Card key={wk.index} mode="outlined" style={{ borderRadius: appTheme.borderRadius.lg }}>
            <Card.Content style={{ padding: appTheme.spacing.md }}>
              <Text
                variant="titleSmall"
                style={{
                  fontWeight: '700',
                  marginBottom: appTheme.spacing.sm,
                  color: theme.colors.onSurface,
                }}
              >
                Week {wk.index}
              </Text>

              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.sm }}>
                {startYMD} → {endYMD}
              </Text>

              <View style={{ gap: appTheme.spacing.xs }}>
                {weekDays.length > 0 ? (
                  weekDays.map((day) => {
                    const date = new Date(day.date);
                    const weekdayName = WEEKDAY_NAMES[date.getDay()];
                    const intents = Array.isArray((day as any).intents) ? (day as any).intents : [];

                    return (
                      <View
                        key={day.id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
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

                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {intents.slice(0, 2).map((intent: string, idx: number) => (
                            <Chip key={`${day.id}_intent_${idx}`} compact textStyle={{ fontSize: 10 }} style={{ height: 20 }}>
                              {String(intent).split('_')[0]}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                    No training days this week
                  </Text>
                )}
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </View>
  );
}
