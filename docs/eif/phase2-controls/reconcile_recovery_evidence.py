"""Capture scoped reconciliation using only the public programme wrapper.

No runtime or ledger files are read by this helper. Run each phase explicitly.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json
import os
import subprocess
import sys
import re

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/eif/phase2-controls/LEASE-evidence-recovery'
RUN = 'R20261016EVIDRECOVERYA'
ENV = {**os.environ, 'EIF_RUN': RUN}

def save(name, obj):
    OUT.mkdir(exist_ok=True)
    (OUT / (name + '.json')).write_text(json.dumps(obj, indent=2) + '\n', encoding='utf-8')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def public(name, *args, allowed=(0,)):
    command = [sys.executable, '-B', 'scripts/eif_node.py', *args]
    p = subprocess.run(command, cwd=ROOT, env=ENV, capture_output=True, text=True, encoding='utf-8')
    record = dict(run=RUN, utc=dt.datetime.now(dt.timezone.utc).isoformat(),
                  command=['python', '-B', 'scripts/eif_node.py', *args],
                  exit_code=p.returncode, stdout=p.stdout, stderr=p.stderr)
    save(name, record)
    if p.returncode not in allowed:
        raise RuntimeError(f'STOP {name}: {p.stderr or p.stdout}')
    return record

def node(name, node_id):
    r = public(name, 'status', '--node', node_id)
    return json.loads('{' + r['stdout'].split('\n{', 1)[1])

def digest(data):
    return hashlib.sha256(data).hexdigest()

def preflight():
    assert git('branch', '--show-current').decode().strip() == 'fix/training-confident-ux'
    assert git('rev-list', '--max-parents=0', 'HEAD').decode().strip() == 'f61a11f0ffd30f8449d69a2f6909f5063d524fde'
    assert git('remote', 'get-url', 'origin').decode().strip().removesuffix('.git') == 'https://github.com/IoTWazPresales/Reclaim'
    paths = git('diff', '--name-only').decode().splitlines()
    protected = [p for p in paths if not p.startswith(('.eif/program/', '.eif/CURRENT', '.eif/PROGRAM', '.eif/WORK_ITEM'))]
    protected += ['docs/eif/LEDGER_PENDING.md', 'docs/eif/AWAITING_APPROVAL.md', 'docs/eif/HUMAN_CHECKS.md',
                  '.eif/PROJECT_MANIFEST.md', '.eif/AUTONOMY_POLICY.md', '.eif/ENVIRONMENT_POLICY.md']
    protected += [p.relative_to(ROOT).as_posix() for p in (ROOT / '.cursor/hooks.off').rglob('*') if p.is_file()]
    protected += ['.cursor/hooks.json.off']
    save('preservation-before', {p: digest((ROOT / p).read_bytes()) for p in protected if (ROOT / p).is_file()})
    save('identity', dict(run=RUN, head=git('rev-parse', 'HEAD').decode().strip(),
                         dirty_tracked=paths, staged=git('diff', '--cached', '--name-only').decode().splitlines()))
    assert not git('diff', '--cached', '--name-only').strip()
    public('before-verify', 'inspect', 'verify', allowed=(2,))
    health = public('before-health', 'inspect', 'health', allowed=(2,))
    assert 'integrity ok' in health['stderr'] and 'unacknowledged_gate_debt 11' in health['stderr']
    public('before-status', 'status')
    for n, rev in [('N-0068', 6), ('N-0069', 3), ('N-0070', 3), ('N-0071', 1)]:
        obj = node('before-' + n, n)
        assert obj['revision'] == rev and obj['acceptance_state'] == 'pending', n
    print('Preflight captured; expected revisions and pending acceptance confirmed.')

def leases():
    for n, rev in [('N-0068', 6), ('N-0069', 3), ('N-0070', 3)]:
        obj = node('lease-precheck-' + n, n)
        assert obj['revision'] == rev and obj['acceptance_state'] == 'pending', n
        lease = obj['lease']
        if n != 'N-0069':
            assert lease['run'] == 'R20261013P2'
            assert dt.datetime.fromisoformat(lease['expires_at'].replace('Z', '+00:00')) < dt.datetime.now(dt.timezone.utc)
            public('release-' + n, 'release', n)
            released = node('released-' + n, n)
            assert released['lease'] is None and released['revision'] == rev + 1
            rev += 1
        else:
            assert lease is None
        public('acquire-' + n, 'lease', n)
        owned = node('owned-' + n, n)
        assert owned['revision'] == rev + 1 and owned['lease']['run'] == RUN
        assert owned['acceptance_state'] == 'pending' and owned['status'] == 'in_progress'
        print(n, 'owned at revision', owned['revision'], flush=True)

def inventory():
    head = git('rev-parse', 'HEAD').decode().strip()
    remote = git('ls-remote', '--exit-code', 'origin', 'refs/heads/fix/training-confident-ux').decode().split()[0]
    git('merge-base', '--is-ancestor', head, remote)
    specs = [
        ('N-0068', 'R01', 'c4863c4', 'docs/eif/phase2-controls/R01-result.md', 'docs/eif/phase2-controls/R01-independent-review.md'),
        ('N-0069', 'R03', 'db41b34', '.eif/audit/N-0069/R03/result.md', '.eif/audit/N-0069/R03/independent-review.md'),
        ('N-0069', 'R04', 'b40fa80', '.eif/audit/N-0069/R04/result.md', '.eif/audit/N-0069/R04/independent-review.md'),
        ('N-0069', 'R05', 'dcf4bf8', '.eif/audit/N-0069/R05/result.md', '.eif/audit/N-0069/R05/independent-review.md'),
        ('N-0069', 'R05', 'dcf4bf8', '.eif/audit/N-0069/R05/recheck.md', '.eif/audit/N-0069/R05/independent-review.md'),
        ('N-0070', 'R02', 'cda17e7', '.eif/audit/N-0070/R02/fixture-and-review.md', '.eif/audit/N-0070/R02/fixture-and-review.md'),
        *[('N-0070', t, c, f'.eif/audit/N-0070/{t}/result.md', f'.eif/audit/N-0070/{t}/{r}') for t,c,r in [
            ('R06','77726c6','review-receipt.json'), ('R07','c46baa7','review.md'),
            ('R08','3de2a5b','review.md'), ('R09','df38eba','review.md')]],
    ]
    records = []
    for n,t,c,p,review in specs:
        commit = git('rev-parse', c).decode().strip()
        git('merge-base', '--is-ancestor', commit, head)
        raw = (ROOT / p).read_bytes()
        blob = git('show', f'{head}:{p}')
        assert raw and raw.replace(b'\r\n', b'\n') == blob, p
        support = [review]
        checks = []
        if t == 'R01':
            report = (ROOT / review).read_text(encoding='utf-8').lower()
            paths = ['scripts/eif_node.py', 'scripts/test_eif_recovery_controls.py', 'scripts/test_eif_node_commands.py',
                     'scripts/test_eif_node.py', 'docs/eif/phase2-controls/registry.json', 'docs/eif/phase2-controls/N0068-acceptance.txt']
            for path in paths:
                source = (ROOT / path).read_bytes()
                committed = git('show', f'{commit}:{path}')
                checks.append(dict(path=path, reviewed_sha256=digest(source), committed_sha256=digest(committed),
                                   matches=digest(source) in report and source.replace(b'\r\n',b'\n') == committed))
        elif t == 'R03':
            report = (ROOT / review).read_text(encoding='utf-8')
            for path in ['app/src/lib/training/exerciseEligibility.ts', 'app/src/lib/training/__tests__/exerciseEligibility.test.ts']:
                source = git('show', f'{commit}:{path}')
                checks.append(dict(path=path, committed_sha256=digest(source),
                                   matches=any(digest(x) in report for x in [source,source.replace(b'\n',b'\r\n')])))
        elif t != 'R02':
            manifest = f'.eif/audit/{n}/{t}/' + ('committed-source-receipt.json' if t == 'R09' else 'source-manifest.json')
            support.append(manifest)
            m = json.loads((ROOT / manifest).read_text(encoding='utf-8'))
            rows = m if isinstance(m,list) else (m.get('sources') or m.get('files'))
            if isinstance(rows,list):
                rows = {r['path']:r['sha256'] for r in rows}
            for path,h in rows.items():
                if isinstance(h,dict):
                    h = h.get('gitNormalizedSha256') or h.get('canonical_lf_sha256')
                source = git('show', f'{commit}:{path}')
                checks.append(dict(path=path, committed_sha256=digest(source), expected_sha256=h, matches=digest(source)==h))
        blocked = None
        if t == 'R02':
            blocked = 'Narrative final-diff review exists, but no exact reviewed-source fingerprint/manifest binds it to cda17e7. Do not invent a reviewed-source receipt.'
        elif t == 'R04':
            blocked = 'Reviewer balancedHypertrophy hash 81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818 conflicts with manifest reviewed-filesystem b211622fd36931d4ad7fc6661ce9e0bdf70c44171ae728e10fa6808cd7730788. All 13 committed manifest hashes match; independent exact-candidate review provenance remains unresolved.'
        assert all(x['matches'] for x in checks), t
        supporting = []
        for path in dict.fromkeys(support):
            data = (ROOT/path).read_bytes()
            committed = git('show', f'{head}:{path}')
            assert data.replace(b'\r\n',b'\n') == committed
            supporting.append(dict(path=path, working_sha256=digest(data), committed_sha256=digest(committed),
                                   exact_bytes=data==committed, canonical_lf_equal=True))
        # Restore only selected, clean evidence files to already committed bytes.
        # No report content, source, receipt, or Git object is manufactured.
        if not blocked and raw != blob:
            (ROOT / p).write_bytes(blob)
        records.append(dict(node=n, task=t, artifact=p, reviewed_commit=commit,
                            artifact_commit=head, artifact_last_commit=git('log','-1','--format=%H',head,'--',p).decode().strip(),
                            original_working_sha256=digest(raw), committed_sha256=digest(blob),
                            exact_bytes_before=raw==blob, canonical_lf_equal=True,
                            exact_bytes_for_attachment=not blocked, pushed=True,
                            source_bindings=checks, supporting_artifacts=supporting,
                            blocked=blocked, evidence_id=None))
    save('inventory', dict(run=RUN, head=head, remote_tip=remote, records=records))
    print('Inventory:', len(records), 'artifacts;', sum(not r['blocked'] for r in records), 'eligible;', sum(bool(r['blocked']) for r in records), 'blocked.')

def attach():
    inv = json.loads((OUT/'inventory.json').read_text())
    assert git('rev-parse','HEAD').decode().strip() == inv['head']
    expected = {'N-0068':8, 'N-0069':4, 'N-0070':5}
    for n,rev in expected.items():
        obj = node('attach-precheck-'+n,n)
        assert obj['revision']==rev and obj['lease']['run']==RUN and obj['acceptance_state']=='pending'
        assert dt.datetime.fromisoformat(obj['lease']['expires_at'].replace('Z','+00:00')) > dt.datetime.now(dt.timezone.utc)
    for i,r in enumerate(inv['records']):
        if r['blocked']:
            continue
        assert r['evidence_id'] is None
        assert digest((ROOT/r['artifact']).read_bytes()) == r['committed_sha256']
        note = f"{r['task']} historical scoped source evidence only; existing review and harness limitations retained. No scope acceptance, independent criterion review, Android/visible approval, science decision or completion asserted."
        if r['task']=='R01':
            note += ' Historical working-source review mapped to committed source after line-ending normalization; final committed criterion packet/review still missing.'
        if r['task']=='R07':
            note += ' Same-author source review and separate harness execution; separate-reviewer acceptance remains missing.'
        response = public('attachment-'+str(i+1), 'evidence', r['node'], '--commit', r['reviewed_commit'], '--path', r['artifact'], '--note', note)
        ids = re.findall(r'^EV-\d+$',response['stdout'],re.M)
        assert len(ids)==1, response
        r['evidence_id']=ids[0]
        save('inventory',inv)
        # Confirm replay immediately; evidence.add is programme-level and does
        # not claim a node evidence/verification field or increment its revision.
        state = node('attachment-replay-'+str(i+1),r['node'])
        assert state['revision']==expected[r['node']] and state['acceptance_state']=='pending'
        print(r['task'],r['artifact'],ids[0],flush=True)

def finish():
    inv=json.loads((OUT/'inventory.json').read_text())
    assert sum(bool(r['evidence_id']) for r in inv['records'])==8
    assert len({r['evidence_id'] for r in inv['records'] if r['evidence_id']})==8
    for n,rev in [('N-0068',8),('N-0069',4),('N-0070',5),('N-0071',1)]:
        before=json.loads('{' + json.loads((OUT/('before-'+n+'.json')).read_text())['stdout'].split('\n{',1)[1])
        after=node('after-'+n,n)
        assert after['revision']==rev
        assert {k:v for k,v in before.items() if k not in ('revision','lease')} == {k:v for k,v in after.items() if k not in ('revision','lease')}, n
        if n=='N-0071':
            assert before==after
        else:
            assert after['lease']['run']==RUN
    verify=public('after-verify','inspect','verify',allowed=(2,))
    obj=json.loads(verify['stderr'].split('\n',1)[1])
    before=json.loads(json.loads((OUT/'before-verify.json').read_text())['stderr'].split('\n',1)[1])
    assert obj['revision']==554 and obj['integrity_ok'] and not obj['integrity_issues']
    assert obj['gate_debt']==before['gate_debt'] and obj['gate_issues']==before['gate_issues']
    public('after-status','status')
    original=json.loads((OUT/'preservation-before.json').read_text())
    checks={p: digest((ROOT/p).read_bytes())==h for p,h in original.items()}
    assert all(checks.values()), checks
    assert not (ROOT/'.cursor/hooks').exists() and not (ROOT/'.cursor/hooks.json').exists()
    for r in inv['records']:
        if r['evidence_id']:
            assert (ROOT/r['artifact']).read_bytes()==git('show',f"{inv['head']}:{r['artifact']}")
    save('final-verification',dict(run=RUN,revision=obj['revision'],evidence_count=8,
                                 all_node_nonownership_fields_unchanged=True,n0071_unchanged=True,
                                 historical_gate_debts_unchanged=True,protected_paths=checks,
                                 selected_artifacts_match_committed_bytes=True,hooks_disabled=True))
    print('Final verification passed; revision 554; eight actual IDs; pending gates unchanged.')

if __name__ == '__main__':
    {'preflight': preflight, 'leases': leases, 'inventory':inventory, 'attach':attach, 'finish':finish}[sys.argv[1]]()
