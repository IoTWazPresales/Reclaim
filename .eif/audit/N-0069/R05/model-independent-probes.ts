import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import catalogData from '../catalog/exercises.v1.json';
import { validateProgrammeWeek, validateTrainingProgramme, type ProgrammeWeekDeclaration, type GeneratedProgrammeWeek } from '../weeklyProgrammeValidator';
import { WEEKLY_POLICY_VERSION, type AllocatedSlot, type WeeklyRequirement } from '../weeklyProgrammeTypes';
import { getExerciseLoadingProfile } from '../exerciseLoadingProfile';
import type { Exercise, SessionPlan, TrainingProfileSnapshot } from '../types';
import type { TrainingProfileRow } from '../../api';

const catalog = catalogData as Exercise[];
const provenance = 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09';
const goals = { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 };
// Independently reviewed two-day policy: literal objectives, not generator output.
const reviewedRows: Array<[string, string, string, AllocatedSlot['intent'], AllocatedSlot['dose'], number, number, AllocatedSlot['loadPolicy'], boolean]> = [
  ['bench', 'barbell_bench_press', 'pectorals', 'horizontal_press', 'heavy', 0, 0, 'own', true],
  ['fly', 'dumbbell_flyes', 'pectorals', 'horizontal_press', 'follow', 0, 1, 'none', false],
  ['squat', 'squat', 'quadriceps', 'knee_dominant', 'heavy', 0, 2, 'own', true],
  ['quadFollow', 'leg_extensions', 'quadriceps', 'knee_dominant', 'follow', 0, 3, 'none', true],
  ['lateral', 'lateral_raises', 'lateral_deltoids', 'shoulder_isolation', 'support', 0, 4, 'population', false],
  ['pushdown', 'tricep_pushdown', 'triceps', 'elbow_extension', 'support', 0, 5, 'population', false],
  ['row-heavy', 'barbell_row', 'lats', 'horizontal_pull', 'heavy', 1, 0, 'own', true],
  ['pulldown', 'lat_pulldown', 'lats', 'vertical_pull', 'follow', 1, 1, 'none', true],
  ['deadlift', 'deadlift', 'hamstrings', 'hip_hinge', 'heavy', 1, 2, 'own', true],
  ['hingeFollow', 'leg_curls', 'hamstrings', 'hip_hinge', 'follow', 1, 3, 'none', true],
  ['curl', 'barbell_curl', 'biceps', 'elbow_flexion', 'support', 1, 4, 'population', false],
  ['ohp', 'overhead_press', 'anterior_deltoids', 'vertical_press', 'heavy', 1, 5, 'own', true],
];
const completeEquipment = [...new Set(catalog.flatMap((exercise) => [...exercise.equipment, ...(exercise.equipmentAll ?? []), ...(exercise.equipmentAny ?? [])]))];
const profile: TrainingProfileSnapshot = { goals, equipment_access: completeEquipment, baselines: Object.fromEntries(catalog.filter((exercise) => getExerciseLoadingProfile(exercise).loadDisplayMode !== 'bodyweight').map((exercise) => [exercise.id, 100])), experienceLevel: 'advanced', constraints: { injuries: [], forbiddenMovements: [], preferences: { muscle_frequency_preference: 'twice' } } };
const clone = <T,>(value: T): T => structuredClone(value);

