# R01 independent implementation review

Date: 2026-10-14. Reviewer session: `/root/r01_review`, separate delegated agent from executor `/root` (`R20261014R01`). Model identity exposed by this session: Codex based on GPT-6; exact model variant is not independently exposed. Same-model, fresh-context review with an explicit task brief (`fork_turns="none"`, confirmed by executor); not a different-model consultation. No external reviewer identity is claimed.

Disposition: **VERIFIED_WITH_LIMITATIONS for the local implementation; UNVERIFIED for node completion**. Working-tree implementation review and final focused test execution are recorded below; no reviewed source commit, pushed criterion packet or operator acceptance is claimed. Repository HEAD at inspection was `18d21abd86cf01433c82dcc7516bac91c677f155`, which does not identify the uncommitted implementation reviewed here.

Scope: R01/N-0068 only. Read AGENTS.md, R01 task, verification-controller SKILL.md and its contract, wrapper source, dedicated tests, registry, exact N0068 criteria and EXECUTION.md. No EIF runtime implementation or shared framework was read or edited. Public wrapper smoke tests invoke its documented status/dry-run interfaces. The reviewer added adversarial tests after executor request; implementation fixes were made by the executor.

## Reviewed input SHA-256

| Input | SHA-256 |
|---|---|
| scripts/eif_node.py | 15A143BC8FB58EE710A8788336C9FA6237D050E66F723EF53CD52A43DF20DBFF |
| scripts/test_eif_recovery_controls.py | ACB49626F9CDD1FF286575F3465910CF95E1D3C47818D43DA489C6EAC70A1CEB |
| scripts/test_eif_node_commands.py | 66CF90C4188022615AD85774456CD1B8DF3B91C80EABE95863582CBF963CE4BC |
| scripts/test_eif_node.py | 4C1C2D79803BE2FD6669717084704B2542E86D0668D2CC6BDBDEB5131CD85345 |
| docs/eif/phase2-controls/registry.json | D923E53CAB51DE6F77C5AA7EC950D5B3EC64B2F1C84619DE68B242DAA0F06F92 |
| docs/eif/phase2-controls/N0068-acceptance.txt | 914AEC7545540CF449A5F9FD680231C6BC63E9EFA9B92987F40F2068D9E431C1 |

## Findings and challenges

1. Initial implementation accepted an untracked `scripts/unreviewed.py` under declared source directory `scripts`. Independently reproduced in a temporary repository with bare remote: completion returned all satisfied. Executor added an untracked-source check; reviewer added regression coverage.
2. Initial implementation accepted replacement committed waiver approver/statement without another review, because the packet bound only the receipt path. Independently reproduced: completion still returned C1 waived. Executor changed waiver/visible approval references to hashed artifacts; reviewer added replacement-waiver regression coverage.
3. Source review identified that the review report itself could serve as criterion evidence. Executor added structural circular-reference rejection for packet/reviewer receipt/report paths; reviewer added a negative test.
4. Pending scope must fail the read-only completion check as well as mutation. Executor added the guard; reviewer added coverage.
5. Code inspection found a waiver with string `waived_ids="C10"` could cover C1 through substring membership. Executor now requires a nonempty unique list of nonempty string IDs; reviewer added a regression and re-executed the waiver cases on the final source.

Additional negative cases cover weakened or stale criteria, missing criterion/journey/evidence, same-session reviewer, stale reviewed source, changed evidence bytes, unpushed packet, altered outcomes, blanket journey NA, fake approval schema, raw event/patch bypass and protected artifact paths. Positive fixtures exercise separate review, committed scope acceptance and explicit criterion waiver with preserved disposition.

## Commands and actual results

- `python -m pytest scripts/test_eif_recovery_controls.py scripts/test_eif_node_commands.py -q`: initial implementation run, **38 passed in 171.54s**. This baseline predates the added regressions and is not final validation.
- `python -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py scripts/test_eif_recovery_controls.py -q`: **56 passed in 246.66s**, exit 0; raw output is `docs/eif/phase2-controls/R01-python-tests.txt`.
- `python -m pytest scripts/test_eif_recovery_controls.py -q -k waiver`: **3 passed, 40 deselected in 43.18s**, targeted re-execution after the final waiver ID validation change; output is `docs/eif/phase2-controls/R01-waiver-tests.txt`. This delta run binds the final source/test hashes above; the combined run loaded the preceding source hash `F78216AE545140EFF6E97475805C434151BE0C8CC3EDCF8EBCF6D97AAD803ED9` and test hash `12E02809934D63D1AEF01B453180F912201346C434796431050865F452E39DA7`.
- `git diff --check -- scripts/eif_node.py scripts/test_eif_recovery_controls.py docs/eif/phase2-controls`: exit 0; Git emitted its LF-to-CRLF advisory for the tracked wrapper. This does not validate untracked file contents.
- Independent adversarial Python fixture script used real temporary Git repositories and bare remotes, without ledger mutations. Initial outputs: `UNTRACKED_SOURCE {'C1': 'satisfied', 'C2': 'satisfied', 'plan-strength': 'satisfied'}` and `REPLACED_WAIVER {'C1': 'waived', 'C2': 'satisfied', 'plan-strength': 'satisfied'}`.

## Limits and completion blockers

Receipt validation checks schema, hashes, scope and consistency; it cannot authenticate the named human, prove the named reviewer actually did the review, or establish semantic truth from arbitrary prose. Structural circular-reference checks do not detect all semantic circularity. Direct runtime invocations and modification of wrapper code remain outside the wrapper's enforcement boundary.

The test fixture validates public wrapper functions against real Git history/remotes, with a mocked ledger for mutating commands; it does not prove every raw runtime event alias. Public runtime smoke coverage is limited to status and dry-run commands. No actual completion or acceptance mutation was attempted by the reviewer.

This is an implementation review of hash-bound working-tree inputs. A final committed source/criterion packet review, pushed evidence and any required operator approval remain outstanding. Executor reports the required repository typecheck fails in existing unrelated `TrainingSetupScreen.tsx:939` (`estimate1RM`); this reviewer did not independently re-execute that application gate. These facts prevent treating the node as complete even if the focused wrapper suite passes.

The draft `R01-criterion-packet.json` was separately inspected. A Python assertion check confirmed its criterion digest and text exactly match N0068-acceptance.txt, all four completion dispositions are `unverified`, and `reviewed_commit` is null. Its tooling-only empty journey mapping matches the registry; no journey waiver is implied. This is an honest working evidence summary, not a valid completion packet. Its result-document hash is refreshed by the executor as that document changes; no final committed packet/hash validation is claimed here, and the report deliberately does not create a circular packet hash dependency.

After the executor's final document refresh, an independent Python SHA-256 check passed for all six working packet artifact references (two source artifacts and four criterion evidence references). This proves current working bytes only, not committed or pushed availability.
