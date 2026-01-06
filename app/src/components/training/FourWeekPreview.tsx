// Four Week Preview - Show 4-week program block overview
import React from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { ProgramDay } from '@/lib/training/types';

interface FourWeekPreviewProps {
  programDays: ProgramDay[];
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FourWeekPreview({ programDays }: FourWeekPreviewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  // Group by week
  const weeks = [1, 2, 3, 4];

  return (
    <View style={{ gap: appTheme.spacing.md }}>
      {weeks.map((weekIndex) => {
        const weekDays = programDays.filter((pd) => pd.week_index === weekIndex);

        return (
          <Card key={weekIndex} mode="outlined" style={{ borderRadius: appTheme.borderRadius.lg }}>
            <Card.Content style={{ padding: appTheme.spacing.md }}>
              <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
                Week {weekIndex}
              </Text>
              <View style={{ gap: appTheme.spacing.xs }}>
                {weekDays.length > 0 ? (
                  weekDays.map((day) => {
                    const date = new Date(day.date);
                    const weekdayName = WEEKDAY_NAMES[date.getDay()];

                    return (
                      <View key={day.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {weekdayName} {date.getDate()}
                          </Text>
                          <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                            {day.label}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {day.intents.slice(0, 2).map((intent, idx) => (
                            <Chip key={idx} compact textStyle={{ fontSize: 10 }} style={{ height: 20 }}>
                              {intent.split('_')[0]}
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