function reviewedFixture() {
  const calendar: ProgrammeWeekDeclaration['calendar'] = [{ weekday: 1, strategyId: 'balanced-v1:twoA', template: 'full_body', intents: [] }, { weekday: 4, strategyId: 'balanced-v1:twoB', template: 'full_body', intents: [] }];
  const requirements: WeeklyRequirement[] = reviewedRows.map(([id, , owner, , dose, ordinal, index]) => ({ id, owner, dose, targetSets: dose === 'heavy' ? 4 : dose === 'follow' ? 2 : 3, targetExposures: 1, positions: [[ordinal, index]], exposureSlotIds: [`${ordinal}:${index}`], provenance }));
  const exposurePolicies: ProgrammeWeekDeclaration['exposurePolicies'] = Object.fromEntries(reviewedRows.map(([, exerciseId, , intent, dose, ordinal, index, loadPolicy]) => [`${ordinal}:${index}`, { intent, reps: dose === 'heavy' ? 7 : 12, restSeconds: dose === 'heavy' ? 135 : 55, priority: dose === 'heavy' ? 'primary' : dose === 'follow' ? 'accessory' : 'isolation', loadPolicy, approvedExerciseIds: [exerciseId], selectionKind: ['fly', 'quadFollow', 'hingeFollow', 'lateral'].includes(reviewedRows.find((row) => row[1] === exerciseId)![0]) ? 'isolation' : 'primary_role' }]));
  const declaration: ProgrammeWeekDeclaration = { weekIndex: 1, policyVersion: WEEKLY_POLICY_VERSION, strategyId: 'balanced-v1:2', policyStatus: 'accepted', requirements: clone(requirements), exposurePolicies, calendar, provenance };
  const days: GeneratedProgrammeWeek['allocation']['days'] = {};
  for (const [ordinal, day] of calendar.entries()) {
    const slots: AllocatedSlot[] = reviewedRows.filter((row) => row[5] === ordinal).map(([id, exerciseId, owner, intent, dose, ord, index, loadPolicy, compound]) => ({ slotId: `${ord}:${index}`, requirementId: id, owner, intent, dose, setCount: dose === 'heavy' ? 4 : dose === 'follow' ? 2 : 3, reps: dose === 'heavy' ? 7 : 12, restSeconds: dose === 'heavy' ? 135 : 55, priority: dose === 'heavy' ? 'primary' : dose === 'follow' ? 'accessory' : 'isolation', loadPolicy, compound, exerciseId, candidateExerciseIds: [exerciseId] }));
    days[day.weekday] = { policyVersion: WEEKLY_POLICY_VERSION, strategyId: day.strategyId!, dayKey: String(day.weekday), slots, issues: [] };
  }
  const sessions: GeneratedProgrammeWeek['sessions'] = Object.entries(days).map(([dayKey, day]) => ({ dayKey, kind: 'strength', plan: {
    id: `reviewed-${dayKey}`, template: 'full_body', goals, constraints: { availableEquipment: profile.equipment_access, injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60 }, userState: { experienceLevel: 'advanced', estimated1RM: profile.baselines }, estimatedDurationMinutes: 55, createdAt: '2026-10-14T00:00:00Z', weekIndex: 1,
    exercises: day.slots.map((slot, index) => ({ exerciseId: slot.exerciseId!, exercise: clone(catalog.find((exercise) => exercise.id === slot.exerciseId)!), orderIndex: index, priority: slot.priority, intents: [slot.intent], plannedSets: Array.from({ length: slot.setCount }, (_, setIndex) => ({ setIndex: setIndex + 1, targetReps: slot.reps, restSeconds: slot.restSeconds, suggestedWeight: 10 })), decisionTrace: { intent: [slot.intent], goalBias: goals, constraintsApplied: [`policy:${WEEKLY_POLICY_VERSION}`, `weekly_requirement:${slot.requirementId}`], selectionReason: 'Independently reviewed fixture', rankedAlternatives: [], confidence: 1 } })),
  } }));
  return { declaration, generated: { weekIndex: 1, allocation: { policyVersion: WEEKLY_POLICY_VERSION, strategyId: 'balanced-v1:2', policyStatus: 'accepted' as const, requirements, days, status: 'feasible' as const, issues: [] }, sessions } as GeneratedProgrammeWeek, profile: clone(profile) };
}
type Fixture = ReturnType<typeof reviewedFixture>;
const first = (fixture: Fixture) => fixture.generated.sessions[0].plan.exercises[0];
const check = (fixture: Fixture) => validateProgrammeWeek(fixture.declaration, fixture.generated, fixture.profile);
const mutations: Array<[string, string, (fixture: Fixture) => void]> = [
  ['removed slot', 'missing_training_exposure', (f) => { f.generated.allocation.days[1].slots.shift(); }],
  ['removed final exercise', 'incomplete_allocation', (f) => { f.generated.sessions[0].plan.exercises.shift(); }],
  ['removed final session', 'missing_strength_session', (f) => { f.generated.sessions = f.generated.sessions.slice(1); }],
  ['equipment mismatch', 'ineligible_exercise', (f) => { f.profile.equipment_access = ['floor']; }],
  ['injury mismatch', 'ineligible_exercise', (f) => { f.profile.constraints!.injuries = ['shoulder_impingement']; }],
  ['disliked exercise', 'ineligible_exercise', (f) => { f.profile.constraints!.preferences!.hatesExercises = ['barbell_bench_press']; }],
  ['forbidden intent', 'ineligible_exercise', (f) => { f.profile.constraints!.forbiddenMovements = ['horizontal_press']; }],
  ['duplicate exercise', 'duplicate_exercise', (f) => { f.generated.sessions[0].plan.exercises[1] = clone(first(f)); }],
  ['unknown exercise', 'unknown_exercise', (f) => { first(f).exerciseId = 'fake'; }],
  ['spoofed catalogue metadata', 'unknown_exercise', (f) => { first(f).exercise.id = 'fake'; }],
  ['spoofed equipment under real ID', 'catalogue_metadata_mismatch', (f) => { first(f).exercise.equipment = ['floor']; }],
  ['changed load policy bypass', 'exposure_policy_mismatch', (f) => { f.generated.allocation.days[1].slots[1].loadPolicy = 'own'; delete f.profile.baselines!.dumbbell_flyes; }],
  ['changed allocation and final reps together', 'exposure_policy_mismatch', (f) => { f.generated.allocation.days[1].slots[0].reps = 1; first(f).plannedSets.forEach((set) => { set.targetReps = 1; }); }],
  ['forged final alternative', 'ineligible_final_alternative', (f) => { first(f).decisionTrace.rankedAlternativeIds = ['barbell_curl']; }],
  ['non-repetition alternative', 'ineligible_alternative', (f) => { f.generated.allocation.days[4].slots[4].candidateExerciseIds.push('21s'); }],
  ['corrupt policy enum', 'invalid_policy_status', (f) => { f.generated.allocation.policyStatus = 'fake' as never; }],
  ['malformed final work array', 'invalid_payload', (f) => { first(f).plannedSets = null as never; }],
  ['missing trusted policy', 'exposure_policy_missing', (f) => { f.declaration.exposurePolicies = {}; }],
  ['missing approved candidates field', 'exposure_policy_missing', (f) => { delete (f.declaration.exposurePolicies['0:0'] as Partial<ProgrammeWeekDeclaration['exposurePolicies'][string]>).approvedExerciseIds; }],
  ['malformed approved candidates', 'exposure_policy_missing', (f) => { f.declaration.exposurePolicies['0:0'].approvedExerciseIds = {} as never; }],
  ['malformed optional validation metadata', 'invalid_payload', (f) => { first(f); f.generated.sessions[0].plan.programmeValidation = {} as never; }],
  ['malformed optional alternatives', 'invalid_payload', (f) => { first(f).decisionTrace.rankedAlternativeIds = 0 as never; }],
  ['malformed optional warmups', 'invalid_payload', (f) => { first(f).warmupSets = 0 as never; }],
  ['compound offered for an isolation slot', 'ineligible_alternative', (f) => { f.generated.allocation.days[1].slots[1].candidateExerciseIds.push('push_ups'); }],
  ['unknown allocation status', 'invalid_allocation_status', (f) => { f.generated.allocation.status = 'fake' as never; }],
  ['unknown session kind', 'invalid_session_kind', (f) => { (f.generated.sessions[0] as { kind: string }).kind = 'fake'; }],
  ['external kg on pure bodyweight', 'invalid_load_state', (f) => { const item = first(f); item.exerciseId = 'push_ups'; item.exercise = clone(catalog.find((exercise) => exercise.id === 'push_ups')!); f.generated.allocation.days[1].slots[0].exerciseId = 'push_ups'; f.generated.allocation.days[1].slots[0].candidateExerciseIds.push('push_ups'); }],
  ['invalid own history', 'invalid_load_evidence', (f) => { delete f.profile.baselines!.dumbbell_flyes; f.profile.lastSessionPerformance = { dumbbell_flyes: { exerciseId: 'dumbbell_flyes', date: '2026-10-14', sets: [{ setIndex: 1, weight: NaN, reps: 3, completedAt: '2026-10-14' }] } }; }],
  ['missing requirements hidden in output', 'requirement_declaration_mismatch', (f) => { f.generated.allocation.requirements = []; f.generated.allocation.days[1].slots = []; f.generated.sessions[0].plan.exercises = []; }],
  ['lowered generated target', 'requirement_declaration_mismatch', (f) => { f.generated.allocation.requirements[0].targetSets = 1; }],
  ['unknown requirement', 'unknown_allocation', (f) => { f.generated.allocation.days[1].slots[0].requirementId = 'fake'; }],
  ['duplicate exposure ID', 'duplicate_exposure', (f) => { f.generated.allocation.days[1].slots[1].slotId = '0:0'; }],
  ['wrong exposure placement', 'missing_training_exposure', (f) => { f.generated.allocation.days[4].slots.push(f.generated.allocation.days[1].slots.shift()!); }],
  ['incompatible alternative', 'ineligible_alternative', (f) => { f.generated.allocation.days[1].slots[0].candidateExerciseIds.push('barbell_curl'); }],
  ['unknown alternative', 'ineligible_alternative', (f) => { f.generated.allocation.days[1].slots[0].candidateExerciseIds.push('fake'); }],
  ['missing candidate selection', 'incomplete_allocation', (f) => { f.generated.allocation.days[1].slots[0].candidateExerciseIds = []; }],
  ['zero reps', 'invalid_prescription', (f) => { first(f).plannedSets[0].targetReps = 0; }],
  ['fractional reps', 'invalid_prescription', (f) => { first(f).plannedSets[0].targetReps = 1.5; }],
  ['NaN reps', 'invalid_prescription', (f) => { first(f).plannedSets[0].targetReps = NaN; }],
  ['negative rest', 'invalid_prescription', (f) => { first(f).plannedSets[0].restSeconds = -1; }],
  ['infinite rest', 'invalid_prescription', (f) => { first(f).plannedSets[0].restSeconds = Infinity; }],
  ['wrong set indices', 'invalid_prescription', (f) => { first(f).plannedSets[0].setIndex = 2; }],
  ['negative weight', 'invalid_load', (f) => { first(f).plannedSets[0].suggestedWeight = -1; }],
  ['NaN weight', 'invalid_load', (f) => { first(f).plannedSets[0].suggestedWeight = NaN; }],
  ['infinite weight', 'invalid_load', (f) => { first(f).plannedSets[0].suggestedWeight = Infinity; }],
  ['baseline ceiling', 'baseline_ceiling_exceeded', (f) => { first(f).plannedSets[0].suggestedWeight = 100; }],
  ['load transferred to unknown implement', 'unanchored_external_load', (f) => { delete f.profile.baselines!.dumbbell_flyes; }],
  ['invalid warmup', 'invalid_warmup', (f) => { first(f).warmupSets = [{ weight: -5, reps: 5 }]; }],
  ['actual set cap', 'session_set_budget', (f) => { first(f).plannedSets = Array.from({ length: 25 }, (_, index) => ({ ...first(f).plannedSets[0], setIndex: index + 1 })); }],
  ['reported time exceeds cap', 'session_time_budget', (f) => { f.generated.sessions[0].plan.estimatedDurationMinutes = 61; }],
  ['actual work exceeds time despite false slot flag', 'session_time_budget', (f) => { f.generated.allocation.days[1].slots.forEach((slot) => { slot.compound = false; }); f.generated.sessions[0].plan.estimatedDurationMinutes = 5; f.generated.sessions[0].plan.constraints.timeBudgetMinutes = 15; }],
  ['rest alone exceeds time', 'session_time_budget', (f) => { first(f).plannedSets.forEach((set) => { set.restSeconds = 6000; }); }],
  ['nonfinite time', 'invalid_time_budget', (f) => { f.generated.sessions[0].plan.constraints.timeBudgetMinutes = NaN; }],
  ['trace missing', 'requirement_trace_missing', (f) => { first(f).decisionTrace.constraintsApplied = []; }],
  ['compiler falsely marked feasible with errors', 'allocation_issue', (f) => { f.generated.allocation.issues.push({ code: 'bad', severity: 'error', message: 'unmet required work' }); }],
  ['compiler infeasible with apparently good work', 'compiler_infeasible', (f) => { f.generated.allocation.status = 'infeasible'; }],
  ['allocation day removed', 'missing_allocation_day', (f) => { delete f.generated.allocation.days[1]; }],
];

