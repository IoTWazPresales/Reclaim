// Offline only. Private capture stays under LOCALAPPDATA; stdout is sanitized.
// Usage: node docs/training/recovery/evidence/replay-incomplete-history.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const parser = require(path.join(root, 'app/node_modules/@babel/parser'));
const esbuild = require(path.join(root, 'app/node_modules/esbuild'));
const dir = path.join(process.env.LOCALAPPDATA, 'ReclaimDiagnostics/programme-exact-20261018');
const read = name => fs.readFileSync(path.join(dir, name));
const json = name => JSON.parse(read(name));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const canonical = x => Array.isArray(x) ? x.map(canonical) : x && typeof x === 'object'
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x;
// Never put private objects into assertion diagnostics, including failure paths.
const equal = (a, b) => assert.ok(JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)), 'Offline structural equality failed');
const captured = json('exact-private.json');
const source = read('loaded-bundle.js').toString();
const baselineReceipt = JSON.parse(fs.readFileSync(path.join(__dirname, 'programme-exact-20261018.json')));
for (const [name, expected] of Object.entries(baselineReceipt.privateArtifactSha256)) assert.equal(hash(read(name)), expected, name);
const validatorName = 'src/lib/training/weeklyProgrammeValidator.ts';
const replacement = fs.readFileSync(path.join(root, 'app', validatorName));
const compiled = esbuild.transformSync(replacement.toString(), { loader: 'ts', format: 'cjs', target: 'es2022' }).code;
const normalizedReplacement = replacement.toString().replace(/\r\n/g, '\n');
assert.equal(esbuild.transformSync(normalizedReplacement, { loader: 'ts', format: 'cjs', target: 'es2022' }).code, compiled, 'Line ending normalization changes executed correction');
const definitions = parser.parse(source, { sourceType: 'script', allowReturnOutsideFunction: true }).program.body
  .filter(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.name === '__d')
  .map(n => source.slice(n.start, n.end));
const manifest = json('source-manifest.json');
const sourceMatches = manifest.entries.map(entry => {
  const current = hash(fs.readFileSync(path.join(root, 'app', entry.path)));
  if (entry.path !== validatorName) assert.equal(current, entry.mapSha256, entry.path);
  return { path: entry.path, capturedSourceSha256: entry.mapSha256, replaySourceSha256: current };
});

