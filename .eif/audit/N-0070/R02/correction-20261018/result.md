# R02 corrected running-preview contract and supplemental provenance ? 2026-10-18

**Source approval: YES, scoped to R02.** Corrected source commit: `b7644d14e593712e333ab330cb4105a83ba17d6a`, pushed on `fix/training-confident-ux` and independently remote-verified in [source-publication.json](source-publication.json). N-0070 remains in progress with acceptance pending. This is not a green full-suite gate, scientific approval, rendered approval, shipping approval or node completion.

## Correction and accepted boundaries

[contract-trace.md](contract-trace.md) follows accepted RD-006 through `runTargetMinutes`, the planner, canonical session builder, weekly proposal, preview adapter and setup UI. The original defect record is preserved verbatim in [the failed review](../provenance-20261018/result.md) and [its reviewer receipt](../provenance-20261018/reviewer.md). No prior investigation or failed receipt was rewritten or backdated.

The generator prescribes 20/20/30/30 minutes and intentionally gives a running-only session no lifting exercises. The former summary rejected that valid session and the panel incorrectly said duration was unprescribed and the goal already saved. The corrected summary accepts valid finite positive run durations from generated output, rejects unavailable/infeasible proposals and empty lifting sessions, and exposes runningDurationMinutes. The panel shows timed running/walking instead of lifting fields. Distance goals are explicitly independent of pace and prescribed minutes; setup/panel wording waits for confirmation before claiming persistence.

No engine, planner, numerical rule, progression, started/guided session, performed history, database, migration or live data was changed. D-P2-02 is still unresolved. Valid strength/hybrid previews retain lifting presentation; currently infeasible programmes remain unavailable. No R12 work occurred.

## Exact committed-source review

The user-requested separate agent `/root/r02_corrected_source_review` began with a fresh task context and no implementation authorship; configured reviewer model `gpt-6-astra`. No unsupported claim about the primary model's exact identity or a human review is made. [reviewer.md](reviewer.md) explicitly approves the corrected source and records limits. It reviews the original ten R02 source/test paths at the corrected target, the narrow correction and added panel test, and relevant surrounding generation/save boundaries. It does not approve all intervening recovery tasks.

[source-manifest.json](source-manifest.json) binds all eleven source/test paths, source tree and lockfile. [reviewer-source.json](reviewer-source.json) independently recomputes their Git blob IDs and raw SHA-256, plus dependency/policy pointers. All eleven raw isolated working files, tested bytes and committed objects match exactly. Other reviewed checkout dependencies have equivalent LF-normalized content, with representation differences recorded. Dependencies were shared by junction to existing canonical node_modules, not freshly installed. The isolated full-suite-generated snapshot/baseline documents are excluded outputs.

## Verification and remaining full-harness debt

Primary independent isolated checks, with configured 30-second test budget unchanged:

- Focused actual adapters, generator, panel rendering, mode and experience: **42/42 passed**.
- Typecheck: **zero errors**.
- Dual-path audit in Git Bash: **31/31 passed**.
- Catalogue QA: **357 rows, zero governance issues**.
- Public wrapper pytest suites: **14/14 passed**.
- Required full verbose Vitest completed: **200 files; 1,385 passed / four failed**, exit 1. [baseline-comparison.json](baseline-comparison.json) matches all four exact assertion identities to committed R11 evidence. Failures remain routineVolumeMeasurement seed count (31 versus 18), runSession migration linkage (UUID versus expected text), and two weeklyVolumeModel caps (15 versus 10; 6 versus 2). No new failing assertion identity was observed. This remains a failing gate, with no waiver.

Commands, exits and raw log hashes are in [verification.json](verification.json); the completed full log is [full-vitest.txt](full-vitest.txt). The reviewer independently reran **42/42 focused tests** and authored **4/4 additional probes** for serialized run parity across all scheduled days/weeks/distance choices, draft immutability and frozen prescriptions. Their source and logs are retained alongside the receipt. The reviewer inspected the full failure comparison but did not claim to rerun the whole full harness.

## Ownership, registration and visual approval

Only after source approval, public `scripts/eif_node.py` status confirmed the expected historical owner `R20261016EVIDRECOVERYA` had expired, with N-0070 in_progress/pending. The public wrapper released that expired lease and acquired a fresh legitimate lease under `R20261018R02CORRECTION`; post-acquire status confirms ownership and unchanged nonownership node fields. See ownership-before/release-expired/acquire/acquired JSON receipts. No owner was impersonated, no runtime internals were read/edited, and no acceptance or completion operation was issued.

This result and the separate review will be committed and pushed before the wrapper is invoked to attach evidence. The actual evidence ID and final queue/release receipts are recorded in the subsequent registration checkpoint; no ID is guessed or reserved here.

[runtime-preflight.json](runtime-preflight.json) records no connected ADB device and no reachable localhost Metro. **UNABLE_TO_VERIFY** Android renders, layout/accessibility and operator visual approval. [visual-steps.md](visual-steps.md) supplies bounded unsaved-setup steps. Public human-check/await-approval will record this pending gate after publication; neither queue grants approval. No programme has been saved for verification.

[The preservation receipt](preservation-before-ownership.json) confirms all pre-existing unrelated dirty files and failed-review artifacts remained byte-identical before authorized wrapper ownership mutations. Original failed-review files remain intact. Runtime UI/query timing, saved-profile/live DB round trips and whole-node criteria remain outside this source checkpoint.

Stop after R02 correction/provenance. Do not accept/complete N-0070 or begin R12.
