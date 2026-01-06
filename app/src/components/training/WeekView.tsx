// Week View - Display current week's training plan
import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, Button, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { ProgramDay } from '@/lib/training/types';

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
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
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
      const programDay = programDays.find((pd) => pd.date === dateStr) || null;
      days.push({ date, programDay });
    }
    return days;
  }, [weekStart, programDays]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, gap: appTheme.spacing.md }}>
      {weekDays.map(({ date, programDay }, index) => {
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        const weekdayNum = date.getDay() === 0 ? 7 : date.getDay();

        return (
          <Card
            key={index}
            mode={isToday ? 'elevated' : 'outlined'}
            style={{
              width: 140,
              backgroundColor: isToday ? theme.colors.primaryContainer : theme.colors.surface,
              opacity: isPast && !programDay ? 0.5 : 1,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content style={{ padding: appTheme.spacing.md }}>
              <Text variant="labelSmall" style={{ color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                {WEEKDAY_NAMES[date.getDay()]}
              </Text>
              <Text variant="titleLarge" style={{ fontWeight: '700', color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurface, marginBottom: appTheme.spacing.sm }}>
                {date.getDate()}
              </Text>

              {programDay ? (
                <>
                  <Text variant="bodySmall" style={{ color: isToday ? theme.colors.onPrimaryContainer : theme.colors.onSurface, fontWeight: '600', marginBottom: appTheme.spacing.xs }}>
                    {programDay.label}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: appTheme.spacing.sm }}>
                    {programDay.intents.slice(0, 2).map((intent, idx) => (
                      <Chip key={idx} compact textStyle={{ fontSize: 10 }} style={{ height: 20 }}>
                        {intent.split('_')[0]}
                      </Chip>
                    ))}
                  </View>
                  <Button
                    mode={isToday ? 'contained' : 'outlined'}
                    compact
                    onPress={() => onDayPress(programDay)}
                    style={{ marginTop: appTheme.spacing.xs }}
                  >
                    {isPast ? 'View' : 'Start'}
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
