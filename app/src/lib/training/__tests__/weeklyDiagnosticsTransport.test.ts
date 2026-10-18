import { afterEach, describe, expect, it, vi } from 'vitest';
import * as validator from '../weeklyProgrammeValidator';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import { buildFourWeekPlan } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { frozenSessionProjection, weeklyProgrammeDiagnostics, weeklyProgrammeSummary } from '../programmeProjection';
import { assertStartableProgramme, materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import { computePreviewSummary, dryRunTrainingGeneration } from '../preview';
import type { SessionPlan } from '../types';

const draft: TrainingSetupDraft = {
  goals: { build_muscle: 50, build_strength: 50, lose_fat: 0, get_fitter: 0 },
  selectedWeekdays: [1, 2, 3, 4, 5],
  equipment: ['barbell', 'dumbbells', 'bench', 'rack', 'floor', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 'chest_press_machine', 't_bar_row_machine', 'dip_station', 'ez_bar'],
  constraints: [], baselines: {}, baselineReps: {}, muscleFrequency: 'twice',
  experienceLevel: 'advanced', includeSkillWork: false, trainingMode: 'strength',
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture() {
  const setup = prepareTrainingSetup(draft);
  return { ...setup, plan: buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 9, 12)) };
}
const entries = (plans: Iterable<SessionPlan>) => [...plans].map(proposal => ({ proposal }));
afterEach(() => vi.restoreAllMocks());

