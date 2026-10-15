import assert from 'node:assert/strict';
import { recommendSessionAdjustment, autoregulationOverlay } from '../../../../app/src/lib/training/autoregulationOverlay';
import { applyAutoregulation } from '../../../../app/src/lib/training/runtime/autoregulation';
import { getAdjustedSetParams } from '../../../../app/src/lib/training/sessionDerivedState';
import { buildNotificationWorkChain } from '../../../../app/src/lib/training/trainingSessionProgression';
import { getExerciseById } from '../../../../app/src/lib/training/engine';
const results: any[] = [];
function probe(name: string, run: () => void) { try { run(); results.push({name,pass:true}); } catch(e) { results.push({name,pass:false,error:String(e)}); } }
const ex = getExerciseById('barbell_bench_press')!;
const plan = [1,2,3,4].map(setIndex => ({setIndex,suggestedWeight:100,targetReps:8,restSeconds:90}));
const input = {exerciseId:ex.id,currentSetIndex:1,currentSetRpe:9,currentSetReps:8,currentSetWeight:100,targetReps:8,suggestedWeight:100,previousSets:[],plannedSets:plan};
const row: any = { id:'one',exercise_id:ex.id,planned:{sets:plan},performed:{sets:[{setIndex:1,weight:100,reps:8,completedAt:'now'}]} };
const original=JSON.stringify(row);
probe('producer-to-legacy-reader proves audited 100kg failure',()=>{
 const r=applyAutoregulation(input); assert.equal(r.adjustedWeight,95);
 const old={...row,autoregulation_adjustments:{2:{weightDelta:r.adjustment?.weightDelta??0,repsDelta:r.adjustment?.targetRepsDelta??0}}};
 assert.equal(getAdjustedSetParams(old,2,{}).weight,100);
 const applied=recommendSessionAdjustment(input,plan[1],ex);if(applied.status!=='applied')throw Error('missing adjustment');
 const fixed=JSON.parse(JSON.stringify({...row,autoregulation_adjustments:{2:applied.overlay}}));
 results.push({name:'100kg to 95kg contract output',pass:true,evidence:{
 producer:{adjustedWeight:r.adjustedWeight,weightMultiplier:r.adjustment?.weightMultiplier},
 before:{persistedWeightDelta:old.autoregulation_adjustments[2].weightDelta,reader:getAdjustedSetParams(old,2,{})},
 after:{applied,persisted:fixed.autoregulation_adjustments[2],reader:getAdjustedSetParams(fixed,2,{}),guidance:buildNotificationWorkChain([fixed]).next},
 plannedUnchanged:JSON.stringify(fixed.planned)===JSON.stringify(row.planned),performedUnchanged:JSON.stringify(fixed.performed)===JSON.stringify(row.performed)}});
});
probe('absolute target reconstructs 95kg from frozen 110kg with -15kg overlay',()=>{
 const r=recommendSessionAdjustment(input,{...plan[1],suggestedWeight:110},ex);
 assert.equal(r.status,'applied'); if(r.status!=='applied')throw Error('no target');
 assert.equal(r.overlay.weightDelta,-15); assert.equal(r.weightKg,95);
});
probe('JSON reload agrees with pending guidance while later sets remain frozen',()=>{
 const r=recommendSessionAdjustment(input,plan[1],ex); if(r.status!=='applied')throw Error('no target');
 const reload=JSON.parse(JSON.stringify({...row,autoregulation_adjustments:{2:r.overlay}}));
 assert.equal(getAdjustedSetParams(reload,2,{}).weight,95);
 assert.equal(buildNotificationWorkChain([reload]).next?.suggestedWeight,95);
 assert.equal(getAdjustedSetParams(reload,3,{}).weight,100);
 assert.equal(JSON.stringify(row),original);
});
probe('very high effort uses unchanged 90kg and 6-rep rule after first set',()=>{
 const r=recommendSessionAdjustment({...input,currentSetIndex:2,currentSetRpe:10},plan[2],ex);
 assert.equal(r.status,'applied');if(r.status!=='applied')throw Error('no target');assert.equal(r.weightKg,90);assert.equal(r.reps,6);
});
probe('bodyweight first-set high effort has explicit no effect',()=>{
 const r=recommendSessionAdjustment({...input,exerciseId:'push_ups',suggestedWeight:0,currentSetWeight:0},{...plan[1],suggestedWeight:0},getExerciseById('push_ups'));
 assert.equal(r.status,'unchanged'); if(r.status!=='unchanged')throw Error('unexpected target');assert.equal(r.reason,'no_effect');
});
probe('assistance remains unsupported rather than reversing load direction',()=>{
 const r=recommendSessionAdjustment({...input,exerciseId:'assisted_pull_ups'},plan[1],getExerciseById('assisted_pull_ups'));
 assert.equal(r.status,'unchanged');if(r.status!=='unchanged')throw Error('unexpected target');assert.equal(r.reason,'unsupported_units');
});
probe('skip advisory cannot create overlay or completion',()=>{
 const r=applyAutoregulation(input);r.adjustment!.skipRemainingSets=true;
 const out=autoregulationOverlay(r,plan[1],ex);assert.equal(out.status,'unchanged');assert.equal(JSON.stringify(row),original);
});
probe('completed indices cannot be rewritten by overlays',()=>{
 assert.deepEqual(getAdjustedSetParams({...row,autoregulation_adjustments:{1:{weightDelta:-90,repsDelta:-7,reason:'bad'}}},1,{}),{weight:100,reps:8});
});
probe('corrupt saved targets do not reach guidance',()=>{
 const bad={...row,autoregulation_adjustments:{2:{weightDelta:null,repsDelta:0,reason:'bad'}}};
 assert.equal(buildNotificationWorkChain([bad]).next?.suggestedWeight,100);
});
probe('invalid effort data returns explicit no adjustment',()=>{
 assert.equal(recommendSessionAdjustment({...input,currentSetRpe:Infinity},plan[1],ex).status,'unchanged');
});
console.log(JSON.stringify(results,null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
