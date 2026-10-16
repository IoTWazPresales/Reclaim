/** Application projection of the committed compiler, builder and R05 validator contracts. */
import catalog from './catalog/exercises.v1.json';
import { buildProgramDaySession, type ProgramDaySessionOptions } from './buildProgramDaySession';
import { programDayInput } from './programmeProjection';
import type { FourWeekProgramPlan } from './programPlanner';
import { defineWeeklyRequirements } from './weeklyProgramme';
import { BALANCED_WEEKLY_OBJECTIVES } from './weeklyProgrammePolicy';
import { blendedReps, blendedCount } from './balancedHypertrophy';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { validateProgrammeWeek, type ProgrammeWeekDeclaration } from './weeklyProgrammeValidator';
import type { Exercise, SessionPlan, TrainingProfileSnapshot } from './types';
import { computeWeeklyMuscleSessionCounts } from './weeklyVolumeSummary';

export function programmeWeekProposal(
  plan: FourWeekProgramPlan, weekIndex: number, profile: TrainingProfileSnapshot, options?: ProgramDaySessionOptions,
): Map<number, SessionPlan> {
  const week = plan.weeks.find(value => value.weekIndex === weekIndex);
  const proposals = new Map<number, SessionPlan>();
  if (!week) return proposals;
  for (const [key, day] of Object.entries(week.days)) {
    proposals.set(Number(key), buildProgramDaySession(programDayInput({ ...day, template_key: day.template, week_index: weekIndex, day_index: Number(key) }, plan), profile, options));
  }
  // Retain the approved legacy weekly coordination, now shared by every surface.
  // Allocated programmes already own both dose and exercise identity.
  if (!week.compilation || week.compilation.policyStatus === 'legacy_pending_review') {
    const counts = computeWeeklyMuscleSessionCounts([...proposals.values()]);
    const used: string[] = [];
    for (const [key, day] of Object.entries(week.days).sort(([a], [b]) => Number(a) - Number(b))) {
      const proposal = buildProgramDaySession(programDayInput({ ...day, template_key: day.template, week_index: weekIndex, day_index: Number(key) }, plan), profile,
        { ...options, weeklyMuscleSessionCounts: counts, avoidExerciseIds: [...used] });
      proposals.set(Number(key), proposal);
      used.push(...proposal.exercises.map(exercise => exercise.exerciseId));
    }
  }
  if (!week.compilation) {
    if (plan.programme || Object.values(week.days).some(day => day.allocation)) {
      for (const proposal of proposals.values()) proposal.programmeValidation = {
        policyVersion: plan.programme?.policyVersion ?? 'unknown', status: 'infeasible',
        issues: [{ code: 'weekly_compilation_missing', severity: 'error', message: 'The saved weekly programme is incomplete. Review training setup before starting.' }],
      };
    }
    return proposals; // Only historical programmes may lack the weekly contract.
  }
  const balanced = week.compilation.strategyId.startsWith('balanced-v1:');
  const objectives = balanced ? BALANCED_WEEKLY_OBJECTIVES[plan.selectedWeekdays.length] ?? [] : [];
  const exposurePolicies: ProgrammeWeekDeclaration['exposurePolicies'] = Object.fromEntries(objectives.flatMap(objective => objective.positions.map(([ordinal, index]) => {
    const slot = objective.slot;
    const reference = catalog.find(exercise => exercise.id === slot.candidates[0]) as Exercise;
    return [`${ordinal}:${index}`, { intent: slot.intent, priority: slot.priority, loadPolicy: slot.load,
      approvedExerciseIds: [...slot.candidates],
      selectionKind: getExerciseLoadingProfile(reference).compoundClassification === 'isolation' ? 'isolation' : 'primary_role',
      reps: blendedReps(profile.goals, slot.priority === 'primary' ? 'primary' : 'isolation'),
      restSeconds: blendedCount(profile.goals, slot.priority === 'primary' ? 'primary' : 'isolation', 'rest') ?? 90 }];
  })));
  const declaration: ProgrammeWeekDeclaration = {
    weekIndex, policyVersion: week.compilation.policyVersion, strategyId: week.compilation.strategyId,
    policyStatus: week.compilation.policyStatus,
    requirements: balanced ? defineWeeklyRequirements(plan.selectedWeekdays.length, profile) : [],
    exposurePolicies, calendar: Object.values(week.days), runRequirement: week.compilation.runRequirement,
    provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09; docs/training/RUNNING_DESIGN.md',
  };
  const sessions = [...proposals].flatMap(([key, proposal]) => {
    const day = week.days[key];
    const entries: Array<{ dayKey: string; kind: 'strength' | 'run'; plan: SessionPlan }> = [{ dayKey: String(key), kind: day.template === 'run' ? 'run' : 'strength', plan: proposal }];
    if (day.scheduledRun) entries.push({ dayKey: String(key), kind: 'run', plan: buildProgramDaySession({ label: 'Run', template_key: 'run', intents: [], weekIndex }, profile, options) });
    return entries;
  });
  const result = validateProgrammeWeek(declaration, { weekIndex, allocation: week.compilation, sessions }, profile);
  if (result.status === 'invalid') {
    for (const proposal of proposals.values()) proposal.programmeValidation = {
      policyVersion: week.compilation.policyVersion, status: 'infeasible',
      issues: [...(proposal.programmeValidation?.issues ?? []), ...result.issues],
    };
  }
  return proposals;
}
