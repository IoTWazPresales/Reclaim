import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { weeklyProgrammeDiagnostics } from '@/lib/training/programmeProjection';

type Entries = Parameters<typeof weeklyProgrammeDiagnostics>[0];

/** Current proposal diagnostics only; stored prescriptions are historical work. */
export default function WeeklyProgrammeReview({ entries }: { entries: Entries | undefined }) {
  const theme = useTheme();
  const diagnostics = weeklyProgrammeDiagnostics(entries ?? []);
  const current = entries?.filter(entry => entry.frozen === undefined) ?? [];
  const missingWeeks = [...new Set(current.filter(entry => !entry.proposal.weeklyValidation)
    .map(entry => entry.proposal.weekIndex))];
  return (
    <View style={{ marginBottom: 8 }}>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>Current programme review</Text>
      {diagnostics.map(week => {
        const warnings = week.issues.filter(issue => issue.severity === 'warning').length;
        const errors = week.issues.filter(issue => issue.severity === 'error').length;
        return (
          <View key={JSON.stringify([week.weekIndex, week.policyVersion, week.strategyId])}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
              {`Week ${week.weekIndex}: ${missingWeeks.includes(week.weekIndex) ? 'available diagnostics ' : ''}${week.status} · ${warnings} ${warnings === 1 ? 'warning' : 'warnings'} · ${errors} ${errors === 1 ? 'error' : 'errors'}`}
            </Text>
            {week.status === 'unresolved' ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Exercise weights may require confirmation. Review the session preview for details.
              </Text>
            ) : week.status === 'invalid' ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                This programme week needs review. Open the session preview for details.
              </Text>
            ) : null}
          </View>
        );
      })}
      {missingWeeks.map(weekIndex => (
        <Text key={String(weekIndex)} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {`Week ${weekIndex}: review unavailable. Weekly diagnostics are missing for current proposals; older programmes may not include them.`}
        </Text>
      ))}
      {!diagnostics.length && !missingWeeks.length ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {entries?.length ? 'Review unavailable: this week contains only frozen or completed sessions.' : 'Weekly review unavailable.'}
        </Text>
      ) : null}
      {entries?.some(entry => entry.frozen !== undefined) ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Frozen and completed sessions retain their historical prescriptions; this review applies to current proposals.
        </Text>
      ) : null}
    </View>
  );
}