describe('weekly diagnostic transport', () => {
  it.each(['valid', 'unresolved', 'invalid'] as const)('retains the complete %s validator result without conflating daily status', status => {
    const f = fixture();
    const result: validator.ProgrammeValidationResult = {
      status,
      issues: status === 'valid' ? [] : [{ code: 'transport_control', severity: status === 'invalid' ? 'error' : 'warning',
        message: 'Exact source message', provenance: 'reviewed-policy:control', weekIndex: 1, dayKey: '3', slotId: 'control-slot', exerciseId: 'leg_press', requirementId: 'control-requirement' }],
      coverage: [{ weekIndex: 1, requirementId: 'control-requirement', expectedSets: 3, actualSets: 3, expectedExposures: 1, actualExposures: 1 }],
    };
    vi.spyOn(validator, 'validateProgrammeWeek').mockReturnValue(result);
    const proposals = programmeWeekProposal(f.plan, 1, f.snapshot);
    const transported = proposals.get(1)!.weeklyValidation!;
    expect(transported).toEqual({ ...result, weekIndex: 1, policyVersion: f.plan.weeks[0].compilation!.policyVersion, strategyId: f.plan.weeks[0].compilation!.strategyId });
    for (const proposal of proposals.values()) {
      expect(proposal.weeklyValidation).toBe(transported);
      expect(proposal.programmeValidation?.status).toBe(status === 'invalid' ? 'infeasible' : 'feasible');
      if (status === 'invalid') expect(() => assertStartableProgramme(proposal)).toThrow();
      else expect(() => assertStartableProgramme(proposal)).not.toThrow();
    }
    expect(weeklyProgrammeDiagnostics(entries(clone([...proposals.values()])))).toEqual([transported]);
  });

  it('transports real unresolved warnings through preview and four saved weeks without multiplying occurrences', () => {
    const f = fixture();
    const saved = clone(f.plan), before = clone(saved);
    const all: SessionPlan[] = [];
    for (const week of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(saved, week, f.snapshot);
      expect(proposals.size).toBe(5);
      const diagnostics = weeklyProgrammeDiagnostics(entries(clone([...proposals.values()])));
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].status).toBe('unresolved');
      expect(diagnostics[0].issues.length).toBeGreaterThan(0);
      expect(diagnostics[0].issues.every(issue => issue.severity === 'warning' && !!issue.provenance)).toBe(true);
      expect(diagnostics[0].issues.filter(issue => issue.code === 'load_requires_confirmation').every(issue => !!issue.exerciseId)).toBe(true);
      for (const proposal of proposals.values()) {
        expect(proposal.programmeValidation?.status).toBe('feasible');
        expect(() => assertStartableProgramme(proposal)).not.toThrow();
        expect(computePreviewSummary(proposal)).not.toBeNull();
        all.push(proposal);
      }
      expect(weeklyProgrammeSummary(entries(proposals.values()))).not.toContain('Programme needs review');
    }
    expect(weeklyProgrammeDiagnostics(entries(all))).toHaveLength(4);
    expect(saved).toEqual(before);
    const preview = dryRunTrainingGeneration(draft)!;
    expect(preview.weeklyValidation?.status).toBe('unresolved');
    expect(preview.exercises.some(exercise => exercise.plannedSets.some(set => set.suggestedWeight === 0))).toBe(true);
    expect(preview.weeklyValidation?.issues.some(issue => issue.code === 'load_requires_confirmation')).toBe(true);
  });

  it('keeps invalid actual allocation errors blocked and summarized once', () => {
    const f = fixture();
    f.plan.weeks[0].days[1].allocation!.slots[0].setCount -= 1;
    const proposals = programmeWeekProposal(f.plan, 1, f.snapshot);
    expect(weeklyProgrammeDiagnostics(entries(proposals.values()))).toHaveLength(1);
    for (const proposal of proposals.values()) {
      expect(proposal.weeklyValidation?.status).toBe('invalid');
      expect(proposal.weeklyValidation?.issues.some(issue => issue.severity === 'error')).toBe(true);
      expect(() => materializePlannedSessionItems('blocked', proposal)).toThrow();
    }
    expect(weeklyProgrammeSummary(entries(proposals.values()))).toContain('Programme needs review');
  });

  it('does not infer validation success for legacy saved plans or old session snapshots', () => {
    const f = fixture();
    delete f.plan.programme;
    for (const week of f.plan.weeks) {
      delete week.compilation;
      for (const day of Object.values(week.days)) delete day.allocation;
    }
    const legacy = programmeWeekProposal(clone(f.plan), 1, f.snapshot);
    expect(legacy.size).toBe(5);
    expect(weeklyProgrammeDiagnostics(entries(legacy.values()))).toEqual([]);
    for (const proposal of legacy.values()) {
      expect(proposal.weeklyValidation).toBeUndefined();
      const blocked = proposal.programmeValidation?.status === 'infeasible' || proposal.programmeValidation?.issues.some(issue => issue.severity === 'error');
      if (blocked) expect(() => assertStartableProgramme(proposal)).toThrow();
      else expect(() => assertStartableProgramme(proposal)).not.toThrow();
    }
  });

  it('preserves frozen work and excludes current diagnostics for frozen-only summaries including empty snapshots', () => {
    const f = fixture();
    const proposal = programmeWeekProposal(f.plan, 1, f.snapshot).get(1)!;
    const frozenItems = materializePlannedSessionItems('frozen', proposal);
    const before = clone(frozenItems);
    const blocked = clone(proposal);
    blocked.programmeValidation!.status = 'infeasible';
    for (const input of [{ startedAt: '2026-10-12T10:00:00Z', notificationMode: 'normal' as const }, { startedAt: null, notificationMode: 'guided' as const }]) {
      expect(plannedItemsForSession({ ...input, sessionId: 'frozen', frozenItems, rebuiltPlan: blocked })).toBe(frozenItems);
    }
    expect(frozenItems).toEqual(before);
    const frozen = { proposal, frozen: [] };
    expect(frozenSessionProjection(proposal, []).exercises).toEqual([]);
    expect(frozenSessionProjection(proposal, []).weeklyValidation).toBeUndefined();
    expect(weeklyProgrammeDiagnostics([frozen])).toEqual([]);
    expect(weeklyProgrammeDiagnostics([frozen, { proposal }])).toEqual([proposal.weeklyValidation]);
    expect(weeklyProgrammeSummary([frozen])).toContain('Frozen planned: 0 sets');
  });
});
