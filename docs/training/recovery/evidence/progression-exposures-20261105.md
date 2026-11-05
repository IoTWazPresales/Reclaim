# N-0074 progression: benchmark/follower exposures, RIR-aware Epley, added bodyweight, rep restart (2026-11-05)

Node **N-0074** (run `R20261105PROG`, risk R3). Scope: progression decisions only. No weekly policy change, no programme rebuild, no new policy version, no schema change, no migration, no live DB write, no device interaction with training setup. N-0072 / N-0073 approvals untouched. Policy text and provenance: `docs/training/ROUTINE_AUDIT.md`, section "Progression policy N-0074 (2026-11-05)".

## What changed

| Area | Change |
| --- | --- |
| `progression.ts` policy block | Named constants with ROUTINE_AUDIT provenance: `BENCHMARK_WINDOW_SESSIONS` 3, `FOLLOWER_MISS_STREAK` 2, `FOLLOWER_STEP_DOWN` 1, `HISTORY_SESSIONS_PER_EXERCISE` 6, `UNLOGGED_RPE_RIR` {2, 0}, `RPE_SCALE_MAX` 10, `ADDED_BW_RESTART_OFFSET` 2. No inline policy literals; ranges and target reps read from `getRepRange` / `EXPOSURE_ROLE_POLICY` / the slot's declared range. |
| A1 benchmark | `deriveProgressionDecision(..., exposure)` filters history to the declared exposure (recorded `exposure` field; legacy entries matched on recorded rep range). Other-exposure entries are skipped. |
| A1 follower | New `follow_benchmark` decision: best RIR-aware e1RM over the last 3 benchmark sessions, `epleyRpe8WorkingWeight` at the follower's declared target reps, floored to step; 2 consecutive comparable misses hold it 1 step lower until completed. No benchmark history: baseline as before; no qualified benchmark in the window: follower's own history (A2). |
| A1 context | `prescriptionContext(range, exposure)` records `exposure` inside the existing `planned.decisionTrace.prescriptionContext` JSON. No schema change. |
| A1 week lookup | `exposureBenchmark.ts`: strength exposures of the same saved week keyed by exercise, with the weekday name from the saved programme (`programmeProjection.programDayInput`). R05 validator derives the same context independently from the declaration. |
| A1 copy | `decisionTrace.loadFollows` = "Weight follows your <day> <exercise> sets."; shown under the exercise line in Session Preview and as the progression reason in session views. |
| A2 | `rirAwareE1RM`: `weight × (1 + (reps + RIR) / 30)`; RIR = 10 − RPE, or 2 / 0 when RPE is absent (met / missed targets on an RPE 8 double-progression prescription). Used by `governingLoadEvidence` (fallback load) and the validator's independent history ceiling. RPE 8 ceiling kept. Added-bodyweight kilograms never estimate an e1RM. |
| A3 | `pull_ups`, `chin_ups` → `added_bodyweight`; `tricep_dips`, `weighted_pull_ups`, `weighted_dips` added as `added_bodyweight` (2.5 kg step). Top of range at 0 kg → `add_weight` +2.5 kg. A logged added load different from the prescription → repeat at the logged load. Display "Bodyweight" / "BW + N kg" from `loadDisplayFormat.formatAddedBodyweightLoad` (Session Preview, guided card, logged sets, history modal); no id checks in UI. Weekly policy `hasPrescribedLoadPath` treats `added_bodyweight` like `bodyweight`, so pull-ups still gain a strength role only through an entered weighted variant (v4 compile byte-identical). |
| A4 | External load restart = `epleyRestartReps` clamped to [min, max − 1]; added bodyweight restart = max − 2. Deload unchanged. v1 replay path untouched. |
| History depth | `trainingProgramPerformanceSeed` and `getRecentExercisePerformances` default use `HISTORY_SESSIONS_PER_EXERCISE` (3 → 6). |

## History depth and query cost

`getRecentExercisePerformances` already pages through **every** `training_session_items` row for the requested exercises (500 per page) and applies the per-exercise limit only in `completedPerformanceHistory`. Raising the depth from 3 to 6 therefore does **not** change the SQL, the number of pages or the rows transferred; it keeps up to 6 instead of 3 projected `ExercisePerformance` objects per exercise in memory (≤ 2× a few hundred small objects for a full catalogue seed).

## Acceptance simulations (vitest, `progressionExposures.acceptance.test.ts`)

Fixtures are `PerformanceHistoryItem` rows projected through the real `completedPerformanceHistory` (completedAt, `evidence.status` qualified, `prescription.context` with `double-20261103`, repRange and exposure); baseline dated 2026-11-01 before the history; goals 0.5/0.5; Advanced; operator bench baseline 122.5 / squat 116.67 (test fixtures only). Ranges: strength [3, 6] target 5, hypertrophy [6, 12] target 8 (rules.v1.json via `EXPOSURE_ROLE_POLICY`).

