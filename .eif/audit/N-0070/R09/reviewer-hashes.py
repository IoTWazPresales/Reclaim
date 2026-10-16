"""Independently compare the ten scoped source pointers without EIF access."""
import hashlib
import json
from pathlib import Path

root = Path('C:/Reclaim')
evidence = root / '.eif/audit/N-0070/R09'
manifest = json.loads((evidence / 'source-manifest.json').read_text())
results = []
for name, expected in manifest['files'].items():
    tested_bytes = (Path(manifest['checkout']) / name).read_bytes()
    actual = hashlib.sha256(tested_bytes).hexdigest()
    live = hashlib.sha256((root / name).read_bytes()).hexdigest()
    canonical_lf = hashlib.sha256(tested_bytes.replace(b'\r\n', b'\n')).hexdigest()
    results.append({'path': name, 'expected_sha256': expected, 'isolated_sha256': actual, 'live_sha256': live, 'canonical_lf_sha256': canonical_lf, 'matches': actual == expected == live})
receipt = {'baseline': manifest['baseline'], 'checkout': manifest['checkout'], 'count': len(results), 'mismatches': sum(not row['matches'] for row in results), 'files': results}
(evidence / 'reviewer-source-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'count': receipt['count'], 'mismatches': receipt['mismatches']}))
raise SystemExit(bool(receipt['mismatches']))
