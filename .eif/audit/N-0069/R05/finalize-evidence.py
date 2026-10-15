from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[4]
audit = root / '.eif/audit/N-0069/R05'

def receipt(command, cwd, log, exit_code, **result):
    raw = (audit / log).read_bytes()
    # Text logs normalize to LF in Git; PowerShell UTF-16 audit logs are binary.
    normalized = raw if b'\0' in raw else raw.replace(b'\r\n', b'\n')
    return dict(command=command, cwd=cwd, log=log, exitCode=exit_code,
                logWorkspaceSha256=hashlib.sha256(raw).hexdigest(),
                logGitNormalizedSha256=hashlib.sha256(normalized).hexdigest(), **result)

receipts = [
    receipt('npx vitest run src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/weeklyProgramme.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts --reporter=verbose',
            'C:/Reclaim-R05-verify-20261014/app', 'isolated-focused-final.txt', 0, passed=119, failed=0, files=2,
            note='91 R05 plus 28 R03. Obsolete weeklyProgramme.test.ts selector matches no file; R04 run separately.'),
    receipt('npx vitest run src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts --reporter=verbose',
            'C:/Reclaim-R05-verify-20261014/app', 'isolated-r04-final.txt', 0, passed=21, failed=0, files=1),
    receipt('npm run typecheck', 'C:/Reclaim-R05-verify-20261014/app', 'isolated-typecheck-final.txt', 0),
    receipt('npm run typecheck', 'C:/Reclaim/app', 'typecheck-final.txt', 0),
    receipt('npm test -- --reporter=verbose', 'C:/Reclaim-R05-verify-20261014/app', 'isolated-full-final.txt', 1,
            passed=1229, failed=4, files=188, durationSeconds=467.52,
            classification='Exactly four committed-baseline failures documented by R04; no new scoped regression.'),
    receipt('npm test -- --reporter=verbose', 'C:/Reclaim/app', 'full-vitest-final.txt', 1,
            passed=1234, failed=4, files=189, durationSeconds=223.53,
            classification='Same four existing mixed-worktree failures documented by R04; no new scoped regression.'),
    receipt('Git Bash: npm run audit:training-dual-paths', 'C:/Reclaim-R05-verify-20261014/app', 'isolated-dual-path-final.txt', 0, passed=31, failed=0),
    receipt('Git Bash: npm run audit:training-dual-paths', 'C:/Reclaim/app', 'dual-path-final.txt', 0, passed=31, failed=0),
    receipt('npm run med-catalog-qa', 'C:/Reclaim/app', 'catalogue-final.txt', 0, rows=357, governanceIssues=0),
    receipt('python -m pytest scripts/test_eif_node.py -q', 'C:/Reclaim', 'wrapper-final.txt', 1,
            passed=1, failed=2, classification='Established LEASE_NOT_OWNER replay blocker, separate from R05 source correctness.'),
    receipt('EIF_RUN=R20261015R05 python scripts/eif_node.py status --node N-0069', 'C:/Reclaim', 'eif-status-final.txt', 2,
            classification='LEASE_NOT_OWNER: R20261014R03; no transition attempted.'),
    receipt('npx vitest run src/lib/training/__tests__/r05-independent-probe.test.ts --reporter=verbose',
            'C:/Reclaim-R05-verify-20261014/app', 'model-probes-legacy-final.txt', 0, passed=9, failed=0,
            independence='Separate fresh-context agent, gpt-6-astra selected through collaboration tool.'),
    receipt('node reviewer-adversarial.cjs (esbuild of reviewer-adversarial.ts)',
            'C:/Reclaim', 'reviewer-adversarial-latest.txt', 0, passed=17, failed=0,
            independence='Separate fresh-context agent, same model; independent mutation selection on literal fixture.'),
]
verification = dict(task='R05 only', baselineCommit='37118f59da8692875bb4c881cd9994697d91c60d',
                    testTimeout=30000, finalPool='threads', finalRunsSequential=True,
                    repositorySuiteGreen=False, nodeAccepted=False, receipts=receipts)
(audit / 'verification.json').write_text(json.dumps(verification, indent=2) + '\n', encoding='utf-8')

progress = root / 'docs/eif/PROGRESS.md'
s = progress.read_text(encoding='utf-8')
s = s.replace('Final mixed/catalogue receipt is in', 'Final mixed suite: 1234 passed / the same 4 existing failures; catalogue 357/0. Full receipt is in')
s = s.replace('Source checkpoint pending final checks; no EIF acceptance.', 'Scoped source/evidence checkpoint (this commit); no EIF acceptance.')
s = s.replace('R05 checkpoint pending final checks; 4 isolated baseline failures', 'R05 scoped source/evidence checkpoint (this commit); 4 baseline failures')
progress.write_text(s, encoding='utf-8')
workboard = root / 'docs/training/recovery/WORKBOARD.md'
s = workboard.read_text(encoding='utf-8').replace('checkpoint pending final checks, EIF acceptance blocked', 'scoped checkpoint with baseline failures, EIF acceptance blocked')
workboard.write_text(s, encoding='utf-8')
context = root / 'CONTEXT.md'
s = context.read_text(encoding='utf-8').replace('baseline failures. Final mixed results and source receipt are in', 'baseline failures. Mixed full suite: 1234 passes / 4 existing failures; catalogue\nQA: 357 rows, zero issues. Final source receipt is in', 1)
context.write_text(s, encoding='utf-8')
print('Final receipts and durable resume pointers written.')
