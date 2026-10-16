"""Compare Git index/commit blobs with the independently tested R09 source."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path('C:/Reclaim')
folder = root / '.eif/audit/N-0070/R09'
manifest = json.loads((folder / 'source-manifest.json').read_text())
revision = sys.argv[1] if len(sys.argv) > 1 else ''
results = {}
for name, expected in manifest['files'].items():
    tested = (Path(manifest['checkout']) / name).read_bytes()
    assert hashlib.sha256(tested).hexdigest() == expected, name
    canonical = tested.replace(b'\r\n', b'\n')
    blob = subprocess.check_output(['git', 'show', f'{revision}:{name}'], cwd=root)
    assert blob == canonical, f'Publication differs from tested source: {name}'
    results[name] = {'tested_raw_sha256': expected, 'canonical_lf_sha256': hashlib.sha256(canonical).hexdigest(), 'matches': True}
receipt = {'revision': revision or 'index', 'baseline': manifest['baseline'], 'files': results, 'matched': len(results), 'line_endings': 'CRLF normalized to LF only; exact raw tested hashes retained'}
destination = folder / ('committed-source-receipt.json' if revision else 'staged-source-receipt.json')
destination.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'revision': receipt['revision'], 'matched': len(results)}))
