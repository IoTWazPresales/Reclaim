import React from 'react';
import { View, Text } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import type { MedDetailDoseHistory, MedDetailScheduleView } from './medDetailTypes';
import { logWhenDate } from './medDoseLogUtils';
import { MedSectionCard } from './MedSectionCard';
import { resolveRecentDosesEmptyCopy } from './medDetailPresentation';

function MiniBar({ pct, theme }: { pct: number; theme: MD3Theme }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View
      style={{
        height: 10,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 6,
      }}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}

export type MedDoseHistoryBlockProps = {
  schedule: MedDetailScheduleView;
  doseHistory: MedDetailDoseHistory;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
};

export function MedDoseHistoryBlock({ schedule, doseHistory, theme, appTheme }: MedDoseHistoryBlockProps) {
  const { isPrn } = schedule;
  const { logsLoading, byDay, takenCount30, lastTakenLabel, scheduleAdherence30 } = doseHistory;

  return (
    <>
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

      <MedSectionCard
        title="30-day logging summary"
        subtitle={
          isPrn
            ? 'Use counts for as-needed medications — not schedule adherence %.'
            : 'Expected slots vs taken for fixed schedules — not clinical validation.'
        }
        theme={theme}
        appTheme={appTheme}
      >
        {isPrn ? (
          <>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Logged (taken): {takenCount30} time{takenCount30 === 1 ? '' : 's'} in the last 30 days
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Last taken: {lastTakenLabel ?? '—'}
            </Text>
          </>
        ) : scheduleAdherence30 ? (
          <>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Taken vs expected (30d): {scheduleAdherence30.taken}/{scheduleAdherence30.scheduled} (
              {scheduleAdherence30.pct}%)
            </Text>
            <MiniBar pct={scheduleAdherence30.pct} theme={theme} />
          </>
        ) : (
          <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
            Add a fixed schedule on the Meds screen to see adherence for this medication.
          </Text>
        )}
      </MedSectionCard>
    </>
  );
}
