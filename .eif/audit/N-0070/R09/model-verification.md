# R09 verification receipt — 2026-10-16

**Result: VERIFIED_WITH_LIMITATIONS for the sampled source/persistence contracts.** No unresolved blocking finding in the final ten-file R09 slice. This receipt does not accept N-0070, approve shipping, or establish device behavior.

Scope: frozen baseline `733749c3cd8b6d45fcfab3847bbd70ac3e07a8d8` plus the ten R09 files in `source-manifest.json`, at `C:/Reclaim/.tmp/R09-verify`. Final manifest SHA256: `2e94bc2f6bd98a8b44cb7d83418d68246433029c3942939525dfb544b2ed4e7d`. Independently recomputed SHA256 values match all ten entries; exact values are in `model-hashes.json`. Earlier frozen snapshots and interrupted test attempts are superseded by this final receipt.

Independence: separate review worker/session from implementation, with reviewer-authored adversarial samples. Any different-model identity is configuration only and was not independently attested. This is not a claim that the R3+ cross-model independence rung was proven. This worker made no production edits or EIF mutations and did not inspect EIF runtime internals, investigate ownership, or start R10.

## Re-executed evidence

From the final frozen `app/`:

```text
npx vitest run src/lib/training/__tests__/programmePersistence.integration.test.ts src/lib/training/preview/__tests__/setupContract.test.ts src/lib/training/__tests__/trainingMode.test.ts src/lib/training/__tests__/guidedWearDelivery.simulation.test.ts src/lib/notifications/__tests__/guidedTrainingNotificationActions.persistence.test.ts --reporter=verbose
```

Exit 0; **5 files, 29 tests passed**. Output: `model-focused-final.txt`.

```text
npx vitest run --config r09-independent.vitest.config.ts --reporter=verbose
```

Exit 0; **7 reviewer-authored samples passed**. Source: `model-samples.test.ts`; output: `model-samples-final.txt`. The test-only config lives in the frozen checkout, imports its normal Vitest configuration, and selects this audit artifact. No shorter test timeout was introduced. Earlier esbuild `spawn EPERM` attempts did not execute assertions and are not counted as passing evidence; the final successful runs above supersede them.

## Findings

- The named five-day source fixture covers setup, weekly proposal, JSON save/reload, stored plan day identity independent of translated display label, materialization, canonical completed history, frozen items, and a future proposal. The test compares setup/week/day decisions and retains stored planned sets across history and guidance changes. Its persistence is synthetic JSON and row fixtures, not a live Supabase transaction.
- `programmeWeekProposal` is shared by setup preview, programme validation, TrainingScreen weekly composition and day fallback. `programDayInput` resolves stored week/day allocation; unsupported versions, wrong day keys, missing compilation, and changed allocated dose all reject start/materialization in the sampled typed contracts.
- Legacy generation without allocation remains available. Stored started/guided snapshots, including empty item arrays, survive rebuilds at the pure projection/materialization boundary. Summaries separately project completed recorded sets, frozen planned sets, and provisional future plans.
- Pending guidance and phone session rendering use `getAdjustedSetParams`; notification progression derives its target through the same helper. The saved-overlay sample and existing persistence tests verify effective pending targets after reload and disregard stale notification payload values. Completed work ignores subsequent overlays. These are source/headless results, not watch delivery acceptance.
- Review identified missing frozen-week invalidation in four in-place End & save / Cancel & delete branches. The final TrainingScreen source now invalidates that query in all four branches, as well as start and session-view return callbacks. This correction was inspected in the final frozen file.
- The final planner projects only supported normalized constraint fields into stored programme input and retains the resolved top-level training mode. Existing `trainingMode.test.ts` now passes, including missing/unknown-mode equivalence. This worker did not independently rerun the typecheck or full harness; the parent owns those final gates.

## Residual limitations

- Arbitrarily malformed saved JSON is not comprehensively decoded by this adapter. For example, a non-string `compilation.strategyId` throws before weekly validation and can make preview unavailable/crash rather than display an infeasible review state. The seventh sample explicitly reproduces this limitation; its passing assertion documents the throw and is not resilience acceptance. No hardening was added in this review.
- `getFrozenProgramDayItems` selects the newest frozen session per programme day. Its weekly summary therefore represents one frozen snapshot per planned day; it does not aggregate repeated attempts of the same day as a separate activity ledger.
- No AVD renders, Android runtime, live DB save/reload, actual notification/watch transport, or product acceptance was verified. R11/device checks and N-0070 acceptance remain separate. Generic-engine eligibility/migration changes were excluded. Final full-suite/typecheck/catalogue/dual-path/ledger gates and pushed-commit identity must be reported from the parent's own final evidence, not inferred from this focused receipt.
