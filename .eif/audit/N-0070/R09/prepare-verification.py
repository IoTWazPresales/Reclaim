"""Export committed app/docs/scripts plus only the R09 source overlay; no runtime access."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

root = Path('C:/Reclaim')
target = root / '.tmp/R09-verify'
target.mkdir(parents=True, exist_ok=True)
paths = [
    'app/src/lib/api.ts',
    'app/src/lib/training/buildProgramDaySession.ts',
    'app/src/lib/training/programPlanner.ts',
    'app/src/lib/training/preview/index.ts',
    'app/src/lib/training/preview/__tests__/setupContract.test.ts',
    'app/src/lib/training/programmeProjection.ts',
    'app/src/lib/training/programmeWeekProposal.ts',
    'app/src/lib/training/__tests__/programmePersistence.integration.test.ts',
    'app/src/screens/TrainingScreen.tsx',
    'app/src/screens/training/TrainingSetupScreen.tsx',
]
baseline = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
archive = subprocess.check_output(['git', 'archive', baseline, 'app', 'docs', 'scripts', 'AGENTS.md', 'CONTEXT.md'], cwd=root)
with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
    bundle.extractall(target, filter='data')
hashes = {}
for name in paths:
    data = (root / name).read_bytes()
    (target / name).parent.mkdir(parents=True, exist_ok=True)
    (target / name).write_bytes(data)
    hashes[name] = hashlib.sha256(data).hexdigest()
manifest = {'baseline': baseline, 'checkout': str(target), 'files': hashes}
(root / '.eif/audit/N-0070/R09/source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'baseline': baseline, 'source_files': len(paths), 'checkout': str(target)}))
