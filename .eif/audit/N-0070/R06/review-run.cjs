const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../../..');
process.chdir(root);
const esbuild = require(path.join(root, 'app/node_modules/esbuild'));
(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'source-manifest.json'), 'utf8'));
  for (const row of manifest) {
    const data = cp.execFileSync('git', ['show', ':' + row.path]);
    if (crypto.createHash('sha256').update(data).digest('hex') !== row.sha256) throw new Error('Index hash mismatch: ' + row.path);
  }
  const artifact = path.join(__dirname, 'review-index-probes.cjs');
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'review-probes.ts')], outfile: artifact,
    bundle: true, platform: 'node', format: 'cjs', tsconfig: 'app/tsconfig.json', logLevel: 'silent',
    plugins: [{ name: 'exact-index-source', setup(build) {
      build.onLoad({ filter: /[\\/]app[\\/]src[\\/].*\.(ts|tsx|json)$/ }, args => {
        const relative = path.relative(root, args.path).split(path.sep).join('/');
        const contents = cp.execFileSync('git', ['show', ':' + relative], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
        const extension = path.extname(args.path);
        return { contents, loader: extension === '.json' ? 'json' : extension === '.tsx' ? 'tsx' : 'ts' };
      });
    }}],
  });
  const result = cp.execFileSync(process.execPath, [artifact], { encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, 'review-index-probes.json'), result);
  const rows = JSON.parse(result);
  console.log(JSON.stringify({ manifest_verified: manifest.length, passed: rows.filter(row => row.pass).length, total: rows.length }));
  if (rows.some(row => !row.pass)) process.exitCode = 1;
})();
