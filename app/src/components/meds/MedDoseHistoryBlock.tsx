import React from 'react';
import { View, Text } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { MedDetailDoseHistory, MedDetailScheduleView } from './medDetailTypes';
import { logWhenDate } from './medDoseLogUtils';
import { MedSectionCard } from './MedSectionCard';
import { resolveRecentDosesEmptyCopy } from './medDetailPresentation';

export type MedDoseHistoryBlockProps = {
  schedule: MedDetailScheduleView;
  doseHistory: MedDetailDoseHistory;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
};

/**
 * Recent dose history. The 30-day adherence summary lives in the detail
 * header's single adherence line (formatAdherenceLine) — not duplicated here.
 */
export function MedDoseHistoryBlock({ schedule, doseHistory, theme, appTheme }: MedDoseHistoryBlockProps) {
  const { isPrn } = schedule;
  const { logsLoading, byDay } = doseHistory;

  return (
    <MedSectionCard
      title="Recent doses"
      subtitle="Merged device + cloud history when signed in."
      theme={theme}
      appTheme={appTheme}
    >
      {logsLoading ? (
        <Text style={{ marginTop: 8, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>Loading…</Text>
      ) : byDay.length === 0 ? (
        <Text style={{ marginTop: 8, opacity: 0.75, color: theme.colors.onSurfaceVariant }}>
          {resolveRecentDosesEmptyCopy(isPrn)}
        </Text>
      ) : (
        byDay.map(([day, rows]) => (
          <View key={day} style={{ marginTop: 10 }}>
            <Text style={{ fontWeight: '700', marginBottom: 4, color: theme.colors.onSurface }}>{day}</Text>
            {rows.map((l) => {
              const when = logWhenDate(l);
              const rowKey = l.id ?? `${l.scheduled_for ?? ''}-${l.status}-${l.taken_at ?? ''}`;
              return (
                <Text key={rowKey} style={{ opacity: 0.85, marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                  {when.toLocaleTimeString()} • {l.status}
                </Text>
              );
            })}
          </View>
        ))
      )}
    </MedSectionCard>
  );
}
