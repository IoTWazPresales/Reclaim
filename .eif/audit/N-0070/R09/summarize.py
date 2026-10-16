import hashlib
import json
from pathlib import Path
import re

folder = Path(__file__).resolve().parent
raw = (folder / 'full-isolated.txt').read_bytes()
log = raw.decode('utf-8', errors='replace')
baseline = json.loads((folder.parent / 'R08/full-suite-summary.json').read_text())
normalize = lambda value: re.sub(r'\s+\d+ms$', '', value.strip()).lstrip('× ').strip()
failures = [line.strip() for line in log.splitlines() if line.lstrip().startswith('× src/')]
summary = [line.strip() for line in log.splitlines() if re.match(r'^\s*(Test Files|Tests |Start at|Duration)', line)]
match = re.search(r'Tests\s+(\d+) failed \| (\d+) passed \((\d+)\)', log)
assert match and 'Duration' in log, 'Full suite must complete before summary'
failed, passed, total = map(int, match.groups())
same = sorted(map(normalize, failures)) == sorted(map(normalize, baseline['failure_assertions']))
manifest = json.loads((folder / 'source-manifest.json').read_text())
root = Path('C:/Reclaim')
source_matches = all(hashlib.sha256((root / path).read_bytes()).hexdigest() == digest and
                     hashlib.sha256((Path(manifest['checkout']) / path).read_bytes()).hexdigest() == digest
                     for path, digest in manifest['files'].items())
result = {'command': 'npm test -- --reporter=verbose', 'checkout': manifest['checkout'], 'completed': True,
          'summary_lines': summary, 'failure_assertions': failures, 'raw_log_sha256': hashlib.sha256(raw).hexdigest(),
          'raw_log_local_path': '.eif/audit/N-0070/R09/full-isolated.txt', 'source_matches_after': source_matches,
          'baseline_reference': '.eif/audit/N-0070/R08/full-suite-summary.json', 'gate_passed': failed == 0,
          'exit': 1 if failed else 0, 'failed': failed, 'passed': passed, 'total': total,
          'unexpected_assertion_failures': len(set(map(normalize, failures)) - set(map(normalize, baseline['failure_assertions']))),
          'baseline_failures_match': same}
(folder / 'full-suite-summary.json').write_text(json.dumps(result, indent=2) + '\n')
hashes = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in folder.glob('*.txt')}
(folder / 'log-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
print(json.dumps(result, indent=2))
