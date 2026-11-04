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

const LOAD_CONFIRMATION = 'load_requires_confirmation';

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

/** One row per identical warning: same severity, code, message and exercise. */
export function dedupePreviewIssues(issues: readonly ProgrammeValidationIssue[]): ProgrammeValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = JSON.stringify([issue.severity, issue.code, issue.message, issue.exerciseId ?? null]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Internal source paths are developer detail, never user copy. */
function userMessage(message: string): string {
  return message.replace(/\s*\(?\bdocs\/[^\s)]*\)?/g, '').trim();
}

function Issue({ issue, developerDetails }: { issue: ProgrammeValidationIssue; developerDetails: boolean }) {
  const theme = useTheme();
  return <View style={{ marginTop: 8 }}>
    {issue.code === 'history_evidence_unverified' && <Text variant="bodySmall">History is incomplete or unsupported and cannot justify automatic progression.</Text>}
    <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>{issue.severity === 'error' ? 'Error' : 'Warning'}: {userMessage(issue.message)}</Text>
    {developerDetails && <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
      {issue.code}{issue.dayKey !== undefined ? ` · Day ${issue.dayKey}` : ''}{issue.exerciseId ? ` · ${issue.exerciseId}` : ''}{issue.slotId ? ` · Slot ${issue.slotId}` : ''}{issue.requirementId ? ` · ${issue.requirementId}` : ''}
      {'\n'}Source: {issue.provenance}
    </Text>}
  </View>;
}

/** Every exercise that needs a starting weight, in session order, as one block. */
function LoadConfirmationBlock({ plan, issues, developerDetails }: { plan: SessionPlan; issues: readonly ProgrammeValidationIssue[]; developerDetails: boolean }) {
  const theme = useTheme();
  const ids = [...new Set(issues.map(issue => issue.exerciseId).filter((id): id is string => !!id))];
  if (!issues.length) return null;
  const ordered = [...plan.exercises.map(ex => ex.exerciseId).filter(id => ids.includes(id)), ...ids.filter(id => !plan.exercises.some(ex => ex.exerciseId === id))];
  const names = [...new Set(ordered)].map(id => plan.exercises.find(ex => ex.exerciseId === id)?.exercise?.name ?? (developerDetails ? id : null)).filter((name): name is string => !!name);
  const count = Math.max(names.length, ids.length);
  return <View style={{ marginTop: 8 }}>
    <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
      Set starting weights for {count} {count === 1 ? 'exercise' : 'exercises'}
    </Text>
    {!!names.length && <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{names.join(' · ')}</Text>}
    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>No weight is prescribed until you choose one.</Text>
    {developerDetails && <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>{LOAD_CONFIRMATION} × {issues.length}</Text>}
  </View>;
}

/** Presentation only: no validation or Start policy. */
export function PreviewProgrammeReview({ plan, location, issues, developerDetails = __DEV__ }: {
  plan?: SessionPlan;
  location?: PreviewDiagnosticLocation;
  issues?: ProgrammeValidationIssue[];
  /** Codes, identifiers and source paths; defaults to development builds only. */
  developerDetails?: boolean;
}) {
  const theme = useTheme();
  // Per-exercise rows: the card already says a weight is needed and the
  // session block lists every such exercise, so confirmations are not repeated.
  if (issues) return <>{dedupePreviewIssues(issues.filter(issue => issue.code !== LOAD_CONFIRMATION)).map((issue, index) => <Issue key={index} issue={issue} developerDetails={developerDetails} />)}</>;
  if (!plan) return null;
  const validation = plan.weeklyValidation;
  const located = sameWeek(plan, location);
  const weekly = dedupePreviewIssues(validation?.issues.filter(issue => issue.dayKey === undefined && issue.code !== LOAD_CONFIRMATION) ?? []);
  const selectedDay = located ? validation!.issues.filter(issue =>
    issue.dayKey === location!.dayKey && (issue.weekIndex === undefined || issue.weekIndex === location!.weekIndex)) : [];
  const confirmations = selectedDay.filter(issue => issue.code === LOAD_CONFIRMATION);
  // Unmatched selected-day issues stay visible once, never attached by guesswork.
  const daily = dedupePreviewIssues(selectedDay.filter(issue => issue.code !== LOAD_CONFIRMATION &&
    (!issue.exerciseId || !previewExerciseIssues(plan, location, issue.exerciseId).includes(issue))));
  const message = !validation ? 'Programme diagnostics unavailable. This preview has no recorded weekly validation.'
    : validation.status === 'valid' ? 'Programme week validated.'
    : validation.status === 'invalid' ? 'Programme week invalid. Review programme errors before starting.'
    : 'Programme week unresolved. Review the programme warnings before starting.';
  return <View style={{ marginBottom: 16 }}>
    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{message}</Text>
    <LoadConfirmationBlock plan={plan} issues={confirmations} developerDetails={developerDetails} />
    {!!weekly.length && <Text variant="labelLarge">Week-level review</Text>}
    {weekly.map((issue, index) => <Issue key={index} issue={issue} developerDetails={developerDetails} />)}
    {!!daily.length && <Text variant="labelLarge">Selected-day review</Text>}
    {daily.map((issue, index) => <Issue key={index} issue={issue} developerDetails={developerDetails} />)}
    {validation && !located && <Text variant="bodySmall">Exercise warning locations unavailable for this preview.</Text>}
  </View>;
}
