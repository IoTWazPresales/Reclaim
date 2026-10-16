# R11 Android acceptance continuation — UNABLE_TO_VERIFY

R11 only; N-0071 stays open. This checklist is a manual queue item until the
public EIF wrapper successfully registers it. It does not approve a node or
authorize production writes. Preserve R10-P01 and D-P2-01–06 as unresolved.

Current R11 recovered the canonical environment and verified the retained
profile, saved legacy day metadata, all 27 preview exercise rows and a historical
completed summary through Android and authenticated live reads. See
`R11-android-acceptance.md`. Reuse the retained working emulator/Metro/app.
The remaining blocker is an expressly authorized disposable save/start/freeze/
effective-guidance journey; the operator account has no open session or frozen
snapshot for its current programme. Do not repeat completed read-only checks as
if they were missing. Steps 1–5 document startup reproduction if needed; steps
6–16 specify the remaining acceptance comparison and governance constraints.

## Restore and identify the authorized environment

1. Work on `fix/training-confident-ux`. Record source SHA and any modified app
   files. Use AGENTS §9: SDK `platform-tools/adb.exe devices -l`, wait for
   `shell getprop sys.boot_completed` = `1` and package-manager readiness.
   If absent, launch the existing `Medium_Phone_API_36.1` AVD without wiping it.
   A cold boot uses `-no-snapshot-load`, preserving disk/account state.
2. From `app/`, use `npm run android`. Retain working Metro. If a separate
   Metro is already serving 8081, use `npm run android -- --no-bundler` rather
   than selecting a different port. `npm start` prepares ADB reverse and the
   localhost debug preference. Verify `adb reverse --list` includes
   `tcp:8081 tcp:8081` and HTTP `/status` returns `packager-status:running`.
   A listening socket alone does not prove Metro is ready.
3. After a white/bundling screen, close/force-stop Reclaim and reopen it before
   other launch recovery. With reverse active, open
   `exp+reclaim-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`.
   Do not clear data, uninstall, use an old APK, regenerate native projects,
   connect GlobalProtect, or change production code to bypass startup errors.
   If watcher/transformer startup still fails, record its exact current error;
   source tests cannot replace product renders.
4. Record build/version and sanitized accessibility text plus screenshots using
   `adb shell screencap -p /sdcard/r11-<name>.png` and `adb pull`. Review every
   image before committing it; remove identifying profile/email/health details.
   Do not publish raw logcat, tokens, SecureStore, shared preferences or DB dumps.
5. Confirm whether the retained identity is an operator profile or an explicitly
   authorized disposable account. If login is required, the operator signs in
   through the normal UI; never retrieve credentials/tokens from device storage.
   Until disposable scope is confirmed, use read-only screens and do not save
   setup, replace the active programme, start/end sessions or tap Done.

## Profile → generation → persistence → Android comparison

6. Through an authorized read-only, user-scoped database channel, capture a
   sanitized `training_profiles` revision (`updated_at` if supplied), normalized
   goals, weekdays, equipment, constraints, experience, frequency, skill option,
   own baseline weights and entered repetitions. Capture the relevant
   `training_program_instances` profile snapshot and plan JSON policy version;
   alias programme/day/session IDs consistently instead of publishing UUIDs.
   Do not assume the actual profile equals the synthetic R10 fixture.
7. For the representative regression, use only an approved disposable identity.
   Enter the exact metadata in `R11-representative-five-day.json` (full gym,
   advanced strength, Monday–Friday, 46/46/8 goals and entered baseline reps).
   Capture setup including all selections, final weekly preview and each day.
   Compare every exercise ID, working set index, reps, kg/load convention,
   rest and uncalibrated explanation to committed R10 evidence, not a regenerated
   oracle. Policy is `weekly-20261014-v2`; fixture anchor is 12 October 2026.
   A different real calendar date needs explicit week/day identity mapping.
8. Save only within approved disposable scope. Read the new instance and its
   `training_program_days`, retain exact week/day/allocation/slot identity and
   `profile_snapshot`, reload Android and compare all five previews again.
   Expected representative daily sets: 16/13/17/14/16; minutes: 43/45/38/35/48.
   Expected exclusive direct-region totals: chest/back/quads/hamstrings 10 each,
   lateral delts/biceps/triceps/rear delts/calves 6 each, front delts/traps 3 each.
   These are retained product expectations, not new scientific prescriptions;
   see `ROUTINE_AUDIT.md` and the committed R10 oracle for provenance.
9. Begin a *new disposable* day, capture `training_sessions` metadata and all
   `training_session_items` planned rows, decision trace and canonical
   `performed.sets`. Compare Android full-plan and Guided views to this saved
   snapshot, including warm-ups separately from working sets. Never use an
   operator's existing active session to manufacture evidence.
10. Save/reload a canonical Done on a disposable session. Keep its original
    planned snapshot byte-equivalent while checking the persisted effective
    adjustment and pending next-set targets. For the existing R07 100→95 probe,
    use a separately authorized fixture that actually produces that input; do
    not expect 100 kg in the representative 82.5 kg bench day. Compare the
    effective reader/phone/notification targets after reload. Changes must go
    through existing UI and canonical completion, never direct DB writes.
11. Complete only that disposable session. Reload History and week summary;
    reconcile actual completed canonical set indices, full frozen planned sets
    and provisional future muscle sets for the latest saved attempt per day.
    Do not sum repeated attempts or treat run duration as muscle sets. Preserve
    history and distinguish original prescribed from performed/effective work.
12. Compare a newly built future proposal against the frozen started day after
    qualified history changes. Same inputs without new qualified history must
    keep the representative weeks identical. R10's separate successful-80 kg
    history case recommends 82.5 but applies the retained 80 kg own-baseline
    ceiling with an explanation. Partial/unavailable history does not qualify.
    Record behavior and keep D-P2-01 unresolved; do not tune any rule.
13. Inspect the same disposable guided session in phone, Android notification
    and the existing single foreground service, then Home/reopen/screen-off.
    Check actual next exercise/set/reps/kg match the persisted effective target.
    Observe existing `ReclaimSessionForegroundService` without scheduling or
    cancelling anything manually. With an authorized paired Wear device, check
    mirrored target and canonical Done exactly once. Without a watch, mark Wear
    UNABLE_TO_VERIFY; a phone notification or source test cannot pass it.
14. Capture setup, week, five previews, saved-day reload, started/frozen/effective
    state, completed history and mixed summary as bounded sanitized evidence.
    Record read failures, unsupported versions and discrepancies explicitly.
    Limited-equipment or hybrid-2/3 rejection is not accepted-good delivery.
    Keep lower-body follow-up conflict R10-P01 visible even if pixels match.

## Queue and review

15. Have a separate reviewer compare actual pixels/accessibility values against
    both the committed R10 oracle and the captured persisted authority. Missing
    database access is its own UNABLE_TO_VERIFY result, not inferred parity.
16. Use only `scripts/eif_node.py` after legitimate lease restoration by its
    owner/operator. The current public status/lease attempts fail
    `LEASE_NOT_OWNER: R20261014R03`; do not repair or bypass shared EIF here.
    Register `human-check N-0071 --steps
    docs/training/recovery/evidence/R11-human-verification.md` when permitted.
    No production UI change is made by this evidence task; captures do not
    constitute approval. Commit/push sanitized R11 evidence only, then stop.
    Do not start R12 or claim N-0071 acceptance.
