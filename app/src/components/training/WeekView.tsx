// Week View - Display current week's training plan
import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { ProgramDay, MovementIntent } from '@/lib/training/types';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';

interface WeekViewProps {
  programDays: ProgramDay[];
  currentDate: Date;
  onDayPress: (day: ProgramDay) => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekView({ programDays, currentDate, onDayPress }: WeekViewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  // Get start of current week (Monday)
  const weekStart = useMemo(() => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday (adjust Sunday)
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [currentDate]);

  // Generate 7 days for the week
  const weekDays = useMemo(() => {
    const days: Array<{ date: Date; programDay: ProgramDay | null }> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const programDay = (programDays || []).find((pd) => pd.date === dateStr) || null;
      days.push({ date, programDay });
    }
    return days;
  }, [weekStart, programDays]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isPast(date: Date, today: Date): boolean {
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return dateDay < todayDay;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, gap: appTheme.spacing.md }}
    >
      {weekDays.map(({ date, programDay }, index) => {
        const isToday = isSameDay(date, today);
        const isPastDate = isPast(date, today);

        const intents = programDay && Array.isArray((programDay as any).intents) ? ((programDay as any).intents as MovementIntent[]) : [];
        const intentLabels = getPrimaryIntentLabels(intents, 2);

        return (
          <Card
            key={index}
            mode={isToday ? 'elevated' : 'outlined'}
            style={{
              width: 140,
              backgroundColor: isToday ? theme.colors.primaryContainer : theme.colors.surface,
              opacity: isPastDate && !programDay ? 0.5 : 1,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content style={{ padding: appTheme.spacing.md }}>
              <Text
                variant="labelSmall"
                style={{
                  color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                  marginBottom: appTheme.spacing.xs,
                }}
              >
                {WEEKDAY_NAMES[date.getDay()]}
              </Text>

              <Text
                variant="titleLarge"
                style={{
                  fontWeight: '700',
                  color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  marginBottom: appTheme.spacing.sm,
                }}
              >
                {date.getDate()}
              </Text>

              {programDay ? (
                <>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                      fontWeight: '600',
                      marginBottom: appTheme.spacing.xs,
                    }}
                  >
                    {programDay.label}
                  </Text>

                  {intentLabels.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: appTheme.spacing.sm }}>
                      {intentLabels.map((label, idx) => (
                        <Chip
                          key={`${programDay.id}_intent_${idx}`}
                          compact
                          mode={isToday ? 'flat' : 'outlined'}
                          textStyle={{
                            fontSize: 10,
                            fontWeight: '500',
                            color: isToday ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                          }}
                          style={{
                            backgroundColor: isToday ? theme.colors.primary : 'transparent',
                            borderColor: isToday ? theme.colors.primary : theme.colors.outline,
                          }}
                        >
                          {label}
                        </Chip>
                      ))}
                    </View>
                  ) : null}

                  <Button
                    mode={isToday ? 'contained' : 'outlined'}
                    compact
                    onPress={() => onDayPress(programDay)}
                    style={{ marginTop: appTheme.spacing.xs }}
                    disabled={false}
                  >
                    {isToday ? 'Start' : isPastDate ? 'Review' : 'Preview'}
                  </Button>
                </>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
                  Rest day
                </Text>
              )}
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}