- **S1** Mon 4×5 @97.5 → Wed 4×8 @90 → Mon 4×6 @97.5 → Wed 4×8 @92.5 → Mon 4×5 @100 → Wed 4×8 @92.5 → Mon 4×6 @100 → Wed 4×8 @95 → Mon 4×5 @102.5 → Wed 4×8 @95 (matches the requested sequence exactly).
- **S2** (RPE not logged) identical to S1.
- **S3a** follower misses 8,8,7,6 twice: Mon 4×5 @97.5 → Wed 4×8 @90 → Mon 4×6 @97.5 → Wed 4×8 @92.5 (miss) → Wed (Mon skipped) 4×8 @92.5 (miss) → Wed 4×8 @90 (miss) → Wed 4×8 @90 (completed) → Wed 4×8 @92.5 → Mon 4×5 @100. Benchmark unaffected.
- **S3a, benchmark progressing between the misses:** … Wed 4×8 @92.5 (miss) → Mon 4×5 @100 → Wed 4×8 @92.5 (miss) → Mon 4×6 @100 → **Wed 4×8 @92.5** (derived 95, held one step) → Mon 4×5 @102.5 → Wed 4×8 @95.
- **S3b** benchmark misses (5,5,4,4) twice: … Mon 4×5 @100 (miss) → Wed 4×8 @92.5 → Mon 4×5 @100 (miss) → Wed 4×8 @92.5 → **Mon 4×3 @90 (existing deload)** → Wed 4×8 @92.5 (re-derived from the window; the missed sessions were logged at RPE 8, so they still count two in reserve).
- **S4** first week: Mon 4×5 @97.5, Wed 4×8 @90 (unchanged from the pre-N-0074 v5 week in `weekly-policy-v5-20261105.md`). Benchmark skipped: Mon 4×5 @97.5 → Wed 4×8 @90 → Wed (Mon skipped) 4×8 @90.
- **S5** squat: 4×5 @90 → 4×6 @90 → 4×4 @95 → 4×5 @95 → 4×6 @95 → 4×4 @100.
- **S6** pull-ups: 4×8 → 4×9 → 4×10 → 4×11 → 4×12 @Bodyweight → 4×10 @BW + 2.5 kg → 4×11 @BW + 2.5 kg → 4×12 @BW + 2.5 kg → 4×10 @BW + 5 kg.
- **S6b** lat pulldown accessory (range [7, 12]): 4×12 @50 → 4×10 @52.5.
- **S7** pull-ups logged at +10 kg against a 0 kg prescription (adjusted and not adjusted): next 4×8 @BW + 10 kg (repeat targets at the logged load), then 4×9 @BW + 10 kg.
- **S8** v1 replay: `suggestPrescription` with and without a declared exposure is byte-identical under `prescriptionPolicy: 'v1'`; `frozenPolicyReplay` v3 and legacy rows pass on the strict (capture-time) normaliser with their original hashes.

End to end: the operator 5-day v5 plan records `exposure: 'strength'` (Monday) and `'hypertrophy'` (Wednesday) on bench, shows "Weight follows your Monday Barbell Bench Press sets.", and after one recorded Monday session prescribes Mon 4×6 @97.5 / Wed 4×8 @90 with **zero R05 errors**.

## Display strings

| Load | Text |
| --- | --- |
| added_bodyweight, 0 kg | `Bodyweight` (preview `Bodyweight · 8 reps`) |
| added_bodyweight, 2.5 kg | `BW + 2.5 kg` (preview `BW + 2.5 kg · 10 reps`; logged `BW + 10 kg × 12`) |
| bodyweight (push-ups), 0 kg | `Bodyweight · 12 reps` (unchanged) |
| external | `97.5kg` (unchanged) |

## Existing tests updated (policy deltas, not regressions)

- `prescribedProgression`, `programmeAcceptance`, `performanceHistory`: A4 restart reps (e.g. 80 × 9 → 82.5 restarts at 7, not 5; 85 × 12 → 87.5 at 10) and A2 (fixtures log RPE 7 = 3 in reserve: 85 × 12 → 90 kg, was 85; 100 × 8 → 92.5, was 85).
- `defaultLoadUnits`: pull-ups mode is `added_bodyweight`; zero added load no longer requires confirmation (assisted bodyweight still does).
- `frozenPolicyReplay`: v4 session replays differ only by the two additive fields `prescriptionContext.exposure` and `decisionTrace.loadFollows`; v4 replay rows drop exactly those keys, v3/legacy rows keep the strict capture normaliser. v4 compile is byte-identical.
- `exerciseSubstitution`: replacing into pull-ups is still calibrated as bodyweight (code fixed for `added_bodyweight`).

## Gates

- Focused: `progressionExposures.acceptance.test.ts` 18/18; updated progression/history/acceptance/default-load/substitution/frozen-replay files pass.
- `npm run typecheck`: 0 errors.
- Full suite, canonical sequential shards (`npx vitest run --shard k/4 --reporter=verbose`): shard 1 365/54 files, shard 2 440/54, shard 3 569/54, shard 4 338 + 1 skipped/53 → **1,712 passed, 1 skipped (env-gated probe), 0 failed, 215 files**. No shard hung; no re-runs. Logs: `.eif/audit/N-0074/gates/`.
- `npm run audit:training-dual-paths` (Git bash): **31 passed, 0 failed**. `rg` is not on PATH on this host; Cursor's bundled ripgrep (`…/cursor/resources/app/node_modules/@vscode/ripgrep/bin`) was prepended to PATH.

