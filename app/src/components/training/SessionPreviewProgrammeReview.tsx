import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { SessionPlan } from '@/lib/training/types';
import type { ProgrammeValidationIssue } from '@/lib/training/weeklyProgrammeValidator';

/** Original saved calendar/allocation identity, never inferred from display order. */
export type PreviewDiagnosticLocation = {
  weekIndex: number;
  dayKey: string;
  slots?: ReadonlyArray<{ slotId: string; exerciseId: string | null }>;
};

function sameWeek(plan: SessionPlan, location?: PreviewDiagnosticLocation) {
  return !!location && location.weekIndex === plan.weeklyValidation?.weekIndex;
}

export function previewExerciseIssues(plan: SessionPlan, location: PreviewDiagnosticLocation | undefined, exerciseId: string): ProgrammeValidationIssue[] {
  if (!sameWeek(plan, location) || plan.exercises.filter(ex => ex.exerciseId === exerciseId).length !== 1) return [];
  return plan.weeklyValidation!.issues.filter(issue =>
    (issue.weekIndex === undefined || issue.weekIndex === location!.weekIndex) &&
    issue.dayKey === location!.dayKey && issue.exerciseId === exerciseId &&
    (issue.slotId === undefined || location!.slots?.some(slot => slot.slotId === issue.slotId && slot.exerciseId === exerciseId)),
  );
}

function Issue({ issue }: { issue: ProgrammeValidationIssue }) {
  const theme = useTheme();
  return <View style={{ marginTop: 8 }}>
    {issue.code === 'load_requires_confirmation' && <Text variant="bodySmall">Weight confirmation required. Choose and confirm a weight; no load has been prescribed.</Text>}
    {issue.code === 'history_evidence_unverified' && <Text variant="bodySmall">History is incomplete or unsupported and cannot justify automatic progression.</Text>}
    <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{issue.severity === 'error' ? 'Error' : 'Warning'}: {issue.message}</Text>
    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
      {issue.code}{issue.dayKey !== undefined ? ` · Day ${issue.dayKey}` : ''}{issue.exerciseId ? ` · ${issue.exerciseId}` : ''}{issue.slotId ? ` · Slot ${issue.slotId}` : ''}{issue.requirementId ? ` · ${issue.requirementId}` : ''}
      {'\n'}Source: {issue.provenance}
    </Text>
  </View>;
}

/** Presentation only: retain issue occurrences, with no validation or Start policy. */
export function PreviewProgrammeReview({ plan, location, issues }: {
  plan?: SessionPlan;
  location?: PreviewDiagnosticLocation;
  issues?: ProgrammeValidationIssue[];
}) {
  const theme = useTheme();
  if (issues) return <>{issues.map((issue, index) => <Issue key={index} issue={issue} />)}</>;
  if (!plan) return null;
  const validation = plan.weeklyValidation;
  const weekly = validation?.issues.filter(issue => issue.dayKey === undefined) ?? [];
  // Unmatched selected-day issues stay visible once, never attached by guesswork.
  const daily = sameWeek(plan, location) ? validation!.issues.filter(issue =>
    issue.dayKey === location!.dayKey && (issue.weekIndex === undefined || issue.weekIndex === location!.weekIndex) &&
    (!issue.exerciseId || !previewExerciseIssues(plan, location, issue.exerciseId).includes(issue)),
  ) : [];
  const message = !validation ? 'Programme diagnostics unavailable. This preview has no recorded weekly validation.'
    : validation.status === 'valid' ? 'Programme week validated.'
    : validation.status === 'invalid' ? 'Programme week invalid. Review programme errors before starting.'
    : 'Programme week unresolved. Review the programme warnings before starting.';
  return <View style={{ marginBottom: 16 }}>
    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{message}</Text>
    {!!weekly.length && <Text variant="labelLarge">Week-level review</Text>}
    {weekly.map((issue, index) => <Issue key={index} issue={issue} />)}
    {!!daily.length && <Text variant="labelLarge">Selected-day review</Text>}
    {daily.map((issue, index) => <Issue key={index} issue={issue} />)}
    {validation && !sameWeek(plan, location) && <Text variant="bodySmall">Exercise warning locations unavailable for this preview.</Text>}
  </View>;
}
