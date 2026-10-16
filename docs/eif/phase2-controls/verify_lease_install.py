"""Installation-only evidence capture; never writes runtime or programme state."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/eif/phase2-controls/LEASE-verified-install'
OUT.mkdir(exist_ok=True)
os.environ['EIF_RUN'] = 'R20261016VERIFIEDINSTALL'

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def capture(label, args, cwd=ROOT):
    proc = subprocess.run(args, cwd=cwd, capture_output=True, encoding='utf-8', errors='replace')
    result = {'command': args, 'cwd': str(cwd), 'exit': proc.returncode,
              'stdout': proc.stdout, 'stderr': proc.stderr}
    (OUT / (label + '.json')).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(label, 'exit', proc.returncode, proc.stdout[-800:], proc.stderr[-500:], flush=True)
    return proc

def inventory(label):
    paths = set(subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0'))
    for base in ['.eif/runtime', '.cursor/hooks.off']:
        paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT / base).rglob('*') if p.is_file())
    for base in ['.eif', '.cursor']:
        paths.update(p.relative_to(ROOT).as_posix() for p in (ROOT / base).glob('*') if p.is_file())
    hashes = {p: digest(ROOT / p) for p in sorted(paths) if p and (ROOT / p).is_file() and not p.startswith('docs/eif/phase2-controls/LEASE-verified-install/')}
    result = {'hashes': hashes, 'active_hooks': {p: (ROOT / p).exists() for p in ['.cursor/hooks', '.cursor/hooks.json']}}
    (OUT / (label + '-inventory.json')).write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(label, len(hashes), 'hashed paths', result['active_hooks'], flush=True)

mode = sys.argv[1]
if mode == 'preflight':
    fw = Path('C:/AI/eif-disabled-hooks-repair')
    for label, args, cwd in [
        ('framework-head', ['git', 'rev-parse', 'HEAD'], fw),
        ('framework-branch', ['git', 'branch', '--show-current'], fw),
        ('framework-tracked-clean', ['git', 'diff', '--exit-code', 'a0a0270531baddc083dab0ddcbf1bbe45340b713', '--', 'tools', 'runtime', 'build/cursor'], fw),
        ('framework-lineage-repair', ['git', 'merge-base', '--is-ancestor', 'a9f39d5b10300facd7b12be73498d23ccf9a9abb', 'HEAD'], fw),
        ('framework-lineage-baseline', ['git', 'merge-base', '--is-ancestor', '9bde37921e286f9e4aa94ec3fa82685b9c350abe', 'HEAD'], fw),
        ('reclaim-head', ['git', 'rev-parse', 'HEAD'], ROOT),
        ('reclaim-branch', ['git', 'branch', '--show-current'], ROOT),
        ('reclaim-remote', ['git', 'remote', 'get-url', 'origin'], ROOT),
        ('reclaim-root', ['git', 'rev-list', '--max-parents=0', 'HEAD'], ROOT),
        ('reclaim-dirty', ['git', 'status', '--short', '--untracked-files=no'], ROOT),
        ('reclaim-index', ['git', 'diff', '--cached', '--name-only'], ROOT),
    ]:
        if capture(label, args, cwd).returncode:
            raise SystemExit('Preflight command failed')
    old = json.loads((ROOT / 'docs/eif/phase2-controls/LEASE-install-preflight.json').read_text())
    current = json.loads((OUT / 'before-inventory.json').read_text())
    runtime = {k: v for k, v in current['hashes'].items() if k.startswith('.eif/runtime/')}
    lineage = {'runtime_files': len(runtime), 'all_match_prior_verified_baseline': all(old['protected_after'].get(k) == v for k, v in runtime.items()),
               'journal': json.loads((ROOT / '.eif/upgrade-work/journal.json').read_text())}
    (OUT / 'preflight.json').write_text(json.dumps(lineage, indent=2) + '\n', encoding='utf-8')
    assert len(runtime) == 23 and lineage['all_match_prior_verified_baseline']
    assert not any(current['active_hooks'].values())
    assert lineage['journal']['phase'] == 'committed'
elif mode == 'inventory':
    inventory(sys.argv[2])
elif mode == 'tests':
    capture(sys.argv[2] + '-tests', [sys.executable, '-B', '-m', 'pytest', 'scripts/test_eif_node.py', 'scripts/test_eif_node_commands.py', 'scripts/test_eif_recovery_controls.py', '-q'])
elif mode == 'reads':
    label = sys.argv[2]
    for name, args in [('verify', ['inspect', 'verify']), ('status', ['status'])] + [(n, ['status', '--node', n]) for n in ['N-0068', 'N-0069', 'N-0070', 'N-0071']]:
        capture(label + '-' + name, [sys.executable, '-B', 'scripts/eif_node.py', *args])
elif mode == 'install':
    capture('upgrade', [sys.executable, 'tools/install_project.py', 'upgrade', str(ROOT), '--preserve-disabled-hooks'], Path('C:/AI/eif-disabled-hooks-repair'))
elif mode == 'verify-install':
    capture('installation-verification', [sys.executable, 'tools/verify_runtime_install.py', str(ROOT), '--allow-disabled-hooks'], Path('C:/AI/eif-disabled-hooks-repair'))
elif mode == 'summary':
    import yaml
    snapshot = yaml.safe_load((ROOT / '.eif/program/PROGRAM.yaml').read_text(encoding='utf-8'))
    before = json.loads((OUT / 'before-inventory.json').read_text())
    after = json.loads((OUT / 'after-inventory.json').read_text())
    changed = [k for k, v in before['hashes'].items() if after['hashes'].get(k) != v]
    protected = [k for k in before['hashes'] if k.startswith(('.eif/program/', '.cursor/hooks.off/')) or k in [
        '.cursor/hooks.json.off', '.eif/AUTONOMY_POLICY.md', '.eif/ENVIRONMENT_POLICY.md', '.eif/PROJECT_MANIFEST.md',
        '.eif/CURRENT.md', '.eif/PROGRAM.md', '.eif/WORK_ITEM.md', 'docs/eif/AWAITING_APPROVAL.md',
        'docs/eif/HUMAN_CHECKS.md', 'docs/eif/LEDGER_PENDING.md', 'scripts/eif_node.py',
        'scripts/test_eif_node.py', 'scripts/test_eif_node_commands.py', 'scripts/test_eif_recovery_controls.py']]
    assert all(k not in changed for k in protected)
    assert not any(after['active_hooks'].values())
    repeat = {}
    nodes = {}
    node_snapshot_matches = {}
    for name in ['verify', 'status', 'N-0068', 'N-0069', 'N-0070', 'N-0071']:
        first = json.loads((OUT / ('after-' + name + '.json')).read_text())
        second = json.loads((OUT / ('repeat-' + name + '.json')).read_text())
        repeat[name] = all(first[k] == second[k] for k in ['exit', 'stdout', 'stderr'])
        assert repeat[name]
        if name.startswith('N-'):
            node = json.loads('{\n' + first['stdout'].split('\n{\n', 1)[1])
            node_snapshot_matches[name] = node == snapshot['nodes'][name]
            assert node_snapshot_matches[name]
            nodes[name] = {k: node.get(k) for k in ['revision', 'status', 'lease', 'acceptance_state', 'scope_acceptance', 'evidence', 'quality', 'verification']}
    first = json.loads((OUT / 'after-verify.json').read_text())
    verify = json.loads(first['stderr'].split('failed (2):\n', 1)[1])
    assert verify['integrity_ok'] and verify['revision'] == 541
    result = {'framework_commit': 'a0a0270531baddc083dab0ddcbf1bbe45340b713', 'protected_paths_unchanged': protected,
              'changed_paths': changed, 'added_paths': [k for k in after['hashes'] if k not in before['hashes']],
              'repeat_public_reads_identical': repeat, 'nodes_match_unchanged_snapshot': node_snapshot_matches,
              'nodes': nodes, 'programme_verification': verify,
              'disabled_hooks': after['active_hooks'], 'runtime_enforcement': 'unavailable', 'capabilities': 'unverified'}
    (OUT / 'summary.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, indent=2))
elif mode == 'final-preservation':
    summary = json.loads((OUT / 'summary.json').read_text())
    before = json.loads((OUT / 'before-inventory.json').read_text())['hashes']
    after = json.loads((OUT / 'after-inventory.json').read_text())['hashes']
    dirty = json.loads((OUT / 'reclaim-dirty.json').read_text())['stdout'].splitlines()
    paths = set(summary['protected_paths_unchanged']) | {line[3:] for line in dirty}
    paths.update(k for k in after if k.startswith('.eif/runtime/'))
    paths.update(['.cursor/eif-runtime-manifest.json', '.cursor/eif-runtime-policy.json', '.eif/RUNTIME_CAPABILITIES.md'])
    result = {k: {'sha256': digest(ROOT / k), 'matches_reference': digest(ROOT / k) == (before[k] if k in summary['protected_paths_unchanged'] or k in {line[3:] for line in dirty} else after[k])} for k in sorted(paths)}
    result['active_hooks_absent'] = all(not (ROOT / k).exists() for k in ['.cursor/hooks', '.cursor/hooks.json'])
    (OUT / 'final-preservation.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    assert all(v['matches_reference'] for k, v in result.items() if isinstance(v, dict))
    assert result['active_hooks_absent']
    print('Final preservation passed:', len(paths), 'paths; active hooks absent')
