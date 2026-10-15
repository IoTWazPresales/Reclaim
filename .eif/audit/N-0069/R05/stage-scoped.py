"""Explicit R05 paths only. No broad staging or ledger mutations."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[4]
paths = [
    'app/src/lib/training/weeklyProgrammeValidator.ts',
    'app/src/lib/training/__tests__/weeklyProgrammeValidator.test.ts',
    'docs/training/recovery/R05-validator-contract.md',
    'docs/training/recovery/WORKBOARD.md',
    'docs/eif/PROGRESS.md',
    'CONTEXT.md',
]
evidence = [
    'result.md', 'source-manifest.json', 'verification.json', 'outcomes.json.gz',
    'independent-review.md', 'model-review.md',
    'reviewer-adversarial.ts', 'reviewer-adversarial-latest.txt',
    'reviewer-adversarial.txt', 'reviewer-focused.txt',
    'model-independent-probes.ts', 'model-probes-legacy-final.txt',
    'model-probes-final.txt', 'model-probes-only.txt',
    'model-probes-revised.txt', 'model-probes-revised-retry.txt',
    'model-focused-revised.txt', 'model-focused-revised-retry.txt',
    'isolated-focused-final.txt', 'isolated-r04-final.txt',
    'isolated-typecheck-final.txt', 'typecheck-final.txt',
    'isolated-full-final.txt', 'full-vitest-final.txt',
    'isolated-dual-path-final.txt', 'dual-path-final.txt',
    'catalogue-final.txt', 'wrapper-final.txt', 'eif-status-final.txt',
    'package-evidence.py', 'finalize-evidence.py', 'stage-scoped.py',
    'verify-staged.py', 'scoped-paths.txt',
]
paths.extend('.eif/audit/N-0069/R05/' + name for name in evidence)
(root / '.eif/audit/N-0069/R05/scoped-paths.txt').write_text('\n'.join(paths) + '\n', encoding='utf-8')
subprocess.run(['git', 'add', '--', *paths], cwd=root, check=True)
print('Explicitly staged', len(paths), 'R05 paths.')
