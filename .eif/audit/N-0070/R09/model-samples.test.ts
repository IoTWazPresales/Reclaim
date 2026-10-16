import { describe, it, expect } from 'vitest';
import { prepareTrainingSetup } from '../../../../.tmp/R09-verify/app/src/lib/training/setupDraft';
import { buildFourWeekPlan } from '../../../../.tmp/R09-verify/app/src/lib/training/programPlanner';
import { programmeWeekProposal } from '../../../../.tmp/R09-verify/app/src/lib/training/programmeWeekProposal';
import { programDayInput, frozenSessionProjection } from '../../../../.tmp/R09-verify/app/src/lib/training/programmeProjection';
import { buildProgramDaySession, assertStartableProgramme, plannedItemsForSession } from '../../../../.tmp/R09-verify/app/src/lib/training/buildProgramDaySession';
import { getAdjustedSetParams } from '../../../../.tmp/R09-verify/app/src/lib/training/sessionDerivedState';
import { buildNotificationWorkChain } from '../../../../.tmp/R09-verify/app/src/lib/training/trainingSessionProgression';

const setup = () => prepareTrainingSetup({ goals: { build_muscle: 4, build_strength: 4, lose_fat: 1, get_fitter: 1 }, selectedWeekdays: [1,3,5], equipment: ['barbell', 'bench', 'rack', 'dumbbells'], constraints: [], baselines: { bench_press: 60 }, trainingMode: 'strength' });
const fixture = () => { const s = setup(); return { ...s, plan: buildFourWeekPlan(s.profile, s.selectedWeekdaysJs, new Date(2026,9,12)) }; };
describe('Independent R09 adversarial samples', () => {
  it.each(['policy', 'day', 'dose', 'compilation'] as const)('rejects corrupted %s identity or prescription', mutation => {
    const {plan, snapshot} = fixture();
    if (mutation === 'policy') plan.programme!.policyVersion = 'unsupported-future-version';
    if (mutation === 'day') plan.weeks[0].days[1].allocation!.dayKey = '7';
    if (mutation === 'dose') plan.weeks[0].days[1].allocation!.slots[0].setCount += 1;
    if (mutation === 'compilation') delete plan.weeks[0].compilation;
    const proposals = programmeWeekProposal(plan, 1, snapshot);
    for (const proposal of proposals.values()) expect(() => assertStartableProgramme(proposal)).toThrow();
  });
  it('preserves legacy stored prescription and an empty guided snapshot against a rebuild', () => {
    const {snapshot, plan} = fixture();
    const proposed = programmeWeekProposal(plan, 1, snapshot).get(1)!;
    const legacy = buildProgramDaySession({ label: 'Upper', intents: ['horizontal_press'], template_key: 'upper' }, snapshot);
    expect(legacy.exercises.length).toBeGreaterThan(0);
    expect(() => assertStartableProgramme(legacy)).not.toThrow();
    expect(plannedItemsForSession({startedAt:null,notificationMode:'guided',frozenItems:[],rebuiltPlan:proposed,sessionId:'s'})).toEqual([]);
    expect(frozenSessionProjection(proposed, []).exercises).toEqual([]);
    const input = programDayInput({ label:'Translated',intents:[],template_key:'upper',week_index:1,day_index:1 }, plan);
    expect(input.allocation).toBe(plan.weeks[0].days[1].allocation);
  });
  it('guidance uses pending effective target and ignores overlays for completed work', () => {
    const item: any = { id:'i', exercise_id:'barbell_bench_press', order_index:0, planned:{sets:[{setIndex:1,suggestedWeight:50,targetReps:8,restSeconds:90}]}, performed:null, skipped:false, autoregulation_adjustments:{1:{weightDelta:-2.5,repsDelta:1,reason:'sample'}} };
    const next = buildNotificationWorkChain([item]).next!;
    expect([next.suggestedWeight,next.targetReps]).toEqual([47.5,9]);
    expect(getAdjustedSetParams(item,1,{})).toMatchObject({weight:47.5,reps:9});
    item.performed = {sets:[{setIndex:1,weight:47.5,reps:9,completedAt:'2026-10-15T00:00:00Z'}]};
    expect(getAdjustedSetParams(item,1,{})).toEqual({weight:50,reps:8});
    expect(buildNotificationWorkChain([item]).next).toBeNull();
  });
  it('records arbitrary malformed compilation JSON as a throwing preview limitation', () => {
    const {plan, snapshot} = fixture();
    (plan.weeks[0].compilation as any).strategyId = null;
    expect(() => programmeWeekProposal(plan,1,snapshot)).toThrow();
  });
});
