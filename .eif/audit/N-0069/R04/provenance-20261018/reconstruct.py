"""One-time R04 provenance reconstruction; no application or ledger writes."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import subprocess

ROOT = Path('C:/Reclaim')
CHECKOUT = Path('C:/Reclaim-R04-provenance-20261018')
OUT = ROOT / '.eif/audit/N-0069/R04/provenance-20261018'
COMMIT = 'b40fa80f32a2b035f830d3e563055b93c083137a'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def save(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    assert git('branch', '--show-current').decode().strip() == 'fix/training-confident-ux'
    assert not git('diff', '--cached', '--name-only').strip()
    manifest_path = '.eif/audit/N-0069/R04/source-manifest.json'
    manifest = json.loads(git('show', COMMIT + ':' + manifest_path))
    records = []
    for path, expected in manifest['sources'].items():
        data = git('show', COMMIT + ':' + path)
        assert sha(data) == expected, path
        # Explicitly reconstruct exact Git bytes, independent of core.autocrlf.
        (CHECKOUT / path).write_bytes(data)
        crlf = data.replace(b'\n', b'\r\n')
        assert sha(crlf) == manifest['reviewedFilesystemHashes'][path], path
        records.append(dict(path=path, git_blob=git('rev-parse', COMMIT + ':' + path).decode().strip(),
                            sha256=sha(data), bytes=len(data), crlf_sha256=sha(crlf),
                            manifest_match=True, filesystem_manifest_reproduced=True))
    path = 'app/src/lib/training/balancedHypertrophy.ts'
    data = (CHECKOUT / path).read_bytes()
    reviewed = data.replace(b'\n', b'\r\n') + b'\r\n'
    old = '81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818'
    assert sha(reviewed) == old
    assert reviewed.replace(b'\r\n', b'\n') == data + b'\n'
    whitespace_script = ROOT / '.eif/audit/N-0069/R04/whitespace.py'
    original_receipts = ['.eif/audit/N-0069/R04/' + name for name in
                         ['independent-review.md', 'result.md', 'source-manifest.json']]
    dirty = git('diff', '--name-only').decode().splitlines()
    protected = [p for p in dirty if not p.startswith(('.eif/program/', '.eif/CURRENT', '.eif/PROGRAM', '.eif/WORK_ITEM'))]
    protected += original_receipts + ['docs/eif/LEDGER_PENDING.md', 'docs/eif/AWAITING_APPROVAL.md',
        'docs/eif/HUMAN_CHECKS.md', 'docs/training/ROUTINE_AUDIT.md', 'docs/training/RUNNING_DESIGN.md',
        '.cursor/hooks.json.off']
    save('preservation-before.json', {p: sha((ROOT/p).read_bytes()) for p in protected if (ROOT/p).is_file()})
    save('reconstruction.json', dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(), commit=COMMIT,
        parent=git('rev-parse', COMMIT + '^').decode().strip(), checkout=str(CHECKOUT),
        branch=git('branch', '--show-current').decode().strip(), head=git('rev-parse', 'HEAD').decode().strip(),
        remote_observation=git('ls-remote', 'origin', 'refs/heads/fix/training-confident-ux').decode().strip(),
        files=records, mismatch=dict(path=path, historical_review_sha256=old,
            reproduced_review_sha256=sha(reviewed), committed_sha256=sha(data),
            review_bytes=len(reviewed), committed_bytes=len(data),
            lf_normalized_review_sha256=sha(reviewed.replace(b'\r\n', b'\n')),
            lf_normalized_exact_equal=False, lf_normalized_difference='one extra trailing LF in historical reviewed bytes',
            trailing_whitespace_normalized_equal=reviewed.replace(b'\r\n', b'\n').rstrip() == data.rstrip(),
            reconstruction='committed LF bytes -> CRLF -> append one CRLF',
            historical_helper_path=str(whitespace_script.relative_to(ROOT)),
            historical_helper_sha256=sha(whitespace_script.read_bytes()),
            limitation='The fingerprint is exactly reproduced, not a recovered immutable historical source file. The surviving whitespace.py independently documents rstrip()+one newline on both old trees; no execution timestamp is inferred.'),
        original_receipts={p: sha((ROOT/p).read_bytes()) for p in original_receipts}))
    print('13 exact source blobs reconstructed; all manifest pairs match; historical fingerprint reproduced.')
