import React from 'react';
import { View, Text, Alert } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { SchedulingCard } from '@/components/SchedulingCard';
import type { MedDetailScheduleView } from './medDetailTypes';
import { MedSectionCard } from './MedSectionCard';

export type MedScheduleBlockProps = {
  schedule: MedDetailScheduleView;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
  onScheduleReminders: () => Promise<void>;
  onCancelReminders: () => Promise<void>;
};

export function MedScheduleBlock({
  schedule,
  theme,
  appTheme,
  onScheduleReminders,
  onCancelReminders,
}: MedScheduleBlockProps) {
  const { isPrn, hasSchedule, timesLabel, daysLabel } = schedule;

  return (
    <MedSectionCard title="Schedule & reminders" theme={theme} appTheme={appTheme}>
      {isPrn ? (
        <>
          <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
            This entry is as-needed. Reclaim does not expect fixed daily doses and will not run recurring dose reminders
            for it.
          </Text>
          <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
            Log when you take a dose using the button above or from the Meds list.
          </Text>
        </>
      ) : (
        <>
          {!hasSchedule ? (
            <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
              No fixed schedule saved for this entry. You can add times on the Meds screen.
            </Text>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <SchedulingCard
              title="Reminders"
              subtitle="Reminders cover the next ~24 hours on this device."
              status={
                <View>
                  <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Times: {timesLabel}</Text>
                  <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>{daysLabel}</Text>
                </View>
              }
              primaryActionLabel="Schedule next 24h"
              onPrimaryAction={async () => {
                try {
                  await onScheduleReminders();
                  Alert.alert('Scheduled', 'Next 24h reminders set.');
                } catch (e: unknown) {
                  const message = e instanceof Error ? e.message : 'Failed to schedule';
                  Alert.alert('Error', message);
                }
              }}
              secondaryActionLabel="Cancel reminders"
              onSecondaryAction={async () => {
                try {
                  await onCancelReminders();
                  Alert.alert('Canceled', 'All reminders for this med canceled.');
                } catch (e: unknown) {
                  const message = e instanceof Error ? e.message : 'Failed';
                  Alert.alert('Error', message);
                }
              }}
            />
          </View>
        </>
      )}
    </MedSectionCard>
  );
}
