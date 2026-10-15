"""Attempt only authorized evidence attachment through the public wrapper."""
from pathlib import Path
import json
import os
import subprocess
import sys

root = Path(__file__).resolve().parents[4]
commit = 'dcf4bf87b6d587f99451d88d3e58fbea68f6913a'
branch = 'fix/training-confident-ux'
remote = subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/' + branch], cwd=root, text=True).split()[0]
assert remote == commit, (remote, commit)
args = [sys.executable, 'scripts/eif_node.py', '--run', 'R20261015R05',
        'evidence', 'N-0069', '--commit', commit,
        '--path', '.eif/audit/N-0069/R05/result.md',
        '--note', 'R05 scoped independent validator source checkpoint: 91 focused plus 49 contract tests; independent 17+9 probes; isolated and mixed full suites retain four established failures each. Not N-0069 acceptance.']
environment = dict(os.environ, EIF_RUN='R20261015R05')
result = subprocess.run(args, cwd=root, env=environment, capture_output=True, text=True, encoding='utf-8')
receipt = dict(sourceCommit=commit, sourceRemoteVerified=True, branch=branch,
               run='R20261015R05', command=args[1:], exitCode=result.returncode,
               stdout=result.stdout, stderr=result.stderr, evidenceId=None,
               nodeAccepted=False, nodeCompleted=False, leaseTransitionAttempted=False)
(root / '.eif/audit/N-0069/R05/evidence-attachment.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print('Public evidence attachment exit:', result.returncode)
print(result.stdout.strip())
print(result.stderr.strip())
