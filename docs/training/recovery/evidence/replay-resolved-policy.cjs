// Offline replay. Never print private capture/profile/session identifiers.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const Module = require('node:module');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const esbuild = require(path.join(root, 'app/node_modules/esbuild'));
const capturePath = path.join(process.env.LOCALAPPDATA, 'ReclaimDiagnostics/programme-exact-20261018/exact-private.json');
const captureBytes = fs.readFileSync(capturePath);
const captured = JSON.parse(captureBytes);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function load(baseline) {
  const sourceHashes = {};
  const bundle = await esbuild.build({ stdin: { contents: `export { buildFourWeekPlan } from './app/src/lib/training/programPlanner'; export { programmeWeekProposal } from './app/src/lib/training/programmeWeekProposal';`, resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs', define: { __DEV__: 'false' },
    plugins: [{ name: 'source-receipt', setup(build) {
      build.onLoad({ filter: /\.(ts|json)$/ }, args => {
        const relative = path.relative(root, args.path).replaceAll('\\', '/');
        assert.ok(relative.startsWith('app/src/lib/training/'), 'Replay must stay inside pure training sources');
        const bytes = baseline ? cp.execFileSync('git', ['show', `1e18694:${relative}`], { cwd: root }) : fs.readFileSync(args.path);
        sourceHashes[relative] = hash(bytes);
        return { contents: bytes.toString(), loader: args.path.endsWith('.json') ? 'json' : 'ts' };
      });
    } }],
  });
  const mod = new Module(path.join(root, 'app/policy-replay.local.cjs'));
  mod.paths = Module._nodeModulePaths(path.join(root, 'app'));
  mod._compile(bundle.outputFiles[0].text, path.join(root, 'app/policy-replay.local.cjs'));
  return { api: mod.exports, sourceHashes };
}

function replay(api) {
  const profile = structuredClone(captured.input.profile);
  const before = JSON.stringify(profile);
  const plan = api.buildFourWeekPlan(profile, captured.input.selectedWeekdays, new Date(captured.input.startDateISO));
  const weeks = plan.weeks.map(week => {
    const proposals = [...api.programmeWeekProposal(plan, week.weekIndex, profile, captured.input.options)];
    const validation = proposals[0]?.[1].weeklyValidation;
    const warnings = {};
    for (const issue of validation?.issues ?? []) if (issue.severity === 'warning') warnings[issue.code] = (warnings[issue.code] ?? 0) + 1;
    return { week: week.weekIndex, policyVersion: plan.programme.policyVersion,
      status: validation?.status, warnings, loadRequiresConfirmation: warnings.load_requires_confirmation ?? 0,
      days: proposals.map(([day, session]) => ({ day, estimatedMinutes: session.estimatedDurationMinutes,
        workingSets: session.exercises.reduce((n, ex) => n + ex.plannedSets.length, 0),
        exercises: session.exercises.map(ex => ({ exerciseId: ex.exerciseId, sets: ex.plannedSets.length,
          loadsKg: ex.plannedSets.map(set => set.suggestedWeight), reps: ex.plannedSets.map(set => set.targetReps) })),
        capShortfalls: session.programmeValidation?.issues.filter(i => i.code === 'volume_cap_shortfall').map(i => i.message) ?? [],
      })),
    };
  });
  assert.equal(JSON.stringify(profile), before, 'Replay must not mutate profile/baselines');
  return weeks;
}

(async () => {
  const baseline = await load(true), current = await load(false);
  const before = replay(baseline.api), after = replay(current.api);
  const receipt = { scope: 'Offline captured-profile replay; new builds only; no Android/live/EIF acceptance/R12', baseline: '1e18694',
    privateCaptureSha256: hash(captureBytes), sourceHashes: { before: baseline.sourceHashes, after: current.sourceHashes },
    before, after,
    confirmationWarningChanges: after.map((week, i) => ({ week: week.week, before: before[i].loadRequiresConfirmation, after: week.loadRequiresConfirmation, delta: week.loadRequiresConfirmation - before[i].loadRequiresConfirmation })),
  };
  fs.writeFileSync(path.join(__dirname, 'resolved-policy-replay-20261030.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ before, after, confirmationWarningChanges: receipt.confirmationWarningChanges }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
