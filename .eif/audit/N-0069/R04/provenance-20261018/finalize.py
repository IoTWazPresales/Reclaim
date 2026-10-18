"""Record bounded verification and durability without changing application code."""
from pathlib import Path
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys

ROOT = Path('C:/Reclaim')
OUT = Path(__file__).resolve().parent
SOURCE = 'b40fa80f32a2b035f830d3e563055b93c083137a'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def save(name, value):
    (OUT/name).write_text(json.dumps(value, indent=2)+'\n', encoding='utf-8')

def preserved():
    before = json.loads((OUT/'preservation-before.json').read_text())
    after = {p: sha((ROOT/p).read_bytes()) for p in before}
    assert before == after, 'STOP: preserved file changed'
    reviewer = json.loads((OUT/'reviewer-blobs.json').read_text())
    reconstructed = json.loads((OUT/'reconstruction.json').read_text())
    assert len(reviewer['files']) == len(reconstructed['files']) == 13
    for record in reviewer['files']:
        payload = git('show', SOURCE+':'+record['path'])
        assert sha(payload) == record['sha256GitBlobBytes']
        assert (Path(reconstructed['checkout'])/record['path']).read_bytes() == payload
    original = (ROOT/'.eif/audit/N-0069/R04/independent-review.md').read_text(encoding='utf-8')
    rows = re.findall(r'\| `([^`]+)` \| `([0-9a-f]{64})` \|', original)
    manifest = json.loads(git('show', SOURCE+':.eif/audit/N-0069/R04/source-manifest.json'))
    compared = []
    for short, historical in rows:
        path = 'app/src/lib/training/'+short
        equal = historical == manifest['reviewedFilesystemHashes'][path]
        assert equal or short == 'balancedHypertrophy.ts'
        compared.append(dict(path=path, historical_review_sha256=historical,
                             final_filesystem_sha256=manifest['reviewedFilesystemHashes'][path], equal=equal))
    assert len(compared) == 11 and sum(row['equal'] for row in compared) == 10
    save('historical-comparison.json', dict(compared=compared,
        absent_from_historical_hash_table=sorted(set(manifest['sources'])-{r['path'] for r in compared}),
        all_13_now_covered_by_fresh_review=True))
    save('preservation-after.json', dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(),
        unchanged=after, original_receipts_preserved=True, reviewer_blobs_independently_rechecked=13))

