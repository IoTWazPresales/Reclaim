from pathlib import Path
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[4]
audit = root / '.eif/audit/N-0069/R05'
def blob(path):
    return subprocess.check_output(['git', 'show', ':' + path], cwd=root)
manifest = json.loads((audit / 'source-manifest.json').read_text(encoding='utf-8'))
for path, expected in manifest['sources'].items():
    assert hashlib.sha256(blob(path)).hexdigest() == expected['gitNormalizedSha256'], path
    oid = subprocess.check_output(['git', 'rev-parse', ':' + path], cwd=root, text=True).strip()
    assert oid == expected['gitBlobOid'], path
verification = json.loads(blob('.eif/audit/N-0069/R05/verification.json'))
for row in verification['receipts']:
    path = '.eif/audit/N-0069/R05/' + row['log']
    assert hashlib.sha256(blob(path)).hexdigest() == row['logGitNormalizedSha256'], path
assert hashlib.sha256(blob(manifest['fixtures']['path'])).hexdigest() == manifest['fixtures']['sha256']
prior = subprocess.check_output(['git', 'show', 'HEAD:CONTEXT.md'], cwd=root)
assert blob('CONTEXT.md').endswith(prior), 'CONTEXT.md must preserve earlier contents as suffix'
expected_paths = set((audit / 'scoped-paths.txt').read_text(encoding='utf-8').splitlines())
actual_paths = set(subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=root, text=True).splitlines())
assert actual_paths == expected_paths, ('Unexpected staging', actual_paths ^ expected_paths)
print('Reviewed source blobs, receipt log hashes, fixture archive, add-only context and all', len(actual_paths), 'explicit staged paths verified.')
