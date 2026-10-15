
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import catalogData from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/catalog/exercises.v1.json';
import { validateProgrammeWeek, validateTrainingProgramme, type ProgrammeWeekDeclaration, type GeneratedProgrammeWeek } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/weeklyProgrammeValidator';
import { buildFourWeekPlan } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/programPlanner';
import { defineWeeklyRequirements } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/weeklyProgramme';
import { buildProgramDaySession } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/buildProgramDaySession';
import { WEEKLY_POLICY_VERSION, type AllocatedSlot, type WeeklyRequirement } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/weeklyProgrammeTypes';
import { getExerciseLoadingProfile } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/exerciseLoadingProfile';
import { BALANCED_WEEKLY_OBJECTIVES } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/weeklyProgrammePolicy';
import type { Exercise, SessionPlan, TrainingProfileSnapshot } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/types';
import type { TrainingProfileRow } from 'C:/Reclaim-R05-verify-20261014/app/src/lib/training/../api';

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

const probes: Array<[string,(f:any)=>void]> = [
 ['final-only forbidden alternative', f=>f.generated.sessions[0].plan.exercises[0].decisionTrace.rankedAlternatives=['barbell_curl']],
 ['both altered reps', f=>{f.generated.allocation.days[1].slots[0].reps=999; f.generated.sessions[0].plan.exercises[0].plannedSets.forEach((s:any)=>s.targetReps=999)}],
 ['both altered load policy', f=>{f.generated.allocation.days[1].slots[1].loadPolicy='population'; delete f.profile.baselines.dumbbell_flyes}],
 ['same ID altered equipment', f=>f.generated.sessions[0].plan.exercises[0].exercise.equipmentAll=[]],
 ['late external zero', f=>f.generated.sessions[0].plan.exercises[0].plannedSets[1].suggestedWeight=0],
 ['optional programmeValidation object', f=>f.generated.sessions[0].plan.programmeValidation={}],
 ['falsy alternatives', f=>f.generated.sessions[0].plan.exercises[0].decisionTrace.rankedAlternativeIds=0],
 ['falsy warmups', f=>f.generated.sessions[0].plan.exercises[0].warmupSets=0],
 ['invalid approved IDs', f=>f.declaration.exposurePolicies['0:0'].approvedExerciseIds={}],
 ['corrupt history despite baseline', f=>f.profile.lastSessionPerformance={barbell_bench_press:{exerciseId:'barbell_bench_press',sets:[{weight:NaN,reps:3}]}}],
 ['missing declared final week', f=>{}]
];
let failures=0;
for(const [name, mutate] of probes){const f=reviewedFixture();mutate(f);try{const r=name==='missing declared final week'?validateTrainingProgramme({declarations:[f.declaration],weeks:[f.generated],profile:f.profile}):validateProgrammeWeek(f.declaration,f.generated,f.profile); const pass=r.status!=='valid'; if(!pass)failures++; console.log(JSON.stringify({name,status:r.status,codes:[...new Set(r.issues.map(x=>x.code))],pass}));}catch(e){failures++;console.log(JSON.stringify({name,throws:String(e),pass:false}));}}
const valid=reviewedFixture();const v=validateProgrammeWeek(valid.declaration,valid.generated,valid.profile); console.log(JSON.stringify({name:'unmutated reviewed fixture',status:v.status,pass:v.status==='valid'}));if(v.status!=='valid')failures++;process.exitCode=failures?1:0;

function legacyFixture(){const f=reviewedFixture();f.declaration.strategyId='legacy-intents-v1';f.declaration.policyStatus='legacy_pending_review';f.declaration.requirements=[];f.declaration.exposurePolicies={};f.generated.allocation.strategyId='legacy-intents-v1';f.generated.allocation.policyStatus='legacy_pending_review';f.generated.allocation.requirements=[];f.declaration.calendar.forEach(d=>d.strategyId='legacy-intents-v1');Object.values(f.generated.allocation.days).forEach(d=>{d.strategyId='legacy-intents-v1';d.slots=[]});return f;}
for(const [name, mutate, expected] of [
 ['legacy remains unresolved', (f:any)=>{},'unresolved'],
 ['legacy actual injury violation', (f:any)=>f.profile.constraints.injuries=['shoulder_impingement'],'invalid'],
 ['legacy empty final strength', (f:any)=>f.generated.sessions[0].plan.exercises=[],'invalid'],
 ['legacy stable alternative override display', (f:any)=>{f.generated.sessions[0].plan.exercises[0].decisionTrace.rankedAlternativeIds=['incline_bench_press'];f.generated.sessions[0].plan.exercises[0].decisionTrace.rankedAlternatives=['translated'];},'unresolved'],
 ['legacy incompatible stable alternative', (f:any)=>f.generated.sessions[0].plan.exercises[0].decisionTrace.rankedAlternativeIds=['barbell_curl'],'invalid']
] as const){const f=legacyFixture();mutate(f);const r=validateProgrammeWeek(f.declaration,f.generated,f.profile);console.log(JSON.stringify({name,status:r.status,expected,pass:r.status===expected}));if(r.status!==expected)process.exitCode=1;}