describe('independent adversarial review', () => {
 const cases: Array<[string,(f:Fixture)=>void]> = [
 ['missing strategy', f=> {delete (f.declaration as any).strategyId;}],
 ['numeric strategy', f=> {(f.declaration as any).strategyId=42;}],
 ['malformed history sets', f=> {f.profile.lastSessionPerformance={barbell_bench_press:{sets:42}} as any;}],
 ['unknown final validation status',f=> {f.generated.sessions[0].plan.programmeValidation={status:'nonsense',issues:[]} as any;}],
 ['allocation day error',f=> {f.generated.allocation.days[1].issues=[{code:'failed',severity:'error',message:'required work failed'}];}],
 ['warmup above baseline',f=> {first(f).warmupSets=[{weight:1000000,reps:5}];}],
 ];
 for(const [name,mutate] of cases) it(name,()=>{const f=reviewedFixture();mutate(f);let result;try{result=check(f);console.log(name,JSON.stringify(result));}catch(e){console.log(name,'THREW',String(e));throw e;}expect(result.status).not.toBe('valid');});
});
function legacyFixture() {
 const f=reviewedFixture();
 f.declaration.strategyId='legacy-intents-v1'; f.declaration.policyStatus='legacy_pending_review'; f.declaration.requirements=[]; f.declaration.exposurePolicies={};
 f.generated.allocation.strategyId='legacy-intents-v1'; f.generated.allocation.policyStatus='legacy_pending_review'; f.generated.allocation.requirements=[];
 f.declaration.calendar.forEach(d=>{d.strategyId='legacy-intents-v1';});
 Object.values(f.generated.allocation.days).forEach(d=>{d.strategyId='legacy-intents-v1';d.slots=[];});
 return f;
}
describe('independent legacy compatibility probes',()=>{
 it('retains unresolved actual legacy name and ID alternatives',()=>{const f=legacyFixture();const item=first(f); item.decisionTrace.rankedAlternatives=[item.exercise.name];item.decisionTrace.rankedAlternativeIds=[item.exerciseId];expect(check(f).status).toBe('unresolved');});
 it('rejects absent legacy intent without throwing',()=>{const f=legacyFixture();delete (first(f).decisionTrace as any).intent;expect(check(f).status).toBe('invalid');});
 it('rejects malicious alternative ID despite valid displayed name',()=>{const f=legacyFixture();first(f).decisionTrace.rankedAlternatives=[first(f).exercise.name];first(f).decisionTrace.rankedAlternativeIds=['does-not-exist'];expect(check(f).status).toBe('invalid');});
});
