// Audit-only deterministic probe. Does not access databases or change product files.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../../');
const ts = require(path.join(root, 'app/node_modules/typescript'));
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(id, ...args) { return resolve.call(this, id.startsWith('@/') ? path.join(root, 'app/src', id.slice(2)) : id, ...args); };
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true}}).outputText, filename);
global.__DEV__ = false;
const training = path.join(root, 'app/src/lib/training');
const { buildFourWeekPlan } = require(path.join(training, 'programPlanner.ts'));
const { buildProgramDaySession } = require(path.join(training, 'buildProgramDaySession.ts'));
const { suggestLoading, getExerciseById, deriveProgressionDecision } = require(path.join(training, 'engine/index.ts'));
const { countHoldStreak, decideDoubleProgression } = require(path.join(training, 'progression.ts'));
const { formatWeeklyMuscleSetLine } = require(path.join(training, 'weeklyVolumeSummary.ts'));
const catalog = require(path.join(training, 'catalog/exercises.v1.json'));
const equipment = [...new Set(catalog.flatMap(e => [...(e.equipment || []), ...(e.equipmentAll || []), ...(e.equipmentAny || [])]))];
const goals = {build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0};
const base = {goals, equipment_access: equipment, experienceLevel: 'beginner', constraints: { injuries: [], forbiddenMovements: [] }, baselines: {}};
const day = { label:'Upper (Chest/Back)', template_key:'upper', intents:['horizontal_press','horizontal_pull','shoulder_isolation','elbow_extension','elbow_flexion'], weekIndex:1 };
const summary = p => ({label:p.sessionLabel, minutes:p.estimatedDurationMinutes, exercises:p.exercises.map(e=>({id:e.exerciseId, sets:e.plannedSets.length,reps:e.plannedSets[0]?.targetReps,kg:e.plannedSets[0]?.suggestedWeight,rest:e.plannedSets[0]?.restSeconds,alternatives:e.decisionTrace.rankedAlternativeIds}))});
function week(profile, count, mode='strength') {
  const p = buildFourWeekPlan({...profile, constraints:{...profile.constraints,trainingMode:mode}}, Array.from({length:count},(_,i)=>i+1));
  const used=[];
  const plans=Object.values(p.weeks[0].days).map(d=>{const s=buildProgramDaySession({...d,template_key:d.template,weekIndex:1},profile,{avoidExerciseIds:[...used]}); used.push(...s.exercises.map(e=>e.exerciseId));return s;});
  return {days:Object.values(p.weeks[0].days).map(d=>({label:d.label,template:d.template,run:!!d.scheduledRun})),plans:plans.map(summary),display:formatWeeklyMuscleSetLine(plans)};
}
const bench=getExerciseById('barbell_bench_press');
const lastSets=[{weight:80,reps:9,rpe:7},{weight:80,reps:9,rpe:7},{weight:80,reps:9,rpe:7}];
const state={experienceLevel:'intermediate',estimated1RM:{barbell_bench_press:100},lastSessionPerformance:{barbell_bench_press:{sets:lastSets}}};
const out={head:'a9163835e7e649c101320853d85fd8df1e5b883e', fullGym:week(base,5), dumbbells:week({...base,equipment_access:['dumbbells','bench','floor']},5), bodyweight:week({...base,equipment_access:['floor']},5), hybrid2:week(base,2,'hybrid'),hybrid3:week(base,3,'hybrid'), hate:summary(buildProgramDaySession(day,{...base,constraints:{...base.constraints,preferences:{hatesExercises:['barbell_bench_press']}}})), beginner:summary(buildProgramDaySession(day,base)),advanced:summary(buildProgramDaySession(day,{...base,experienceLevel:'advanced'})),baselineCeiling:{decision:deriveProgressionDecision(bench,state,[5,9]),prescribed:suggestLoading({exercise:bench,userState:state,goalWeights:goals,plannedReps:7,priority:'primary'})},improvingRepsHoldStreak:countHoldStreak([{sets:[{weight:80,reps:8}]},{sets:[{weight:80,reps:7}]}],[5,9]),partialSession:decideDoubleProgression({exercise:bench,lastSets:[{weight:80,reps:9,rpe:7}],repRange:[5,9]}),renamed:summary(buildProgramDaySession({...day,label:day.label+' '},base))};
fs.writeFileSync(path.join(__dirname,'probe-results.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify({bodyweightDays:out.bodyweight.plans.map(p=>p.exercises.length),dumbbellDays:out.dumbbells.plans.map(p=>p.exercises.map(e=>e.id)),hybrid2Runs:out.hybrid2.days.filter(d=>d.run).length,hybrid3Runs:out.hybrid3.days.filter(d=>d.run).length,hatedSelected:out.hate.exercises.some(e=>e.id==='barbell_bench_press'),baselineCeiling:out.baselineCeiling,improvingRepsHoldStreak:out.improvingRepsHoldStreak,partialSession:out.partialSession,renameChangesExerciseIds:JSON.stringify(out.beginner.exercises.map(e=>e.id))!==JSON.stringify(out.renamed.exercises.map(e=>e.id))},null,2));
