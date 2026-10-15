"""Summarize final R08 gates without committing bulk runner logs."""
import hashlib, json, re, subprocess
from pathlib import Path
root = Path(__file__).parent
raw = (root / 'full-isolated.txt').read_bytes()
text = re.sub(r'\x1b\[[0-9;]*m', '', raw.decode('utf-8', errors='replace'))
summary_lines = [line.strip() for line in text.splitlines() if re.match(r'^\s*(Test Files|Tests|Duration|Start at)\s', line)]
assert any(line.startswith('Tests ') for line in summary_lines), 'full suite has not finished'
failed = [line.strip() for line in text.splitlines() if line.startswith(' \u00d7 ')]
manifest = json.loads((root / 'source-manifest.json').read_text())
matching = all(hashlib.sha256((Path(manifest['checkout']) / name).read_bytes()).hexdigest() == sha for name, sha in manifest['files'].items())
result = {'command': 'npm test -- --reporter=verbose', 'checkout': manifest['checkout'] + '/app', 'completed': True,
          'summary_lines': summary_lines, 'failure_assertions': failed, 'raw_log_sha256': hashlib.sha256(raw).hexdigest(),
          'raw_log_local_path': '.eif/audit/N-0070/R08/full-isolated.txt', 'source_matches_after': matching,
          'baseline_reference': '.eif/audit/N-0070/R07/full-suite-summary.json', 'gate_passed': not failed}
baseline = json.loads((root.parent / 'R07' / 'full-suite-summary.json').read_text())
def failure_key(value):
    return re.sub(r' \d+ms$', '', value.removeprefix('\u00d7 '))
same = {failure_key(value) for value in failed} == {failure_key(value) for value in baseline['failure_assertions']}
counts = re.search(r'Tests\s+(\d+) failed\s*\|\s*(\d+) passed\s*\((\d+)\)', text)
assert counts and matching
result.update(exit=1 if failed else 0, failed=int(counts[1]), passed=int(counts[2]), total=int(counts[3]),
              test_files=int(re.search(r'Test Files[^\n]*\((\d+)\)', text)[1]),
              unexpected_assertion_failures=0 if same else None, baseline_failures_match=same)
(root / 'full-suite-summary.json').write_text(json.dumps(result, indent=2) + '\n')
logs = ['typecheck-final.txt', 'typecheck-mixed-final.txt', 'dual-path.txt', 'catalogue.txt', 'wrapper.txt', 'reviewer-focused-final.txt', 'reviewer-probes-final.txt']
(root / 'log-hashes.json').write_text(json.dumps({name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in logs}, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=True))
