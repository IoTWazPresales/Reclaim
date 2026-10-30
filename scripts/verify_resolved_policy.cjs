// Run the operator-authorized fallback sequentially; keep raw reports local.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'app');
const evidence = path.join(root, 'docs/training/recovery/evidence/resolved-policy-20261030');
fs.mkdirSync(evidence, { recursive: true });
const inventory = fs.readdirSync(path.join(app, 'src'), { recursive: true })
  .filter(file => /\.(test|spec)\.tsx?$/.test(file)).map(file => `src/${file.replaceAll('\\', '/')}`).sort();
const resume = Number(process.argv.find(arg => arg.startsWith('--resume-from='))?.split('=')[1] ?? 1);
if (!Number.isInteger(resume) || resume < 1 || resume > 4) throw new Error('Invalid resume shard');
const previous = resume > 1 ? JSON.parse(fs.readFileSync(path.join(evidence, 'inventory.json'), 'utf8')) : undefined;
if (previous && (JSON.stringify(previous.expected) !== JSON.stringify(inventory) || previous.runs.length !== resume - 1 || previous.runs.some(run => run.exitCode !== 0 || run.failed !== 0))) throw new Error('Resume requires the same inventory and successful preceding shards');
const runs = previous?.runs ?? [];
for (let shard = resume; shard <= 4; shard++) {
  console.log(`Starting shard ${shard}/4`);
  const rawLog = path.join(app, `policy-shard-${shard}.local.txt`);
  const rawReport = path.join(app, `policy-shard-${shard}.local.json`);
  if (fs.existsSync(rawReport)) fs.rmSync(rawReport);
  const fd = fs.openSync(rawLog, 'w');
  const args = ['node_modules/vitest/vitest.mjs', 'run', '--shard', `${shard}/4`, '--reporter=verbose', '--reporter=json', `--outputFile.json=${rawReport}`];
  const result = cp.spawnSync(process.execPath, args, { cwd: app, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  // Normalize machine-specific paths. Only synthetic test execution output is
  // published; private captures are never passed to the suite.
  let output = fs.readFileSync(rawLog, 'utf8').replace(/\u001b\[[0-9;]*m/g, '');
  for (const prefix of [root, root.replaceAll('\\', '/'), process.env.USERPROFILE].filter(Boolean)) output = output.split(prefix).join('<workspace>');
  fs.writeFileSync(path.join(evidence, `shard-${shard}.txt`), output);
  const report = fs.existsSync(rawReport) ? JSON.parse(fs.readFileSync(rawReport, 'utf8')) : undefined;
  runs.push({ shard: `${shard}/4`, command: `vitest run --shard ${shard}/4 --reporter=verbose --reporter=json`, exitCode: result.status,
    passed: report?.numPassedTests, failed: report?.numFailedTests,
    files: report?.testResults.map(test => ({ path: path.relative(app, test.name).replaceAll('\\', '/'), status: test.status })) ?? [] });
  fs.writeFileSync(path.join(evidence, 'inventory.json'), JSON.stringify({ expected: inventory, runs }, null, 2) + '\n');
  console.log(`Shard ${shard}/4 exited ${result.status}; passed ${report?.numPassedTests}; failed ${report?.numFailedTests}`);
}
const observed = runs.flatMap(run => run.files.map(file => file.path)).sort();
const unique = [...new Set(observed)].sort();
const missing = inventory.filter(file => !unique.includes(file));
const extra = unique.filter(file => !inventory.includes(file));
const pass = runs.every(run => run.exitCode === 0 && run.failed === 0 && run.files.every(file => file.status === 'passed')) &&
  observed.length === unique.length && missing.length === 0 && extra.length === 0;
const receipt = { expectedFileCount: inventory.length, observedFileCount: observed.length, uniqueFileCount: unique.length, missing, extra,
  zeroDuplicateFiles: observed.length === unique.length, gatePassed: pass, expected: inventory, runs };
fs.writeFileSync(path.join(evidence, 'inventory.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ ...receipt, expected: undefined, runs: runs.map(({ files, ...run }) => ({ ...run, fileCount: files.length })) }, null, 2));
process.exitCode = pass ? 0 : 1;