if __name__ == '__main__':
    preserved()
    if sys.argv[1] == 'publish-ready':
        full = (OUT/'full-vitest.txt').read_text(encoding='utf-8')
        assert '1138 passed' in full and '4 failed' in full, 'STOP: full suite differs from documented baseline'
        checks = [dict(command='npx vitest run src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts '
                       'src/lib/training/__tests__/balancedHypertrophy.test.ts '
                       'src/lib/training/__tests__/exerciseEligibility.test.ts '
                       'src/lib/training/__tests__/buildProgramDaySession.test.ts '
                       'src/lib/training/preview/__tests__/setupContract.test.ts '
                       'src/lib/training/preview/__tests__/preview.test.ts '
                       'src/lib/training/__tests__/smallMuscleVolume.test.ts --reporter=verbose',
                       exit_code=0, result='83 passed, 7 files, 17.16s', log='focused.txt'),
                  dict(command='npm run typecheck', exit_code=0, result='0 errors', log='typecheck.txt'),
                  dict(command='npm run audit:training-dual-paths (Git Bash)', exit_code=0,
                       result='31 passed, 0 failed', log='dual-path.txt'),
                  dict(command='python -B -m pytest scripts/test_eif_node_commands.py -q',
                       exit_code=0, result='11 passed in 0.66s'),
                  dict(command='npm test -- --reporter=verbose', exit_code=1,
                       result='1138 passed, 4 known baseline failures', log='full-vitest.txt')]
        for check in checks:
            if 'log' in check:
                check['log_sha256'] = sha((OUT/check['log']).read_bytes())
        save('verification.json', dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(),
            source_commit=SOURCE, independent_executor='primary agent; not original implementer or fresh source reviewer',
            checkout='C:/Reclaim-R04-provenance-20261018',
            dependency_limitation='Junction to existing C:/Reclaim/app/node_modules, no dependency reinstall', checks=checks))
        result = OUT/'result.md'
        text = result.read_text(encoding='utf-8').replace(
            '- Full committed-checkpoint suite: final result recorded before publication below.',
            '- `npm test -- --reporter=verbose`: **1138 passed / 4 failed**, exit 1; '
            '[full-vitest.txt](full-vitest.txt). These are the same four documented '
            'committed-baseline assertions: routineVolumeMeasurement seed count (31 versus 18), '
            'runSession migration link (uuid versus expected text), and weeklyVolumeModel '
            'caps (15 versus 10; 6 versus 2). No new failure was observed. '
            'This remains a failing full suite, with no waiver. '
            'Command results and log hashes: [verification.json](verification.json).')
        result.write_text(text, encoding='utf-8')
        progress = ROOT/'docs/eif/PROGRESS.md'
        text = progress.read_text(encoding='utf-8')
        pointer = ('- **R04 provenance checkpoint, 2026-10-18:** Exact b40fa80 reconstructed; all 13 '
            'source/manifest pairs match. Old balanced fingerprint reproduces as CRLF plus one trailing '
            'blank line. Fresh-context separate reviewer found no substantive scoped defect; 109 positions '
            'match accepted policy. Independent focused 83 pass, types clean, dual-path 31 pass; full '
            '1138 pass / same four baseline failures. Fresh R20261018R04PROVENANCE publicly recovered '
            'expired N-0069 lease (revision 6). Supplemental evidence publication/registration follows; '
            'actual ID must come from wrapper receipt. Original evidence preserved, acceptance pending. '
            'See `.eif/audit/N-0069/R04/provenance-20261018/result.md`. Stop after R04; no R02/R12.\n\n')
        assert '**R04 provenance checkpoint, 2026-10-18:**' not in text
        text = text.replace('## Resume pointer\n\n', '## Resume pointer\n\n'+pointer, 1)
        old = next(line for line in text.splitlines() if line.startswith('| N-0069 |'))
        new = ('| N-0069 | Weekly training decision compiler and validator | in_progress; revision 6; acceptance pending | '
            'R03 EV-0060; R05 EV-0061/0062; R04 fresh review published, registration follows | '
            '../../.eif/audit/N-0069/R04/provenance-20261018/result.md | '
            'R04 provenance resolved by fresh review; policy, failing full harness and criterion acceptance outstanding |')
        progress.write_text(text.replace(old, new), encoding='utf-8')
        context = ROOT/'CONTEXT.md'
        previous = context.read_bytes()
        addition = ('## 2026-10-18 - R04 review provenance checkpoint\n\n'
            'Exact b40fa80 source reconstructed in a new detached checkout: all 13 manifest pairs match. '
            'The historical balancedHypertrophy fingerprint is exactly reproduced by CRLF plus one '
            'trailing blank line. A fresh-context separate reviewer bound all 13 final Git blobs and '
            'found no substantive scoped defect; scientific decisions remain pending. Focused 83, types '
            'and dual31 pass; full1138 pass / same4 baseline failures. Public fresh-run recovery of '
            'expired N-0069 lease succeeded at revision6; supplemental evidence registration follows '
            'pushed publication. Original evidence and unrelated work retained. No node acceptance or '
            'completion, R02, application change, live data or R12. Receipt: '
            '.eif/audit/N-0069/R04/provenance-20261018/result.md. Stop after R04.\n\n')
        context.write_bytes(addition.encode('utf-8')+previous)
        print('Publication receipts and resume pointer prepared; original bytes preserved.')
    elif sys.argv[1] == 'verify':
        print('Preservation and 13 reviewer blob identities verified.')
    elif sys.argv[1] == 'registered':
        attachment = json.loads((OUT/'evidence-attachment.json').read_text())
        assert attachment['exit_code'] == 0
        ids = re.findall(r'^EV-\d+$', attachment['stdout'], flags=re.M)
        assert len(ids) == 1
        evidence_id = ids[0]
        precheck = json.loads((OUT/'attachment-precheck.json').read_text())
        replay = json.loads((OUT/'attachment-replay.json').read_text())
        assert precheck['exit_code'] == replay['exit_code'] == 0
        parse = lambda item: json.loads('{'+item['stdout'].split('\n{', 1)[1])
        assert parse(precheck) == parse(replay)
        anchor = git('rev-parse', 'HEAD').decode().strip()
        assert git('ls-remote', 'origin', 'refs/heads/fix/training-confident-ux').decode().split()[0] == anchor
        artifact = '.eif/audit/N-0069/R04/provenance-20261018/result.md'
        payload = (ROOT/artifact).read_bytes()
        assert git('show', anchor+':'+artifact) == payload
        save('publication.json', dict(utc=dt.datetime.now(dt.timezone.utc).isoformat(),
            reviewed_source_commit=SOURCE, published_evidence_commit=anchor,
            remote_confirmed=True, artifact=artifact, artifact_sha256=sha(payload),
            evidence_id=evidence_id, registration_exit_code=0, public_replay_exit_code=0,
            node_unchanged_by_registration=True, node_revision=parse(replay)['revision'],
            acceptance_state=parse(replay)['acceptance_state'], node_status=parse(replay)['status'],
            limitation='Programme-level evidence.add; not criterion evidence satisfaction, node acceptance or completion'))
        progress = ROOT/'docs/eif/PROGRESS.md'
        text = progress.read_text(encoding='utf-8').replace(
            'Supplemental evidence publication/registration follows; actual ID must come from wrapper receipt.',
            f'Supplemental evidence pushed at {anchor}; canonical wrapper registered {evidence_id}, followed by successful public replay.')
        text = text.replace('R04 fresh review published, registration follows', f'R04 {evidence_id} (fresh source review/provenance)')
        progress.write_text(text, encoding='utf-8')
        context = ROOT/'CONTEXT.md'
        previous = context.read_bytes()
        addition = (f'## 2026-10-18 - R04 supplemental evidence registered\n\n'
            f'Published evidence {anchor}; canonical wrapper issued {evidence_id} for source '
            f'{SOURCE}. Successful public replay confirms N-0069 revision6, in_progress, acceptance '
            'pending and no node-field changes from evidence registration. Publication receipt: '
            '.eif/audit/N-0069/R04/provenance-20261018/publication.json. No node acceptance '
            'or completion; original evidence and unrelated work preserved. Stop after R04.\n\n')
        context.write_bytes(addition.encode('utf-8')+previous)
        print(f'{evidence_id}: successful wrapper registration and replay; publication receipt recorded.')
    else:
        raise RuntimeError('Choose publish-ready, verify or registered')