function replay(corrected) {
  const validations = [], modules = new Map();
  const captureValidation = original => (...args) => {
    const result = original(...args);
    validations.push(JSON.parse(JSON.stringify({ declaration: args[0], generated: args[1], result })));
    return result;
  };
  const ctx = vm.createContext({ __DEV__: true, console, process: { env: { NODE_ENV: 'development' } }, setTimeout, clearTimeout, Date, Math, Map, Set, Promise });
  ctx.global = ctx; ctx.globalThis = ctx;
  ctx.__d = (factory, id, deps, name) => modules.set(id, { factory, deps, name, exports: {}, initialized: false });
  for (const definition of definitions) vm.runInContext(definition, ctx);
  const idFor = name => { const entry = [...modules].find(([, m]) => m.name === name); assert.ok(entry, name); return entry[0]; };
  const requireId = id => {
    const m = modules.get(id); assert.ok(m, String(id));
    if (m.initialized) return m.exports;
    m.initialized = true;
    const mod = { exports: m.exports };
    if (corrected && m.name === validatorName) {
      const localRequire = spec => {
        const name = path.posix.normalize(path.posix.join(path.posix.dirname(m.name), spec));
        return requireId(idFor(name.endsWith('.json') ? name : `${name}.ts`));
      };
      // esbuild uses getter exports and lexical calls inside this module. Wrap
      // the function binding so both public and internal calls are observed.
      new Function('require', 'module', 'exports', 'capture', compiled + '\nvalidateProgrammeWeek = capture(validateProgrammeWeek);')(localRequire, mod, mod.exports, captureValidation);
    } else {
      const imp = dep => { const value = requireId(dep); return value && value.__esModule ? value.default : value; };
      const all = dep => { const value = requireId(dep); return value && value.__esModule ? value : { ...value, default: value }; };
      m.factory(ctx, requireId, imp, all, mod, mod.exports, m.deps);
    }
    m.exports = mod.exports;
    if (!corrected && m.name === validatorName) m.exports.validateProgrammeWeek = captureValidation(m.exports.validateProgrammeWeek);
    return m.exports;
  };
  const get = name => requireId(idFor(name));
  const planner = get('src/lib/training/programPlanner.ts');
  const proposals = get('src/lib/training/programmeWeekProposal.ts');
  const capturedSessions = captured.weeks.flatMap(w => w.proposals.map(([, p]) => p));
  let now = 0, date = 0;
  ctx.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [capturedSessions[date++].createdAt])); }
    static now() { return Number(capturedSessions[now++].id.replace('session_', '')); }
  };
  const profile = structuredClone(captured.input.profile);
  const plan = planner.buildFourWeekPlan(profile, captured.input.selectedWeekdays, new Date(captured.input.startDateISO));
  const weeks = plan.weeks.map(w => ({ weekIndex: w.weekIndex, proposals: [...proposals.programmeWeekProposal(plan, w.weekIndex, profile, captured.input.options)] }));
  assert.equal(validations.length, 4);
  equal(profile, captured.input.profile);
  const rows = JSON.parse(JSON.parse(read('history-private.json')).result.result.value).items;
  const history = get('src/lib/training/performanceHistory.ts').completedPerformanceHistory(rows, 3);
  equal(history, captured.seed.recentSessionPerformance);
  const exercise = validations[0].generated.sessions.flatMap(s => s.plan.exercises).find(e => e.exerciseId === 'leg_press').exercise;
  assert.equal(get('src/lib/training/performanceHistory.ts').isQualifiedPerformance(exercise, profile.lastSessionPerformance.leg_press), false);
  const controls = [];
  if (corrected) for (const [name, mutate] of [
    ['false_qualified', h => { h.evidence.status = 'qualified'; h.evidence.reasons = []; }],
    ['identity_mismatch', h => { h.exerciseId = 'barbell_row'; }],
    ['missing_metadata', h => { delete h.evidence; }],
    ['malformed_numeric', h => { h.sets = [{ setIndex: 1, weight: NaN, reps: 8, completedAt: h.date }]; }],
  ]) {
    const altered = structuredClone(profile); mutate(altered.lastSessionPerformance.leg_press);
    const results = validations.slice(0, 4).map(v => get(validatorName).validateProgrammeWeek(v.declaration, v.generated, altered));
    assert.ok(results.every(r => r.status === 'invalid' && r.issues.some(i => i.code === 'invalid_load_evidence' && i.exerciseId === 'leg_press')));
    controls.push({ name, statuses: results.map(r => r.status), legPressInvalidLoadEvidence: true });
  }
  if (corrected) {
    const results = validations.slice(0, 4).map(v => {
      const generated = structuredClone(v.generated);
      const legPress = generated.sessions.flatMap(s => s.plan.exercises).find(e => e.exerciseId === 'leg_press');
      legPress.plannedSets.forEach(set => { set.suggestedWeight = 1; });
      return get(validatorName).validateProgrammeWeek(v.declaration, generated, profile);
    });
    assert.ok(results.every(r => r.status === 'invalid' && r.issues.some(i => i.code === 'unanchored_external_load' && i.exerciseId === 'leg_press') && !r.issues.some(i => i.code === 'invalid_load_evidence')));
    controls.push({ name: 'incomplete_cannot_anchor_external_load', statuses: results.map(r => r.status), unanchoredExternalLoad: true, invalidLoadEvidence: false });
  }
  return { plan, weeks, validations: validations.slice(0, 4), controls, registeredModules: modules.size };
}
const before = replay(false), after = replay(true);
equal(before.plan, captured.plan); equal(before.weeks, captured.weeks);
equal(after.plan, before.plan);
for (let i = 0; i < 4; i++) {
  equal(before.validations[i].declaration, after.validations[i].declaration);
  equal(before.validations[i].generated, after.validations[i].generated);
  equal(before.validations[i].result.coverage, after.validations[i].result.coverage);
  assert.equal(before.validations[i].result.status, 'invalid');
  equal(before.validations[i].result.issues.filter(x => x.severity === 'error').map(x => [x.code, x.exerciseId]), [['invalid_load_evidence', 'leg_press']]);
  assert.equal(after.validations[i].result.status, 'unresolved');
  assert.equal(after.validations[i].result.issues.filter(x => x.severity === 'error').length, 0);
}
const summary = run => run.validations.map((v, i) => ({
  week: i + 1, status: v.result.status,
  errors: v.result.issues.filter(x => x.severity === 'error').map(({ code, exerciseId }) => ({ code, exerciseId })),
  warnings: Object.entries(v.result.issues.filter(x => x.severity === 'warning').reduce((a, x) => {
    const key = `${x.code}:${x.exerciseId ?? '(week)'}`; a[key] = (a[key] ?? 0) + 1; return a;
  }, {})).map(([key, count]) => ({ key, count })),
  dailyStatuses: run.weeks[i].proposals.map(([, p]) => p.programmeValidation?.status),
}));
const receipt = {
  scope: 'Offline source correction only; no live writes, historical rewrites, acceptance or R12',
  loadedBundleSha256: hash(source), correctedValidatorSourceSha256: hash(replacement), correctedCommonJsSha256: hash(compiled),
  normalizedValidatorSourceSha256: hash(normalizedReplacement), normalizedCorrectionExecutesIdentically: true,
  registeredModules: before.registeredModules, trainingSourceFingerprints: sourceMatches,
  exactCapturedPlanAndFourWeeksBefore: true, canonicalHistoryAdapterExact: true,
  planAndGeneratedPrescriptionsUnchanged: true, declarationsAndCoverageUnchanged: true,
  replacement: 'Only weeklyProgrammeValidator replaced with transpiled current source; other factories are the captured executed bundle, including retained engine edit',
  before: summary(before), after: summary(after), controls: after.controls,
};
fs.writeFileSync(path.join(dir, 'correction-replay-private.json'), JSON.stringify({ before, after }, null, 2));
fs.writeFileSync(path.join(__dirname, 'incomplete-history-replay-20261018.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ before: receipt.before, after: receipt.after, controls: receipt.controls }, null, 2));
