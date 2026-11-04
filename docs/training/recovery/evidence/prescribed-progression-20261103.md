# Prescription progression correction — 2026-11-03

Baseline: `06dcbe9dfe250f17824234ac438f5fb1c498b8e3`, branch `fix/training-confident-ux`.
Operator approved the proposed contract and then authorized implementation with **no dual workflows**. The broader unfinished-node mandate remains overridden. No live database access, account sessions, schema changes, deployment or OTA are part of this correction.

## Contract and authority

The approved contract is recorded at the top of [ROUTINE_AUDIT.md](../../ROUTINE_AUDIT.md) and in [DECISIONS_PENDING.md](../../../eif/phase2-controls/DECISIONS_PENDING.md). It is a product policy correction, not scientific validation of an RPE-adjusted Epley estimate.

`buildFourWeekPlan` remains the only plan writer. `buildProgramDaySession` remains the product session-build entry. `deriveProgressionDecision` and `decideDoubleProgression` now reside together in `progression.ts`, with the existing engine exports preserved. The engine's `suggestPrescription` resolves the one reps/load pair; the numeric `suggestLoading` compatibility API delegates to it. Calibration is only the fallback when the prescription decision has insufficient evidence. Builders and replacements consume that pair. No completion, notification, watch, FGS, running or scheduler path was introduced or changed.

Canonical `training_session_items.performed.sets` history retains original planned targets, loads, context and adjustment presence. The existing API query reads the existing adjustment JSON alongside planned/performed JSON. New planned JSON records its progression policy/range; no migration is needed. History that lacks targets cannot establish earned progression. Unknown range/context repeats once before the current comparison can apply. The first complete confirmed external load establishes a repeat prescription without immediate advancement.

One success below the maximum advances reps; success at the maximum advances the existing equipment step and resets reps to the range minimum. Two comparable unsuccessful attempts without improved reps/effort retain the existing equipment-rounded deload and reset reps. Partial, skipped, unfinished, mixed or adjusted work is a barrier. Explicit newer baseline precedence remains, including ties, invalid dates and cleared timestamps. A history-derived formula cannot undo a qualifying prescription decision.

The weekly validator consumes trusted profile/history inputs and shared pure policy, not builder output or explanation text as evidence. It checks delivered reps and weight against the decision and retains its independent structural, eligibility, set-volume and calibration checks. Original allocation reps remain the initial target; they no longer veto earned rep advancement. No split, exercise identity, set budget, rest or running-policy changes are made.

## Integration and regression evidence

`prescribedProgression.test.ts` runs both goal mixes through the real planner, weekly projection/validation, materialization and canonical history projection for 14 successive sessions each, crossing two weight increases. Every performed set follows the delivered target at RPE 8. It asserts allocation immutability, repeated-preview stability, unchanged set count, both weekly lateral-raise exposures, and preservation of started/guided snapshots.

| Seed and goals | New prescriptions, each completed as displayed |
| --- | --- |
| 3×12 at 12 kg; .46/.46/.08/0; range 9–16 | 13@12 → 14@12 → 15@12 → 16@12 → 9@13 → 10@13 → 11@13 → 12@13 → 13@13 → 14@13 → 15@13 → 16@13 → 9@14 → 10@14 |
| 3×13 at 12 kg; .4/.4/.1/.1; range 10–17 | 14@12 → 15@12 → 16@12 → 17@12 → 10@13 → 11@13 → 12@13 → 13@13 → 14@13 → 15@13 → 16@13 → 17@13 → 10@14 → 11@14 |

Loads above are per dumbbell, all rows retain three working sets. Controls cover target misses, effort difficulty/improvement, incomplete barriers, missing/mixed RPE, baseline precedence, changed/unknown range, changed set counts, missing targets, calibration, replacement evidence, JSON key ordering and inconsistent last/recent evidence. Additional validator tests reject unexplained decreases/increases and wrong rep targets despite forged explanation text. API tests prove frozen target/adjustment transport using mocks, without database access.

Older tests that expressly expected the superseded cap or progression from numeric-only history were corrected. Explicit v1 replay tests retain their old behaviour. The legacy numeric-history fixtures remain separate from fixtures with explicit prescribed targets; tests do not fabricate evidence silently for old records.

Final checks on the scoped source:

- Full `npm test -- --reporter=verbose`: **209 files / 1,549 tests passed**, zero failures, 322.89 seconds.
- Focused final canonical-history/prescription/validator/four-week tests: **188 passed** across five files.
- `npm run typecheck`: zero errors.
- `npm run audit:training-dual-paths` from Git Bash: **31 passed / 0 failed**.
- `npm run med-catalog-qa`: **357 catalogue rows / 0 governance issues**.
- `python -m pytest scripts/test_eif_node.py -q`: **3 passed**.
- Scoped `git diff --check`: passed.

The final planner, session wrapper, set-completion authority, session work authority and offline-sync files are byte-identical to their pre-investigation hashes. The full-suite volume report has been restored byte-for-byte to its pre-run contents.

Local verification log SHA256 values (raw logs stay outside the repository):

- `full-vitest-final.txt`: `720759f8e6ddf8f6320d32138f66cd2a661c2bee4c0171383eaabe1ec86da4ee`
- `focused-final.txt`: `c7b92645288ef266b1f6729d510fd8768fad6e5f8994ec38f75ddde66b7dda8d`
- `typecheck-final.txt`: `cd35ebdba9e12b61678eec835bf92424979bd88f78501689ba82b1dffbf391cc`

 The first full pass attempt covered 209 files with 1,547 passing tests and one obsolete direct-deload fixture failure; the fixture was corrected to supply explicit frozen targets, and the final full suite was rerun. The generic explanation path also now receives its actual set count, avoiding an explanation of progression when the future amount of work differs.

## Runtime and acceptance limits

This is source and automated integration evidence. No new Android/web runtime build was launched or installed, no real account was read or written, and no new screenshots were captured. Author review does not constitute independent review or operator rendered acceptance. N-0070 remains open; this correction does not accept the wider node or start subsequent programme work.

The [runtime checks](prescribed-progression-human-checks-20261103.md) are queued separately. Existing `applySetCompletion`, offline queue/replay, `sessionWorkAuthority`, and frozen snapshot functions remain authoritative. Pending offline data cannot earn another advancement merely by rebuilding a preview; the next result changes only when canonical completed evidence changes. Full-suite completion/offline tests are regression coverage, not device persistence proof.

Pre-existing repository changes are excluded from the scoped commit. The test-generated `ROUTINE_VOLUME_BASELINE.md` is restored byte-for-byte to its pre-run contents. EIF state changes use the public wrapper only; pre-existing dirty generated/ledger files are not staged wholesale.
