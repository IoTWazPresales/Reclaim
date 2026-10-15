"""Package only the reviewed R05 candidate; no ledger/runtime access."""
from pathlib import Path
import gzip
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parents[4]
audit = root / '.eif/audit/N-0069/R05'
isolated = Path('C:/Reclaim-R05-verify-20261014')
paths = [
    'app/src/lib/training/weeklyProgrammeValidator.ts',
    'app/src/lib/training/__tests__/weeklyProgrammeValidator.test.ts',
]
sources = {}
for relative in paths:
    raw = (root / relative).read_bytes()
    assert raw == (isolated / relative).read_bytes(), relative
    normalized = raw.replace(b'\r\n', b'\n')
    sources[relative] = {
        'reviewedFilesystemSha256': hashlib.sha256(raw).hexdigest(),
        'gitNormalizedSha256': hashlib.sha256(normalized).hexdigest(),
        'gitBlobOid': hashlib.sha1(b'blob ' + str(len(normalized)).encode() + b'\0' + normalized).hexdigest(),
    }
raw = (audit / 'outcomes.json').read_bytes()
(audit / 'outcomes.json.gz').write_bytes(gzip.compress(raw, mtime=0))
data = json.loads(raw)
assert data['reviewedResult']['status'] == 'valid'
assert len(data['adversarial']) == 63
assert all(row['result']['status'] == 'invalid' and row['expectedCode'] in [issue['code'] for issue in row['result']['issues']] for row in data['adversarial'])
manifest = {
    'baselineCommit': '37118f59da8692875bb4c881cd9994697d91c60d',
    'sourceRoot': str(isolated),
    'policyVersion': 'weekly-20261014-v2',
    'sources': sources,
    'fixtures': {
        'path': '.eif/audit/N-0069/R05/outcomes.json.gz',
        'sha256': hashlib.sha256((audit / 'outcomes.json.gz').read_bytes()).hexdigest(),
        'uncompressedSha256': hashlib.sha256(raw).hexdigest(),
        'adversarialCount': len(data['adversarial']),
        'publicScenarioCount': len(data['fixtures']),
        'validPublicScenarios': sum(row['result']['status'] == 'valid' for row in data['fixtures']),
        'invalidPublicScenarios': sum(row['result']['status'] == 'invalid' for row in data['fixtures']),
    },
}
(audit / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest, indent=2))
