// Read-only catalogue comparison. Baseline must be an extracted source checkpoint.
const fs = require('fs');
const path = require('path');
const esbuild = require('../app/node_modules/esbuild');

async function load(root) {
  const result = await esbuild.build({
    stdin: { contents: `export {suggestLoading} from './app/src/lib/training/engine/index'; export {getExerciseLoadingProfile} from './app/src/lib/training/exerciseLoadingProfile'; export {formatPlannedSetSummary} from './app/src/lib/training/loadDisplayFormat';`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs', define: { __DEV__: 'false' },
    alias: { '@': path.join(root, 'app/src') },
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}

async function main() {
  const [baselineRoot, output, historyCapture] = process.argv.slice(2);
  if (!baselineRoot || !output) throw new Error('Usage: node scripts/audit_training_default_units.cjs BASELINE_ROOT OUTPUT_JSON');
  const root = path.resolve(__dirname, '..');
  const before = await load(path.resolve(baselineRoot));
  const after = await load(root);
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'app/src/lib/training/catalog/exercises.v1.json'), 'utf8'));
  const levels = ['beginner', 'intermediate', 'advanced'];
  const rows = catalog.map(exercise => {
    const unit = after.getExerciseLoadingProfile(exercise).loadDisplayMode;
    const values = levels.map(experienceLevel => {
      const input = { exercise, plannedReps: 7, priority: 'primary', goalWeights: { build_muscle: .4, build_strength: .4, lose_fat: .1, get_fitter: .1 },
        userState: { experienceLevel, estimated1RM: {}, prescriptionPolicy: 'v2' } };
      const oldWeight = before.suggestLoading(input);
      const newWeight = after.suggestLoading(input);
      const oldDisplay = before.formatPlannedSetSummary(exercise, { targetReps: 7, suggestedWeight: oldWeight });
      const newDisplay = after.formatPlannedSetSummary(exercise, { targetReps: 7, suggestedWeight: newWeight,
        ...(newWeight === 0 && (unit !== 'bodyweight' || after.getExerciseLoadingProfile(exercise).prescriptionType === 'carry_distance') ? { loadRequiresConfirmation: true } : {}) });
      return { experienceLevel, beforeKg: oldWeight, afterKg: newWeight, oldDisplay, newDisplay };
    });
    return { exerciseId: exercise.id, name: exercise.name, unit,
      numericChange: values.some(row => row.beforeKg !== row.afterKg),
      displayChange: values.some(row => row.oldDisplay !== row.newDisplay), values };
  });
  const result = { scope: 'All catalogue exercises; empty own baselines/history; all three experience levels; seven target reps. Raw default path, not a claim every exercise is selected in an allocated programme.',
    catalogueCount: rows.length, numericChanges: rows.filter(row => row.numericChange),
    confirmationLabelOnlyChanges: rows.filter(row => row.displayChange && !row.numericChange),
    unchanged: rows.filter(row => !row.displayChange).map(({ exerciseId, unit }) => ({ exerciseId, unit })) };
  if (historyCapture) {
    const history = JSON.parse(fs.readFileSync(path.resolve(historyCapture), 'utf8'));
    const perDumbbell = history.flatMap(row => {
      const exercise = catalog.find(entry => entry.id === row.exercise_id);
      if (!exercise || before.getExerciseLoadingProfile(exercise).loadDisplayMode !== 'per_dumbbell') return [];
      const plannedWeights = [...new Set((row.planned?.sets ?? []).map(set => set.suggestedWeight).filter(Number.isFinite))];
      const performedWeights = [...new Set((row.performed?.sets ?? []).map(set => set.weight).filter(Number.isFinite))];
      const matchedLevels = levels.filter(experienceLevel => {
        const population = before.suggestLoading({ exercise, plannedReps: row.planned?.sets?.[0]?.targetReps ?? 7,
          priority: row.planned?.priority ?? 'primary', goalWeights: { build_muscle: .4, build_strength: .4, lose_fat: .1, get_fitter: .1 },
          userState: { experienceLevel, estimated1RM: {}, prescriptionPolicy: 'v2' } });
        return population > 0 && plannedWeights.includes(population);
      });
      return [{ exerciseId: exercise.id, plannedWeights, performedWeights, matchedPopulationLevels: matchedLevels,
        completedSession: row.training_sessions?.ended_at != null,
        explicitDefaultSourceRecorded: !!row.planned?.decisionTrace?.loadDefaultSource }];
    });
    result.historyRead = { rowsScanned: history.length, sessionsScanned: new Set(history.map(row => row.session_id)).size,
      operatorScopedReadOnly: true, perDumbbellRows: perDumbbell,
      rowsMatchingAffectedPopulationValues: perDumbbell.filter(row => row.matchedPopulationLevels.length).length,
      attribution: 'Numeric matches are candidates only. Historical source metadata is absent; neither a barbell-default origin nor absence of past contamination can be proven from these rows. No history was changed.' };
  }
  fs.writeFileSync(path.resolve(output), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ catalogueCount: result.catalogueCount, numericChanges: result.numericChanges.length,
    confirmationLabelOnlyChanges: result.confirmationLabelOnlyChanges.length,
    byUnit: Object.fromEntries([...new Set(result.numericChanges.map(row => row.unit))].map(unit => [unit, result.numericChanges.filter(row => row.unit === unit).length])) }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
