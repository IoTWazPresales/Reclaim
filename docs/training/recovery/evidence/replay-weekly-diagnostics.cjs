// Offline only. Private capture stays under LOCALAPPDATA; stdout is sanitized.
// Usage: node docs/training/recovery/evidence/replay-weekly-diagnostics.cjs
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
const transportNames = ['src/lib/training/programmeWeekProposal.ts', 'src/lib/training/programmeProjection.ts'];
const replacementNames = [validatorName, ...transportNames];
const replacements = new Map(replacementNames.map(name => {
  const bytes = fs.readFileSync(path.join(root, 'app', name));
  return [name, { sha256: hash(bytes), compiled: esbuild.transformSync(bytes.toString(), { loader: 'ts', format: 'cjs', target: 'es2022' }).code }];
}));
const definitions = parser.parse(source, { sourceType: 'script', allowReturnOutsideFunction: true }).program.body
  .filter(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.name === '__d')
  .map(n => source.slice(n.start, n.end));
const manifest = json('source-manifest.json');
const sourceMatches = manifest.entries.map(entry => {
  const current = hash(fs.readFileSync(path.join(root, 'app', entry.path)));
  if (![...replacementNames, 'src/lib/training/types.ts'].includes(entry.path)) assert.equal(current, entry.mapSha256, entry.path);
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
    if (m.name === validatorName || corrected && transportNames.includes(m.name)) {
      const localRequire = spec => {
        const name = path.posix.normalize(path.posix.join(path.posix.dirname(m.name), spec));
        const resolved = [name, `${name}.ts`, `${name}/index.ts`].find(candidate => [...modules.values()].some(value => value.name === candidate));
        assert.ok(resolved, spec); return requireId(idFor(resolved));
      };
      // esbuild uses getter exports and lexical calls inside this module. Wrap
      // the function binding so both public and internal calls are observed.
      const code = replacements.get(m.name).compiled + (m.name === validatorName ? '\nvalidateProgrammeWeek = capture(validateProgrammeWeek);' : '');
      new Function('require', 'module', 'exports', 'capture', code)(localRequire, mod, mod.exports, captureValidation);
    } else {
      const imp = dep => { const value = requireId(dep); return value && value.__esModule ? value.default : value; };
      const all = dep => { const value = requireId(dep); return value && value.__esModule ? value : { ...value, default: value }; };
      m.factory(ctx, requireId, imp, all, mod, mod.exports, m.deps);
    }
    m.exports = mod.exports;
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
  return { plan, weeks, validations, registeredModules: modules.size,
    diagnostics: corrected ? weeks.map(w => get('src/lib/training/programmeProjection.ts').weeklyProgrammeDiagnostics(w.proposals.map(([, proposal]) => ({ proposal })))) : [] };
}
// Both runs use the corrected validator. Only transport/projection changes between them.
const before = replay(false), after = replay(true);
const previous = json('correction-replay-private.json').after;
equal(before.plan, previous.plan); equal(before.weeks, previous.weeks);
equal(after.plan, before.plan);
equal(after.validations, before.validations);
const summaries = [];
for (let i = 0; i < 4; i++) {
  const result = after.validations[i].result;
  assert.equal(result.status, 'unresolved');
  assert.equal(result.issues.length, 20);
  assert.equal(result.issues.filter(x => x.code === 'load_requires_confirmation').length, 19);
  assert.equal(result.issues.filter(x => x.code === 'history_evidence_unverified' && x.exerciseId === 'leg_press').length, 1);
  assert.ok(result.issues.every(x => x.severity === 'warning' && x.provenance && x.exerciseId));
  const diagnostics = after.diagnostics[i];
  assert.equal(diagnostics.length, 1);
  equal(diagnostics[0], { ...result, weekIndex: i + 1, policyVersion: after.validations[i].declaration.policyVersion, strategyId: after.validations[i].declaration.strategyId });
  assert.equal(after.weeks[i].proposals.length, 5);
  for (let j = 0; j < 5; j++) {
    const proposal = after.weeks[i].proposals[j][1];
    assert.equal(proposal.programmeValidation.status, 'feasible');
    equal(proposal.weeklyValidation, diagnostics[0]);
    const { weeklyValidation, ...rest } = proposal;
    equal(rest, before.weeks[i].proposals[j][1]);
  }
  summaries.push({ week: i + 1, status: result.status, feasibleDays: 5, weeklyWarnings: 20, loadConfirmations: 19, historyBarriers: 1, uniqueSummaryResults: 1, exactIssueAndCoverageEquality: true, originalProposalExceptDiagnosticsUnchanged: true });
}
const receipt = { scope: 'Offline transport verification only; no live access, session writes, Android or EIF acceptance',
  loadedBundleSha256: hash(source), replacementSourceSha256: Object.fromEntries([...replacements].map(([name, value]) => [name, value.sha256])),
  trainingSourceFingerprints: sourceMatches, registeredModules: after.registeredModules,
  correctedBaselineExactlyReproduced: true, originalPlanPrescriptionsHistoryAndValidationUnchanged: true, weeks: summaries };
fs.writeFileSync(path.join(__dirname, 'weekly-diagnostics-replay-20261018.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ weeks: summaries, correctedBaselineExactlyReproduced: true }, null, 2));