## Deviations and reasons

1. **A3 restart reps.** A3 said "+2.5 kg at the bottom of the range"; A4 and S6 say range max − 2 (4×12 @BW → 4×10 @+2.5). Implemented A4/S6 (restart 10, not 6).
2. **Zero added load needs no confirmation.** RA-016 had treated 0 kg on an `added_bodyweight` lift without history as an unknown load ("weight confirmation required"). A3 requires "Bodyweight" at 0, so `requiresLoadConfirmation` and the R05 validator now treat 0 on `added_bodyweight` like `bodyweight`. A weighted variant (e.g. weighted dips) chosen without an entered load is therefore shown as Bodyweight rather than asking for a load. Assisted bodyweight unchanged.
3. **RIR 2 default requires a recorded RPE 8 prescription.** Unlogged RPE counts 2 in reserve only when the entry's prescription context is `double-20261103` (prescriptions recorded since 2026-11-03, all RPE 8). Older entries without that context keep the previous all-out assumption (0), because they were not prescribed at RPE 8.
4. **S3 example figures.** "Next follower is 90" holds while the derived load stays 92.5 (S3a, benchmark skipped between misses). If the benchmark raises the derived load in between, the held follower is one step below the new derived load (92.5 below 95), per the stated rule.
5. **S3b follower after the deload** is 92.5, not lower: the window still holds the two pre-deload benchmark sessions, logged at RPE 8 (two in reserve).
6. **S7 next reps** repeat the prescription's targets (4×8) at the logged +10 kg; the logged session's extra reps earn no progression because the load differed from the prescription (existing adjusted/incomparable rule).
7. **Follower copy placement.** Session Preview had no per-exercise reason line; the follower line was added under the exercise summary (`decisionTrace.loadFollows`). Guided/session cards show it through the existing progression reason.
8. **Validator.** The R05 validator now passes the declared exposure (and benchmark from the declared week) into the shared decision and uses `rirAwareE1RM` for its independent history ceiling, so its checks match the new rule.

## Runtime

Visible changes (follower line, BW + N kg). No Android renders: the brief forbids device interaction with training setup on the operator account, and Session Preview for a v5 programme needs a saved v5 programme. Queued as UNABLE_TO_VERIFY in HUMAN_CHECKS for the preview APK on the operator's phone.

## Package B

- **B1** ROUTINE_AUDIT V5-6 Core: "Sberse et al. 2024 (unverified)" replaced with Sberse RT, Zapparoli LB, Brodt GA. *Fisioterapia em Movimento* 2024;37, doi 10.1590/fm.2024.37103 (journal page periodicos.pucpr.br/fisio/article/view/30917). Barrio et al. 2024 kept.
- **B2** EAS preview build from Package A commit `c0fc65e`: build `780609e2-3e64-47e2-82b2-c2588de772ba`, **1.0.5 / versionCode 15**, runtime 1.0.5, preview channel, remote keystore (same as earlier preview builds). APK: https://expo.dev/artifacts/eas/UPkyqYqnPLFxFnVeWupasT2gUBSsnUoI7OTtSL5-A0s.apk ([build page](https://expo.dev/accounts/eliasonw/projects/reclaim-app/builds/780609e2-3e64-47e2-82b2-c2588de772ba)). **Versioning:** no mismatch existed at build time: EAS remote (`appVersionSource: remote`), `android/app/build.gradle` and `app.config.ts` all read versionCode 15, and the previous preview build (2026-11-02, `06dcbe9`) was also vc15. Following the existing remote-version approach, nothing was bumped (vc16 is reserved for the 1.0.6 release in CHECKPOINT_REVIEW); runtimeVersion policy unchanged. Android accepts an update with an equal versionCode from the same signing key; if the phone holds a build above vc15, the install will be refused as a downgrade and a remote bump (`eas build:version:set`) is the operator's call.
- **B3** `spike/web-lite` merged `c0fc65e` as `790c0b2` (no conflicts; pushed). Merged worktree: typecheck 0; training/components/web tests 1012 passed + 1 skipped / 94 files; `npx expo export -p web` OK (bundle contains `follow_benchmark`). `eas deploy --alias beta` → deployment **`7urtsz43d8`**; https://eliasonw-reclaim-app--beta.expo.app serves `AppEntry-91f8690602be3334d0423e1be0f239c3.js` (HTTP 200), SHA-256 `dd0ff4aaf408a0fa32cd90f7d9510f7da4d77026ede00cc15afa187614b2b276`, identical to the local export. No production alias, Supabase setting or OTA change.
- Phone check queued in HUMAN_CHECKS (`.eif/audit/N-0074/human-check-phone.md`).
