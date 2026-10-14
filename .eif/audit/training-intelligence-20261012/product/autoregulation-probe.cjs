/* Audit-only probe. Executes unchanged source functions; no application or DB writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../../');
const ts = require(path.join(root, 'app/node_modules/typescript'));
function load(relative, allowedImports = {}) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const scopedRequire = name => {
    if (Object.prototype.hasOwnProperty.call(allowedImports, name)) return allowedImports[name];
    throw new Error('Unexpected runtime import: ' + name);
  };
  vm.runInNewContext('(function(require,module,exports){' + js + '\n})', {}, { filename })(scopedRequire, mod, mod.exports);
  return mod.exports;
}
const { applyAutoregulation } = load('app/src/lib/training/runtime/autoregulation.ts');
// This import provides completion helpers, which getAdjustedSetParams does not call.
const { getAdjustedSetParams } = load('app/src/lib/training/sessionDerivedState.ts', { '@/lib/training/sessionWorkAuthority': {} });
const input = {
  exerciseId: 'barbell_bench_press', currentSetIndex: 1, currentSetRpe: 9,
  currentSetReps: 8, currentSetWeight: 100, targetReps: 8, suggestedWeight: 100,
  previousSets: [], plannedSets: [{ setIndex: 1, suggestedWeight: 100, targetReps: 8, restSeconds: 90 }, { setIndex: 2, suggestedWeight: 100, targetReps: 8, restSeconds: 90 }],
};
const result = applyAutoregulation(input);
// Exact field projection currently used in TrainingSessionView lines 769-773.
const persisted = { weightDelta: result.adjustment.weightDelta ?? 0, repsDelta: result.adjustment.targetRepsDelta ?? 0, reason: result.adjustment.ruleId ?? 'rpe' };
const actualNextSet = getAdjustedSetParams({ id: 'audit-item', planned: { sets: input.plannedSets }, autoregulation_adjustments: { 2: persisted } }, 2, {});
console.log(JSON.stringify({ input, ruleResult: result, viewProjection: persisted, actualNextSet, mismatch: actualNextSet.weight !== result.adjustedWeight, scope: 'source-function contract probe; not an Android or DB journey' }, null, 2));
if (result.adjustedWeight !== 95 || actualNextSet.weight !== 100) process.exitCode = 1;
