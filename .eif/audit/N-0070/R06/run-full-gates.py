from pathlib import Path
import hashlib, json, subprocess, time
root = Path('C:/Reclaim')
audit = root / '.eif/audit/N-0070/R06'
manifest = json.loads((audit / 'source-manifest.json').read_text())
def fingerprint(workspace):
    return {entry['path']: hashlib.sha256((workspace / entry['path']).read_bytes()).hexdigest() for entry in manifest}
results = []
for kind, workspace in [('mixed-final', root), ('isolated-final', Path('C:/Reclaim-R06-verify-20261015'))]:
    before = fingerprint(workspace)
    start = time.monotonic()
    log = audit / ('full-' + kind + '.txt')
    with log.open('wb') as out:
        proc = subprocess.run(['cmd', '/c', 'npm test -- --reporter=verbose'], cwd=workspace / 'app', stdout=out, stderr=subprocess.STDOUT)
    after = fingerprint(workspace)
    results.append({'kind': kind, 'command': 'npm test -- --reporter=verbose', 'cwd': str(workspace / 'app'), 'exit_code': proc.returncode, 'duration_seconds': round(time.monotonic() - start, 2), 'source_stable': before == after, 'source_before': before, 'source_after': after})
    (audit / 'full-gates.json').write_text(json.dumps(results, indent=2) + '\n')
    print(kind, 'exit', proc.returncode, 'source_stable', before == after, flush=True)
