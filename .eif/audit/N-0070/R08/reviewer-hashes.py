"""Verify the isolated R08 source against the supplied SHA-256 manifest."""
import hashlib
import json
from pathlib import Path

audit = Path(__file__).parent
manifest = json.loads((audit / 'source-manifest.json').read_text())
checkout = Path(manifest['checkout'])
observed = {
    name: hashlib.sha256((checkout / name).read_bytes()).hexdigest()
    for name in manifest['files']
}
mismatches = [name for name, sha in observed.items() if manifest['files'][name] != sha]
receipt = {
    'checkout': str(checkout),
    'manifest_sha256': hashlib.sha256((audit / 'source-manifest.json').read_bytes()).hexdigest(),
    'checked': len(observed),
    'mismatches': mismatches,
    'observed': observed,
}
(audit / 'reviewer-source-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'checked': len(observed), 'mismatches': mismatches}))
raise SystemExit(bool(mismatches))
