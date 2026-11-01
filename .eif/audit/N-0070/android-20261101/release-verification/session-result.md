# Android session verification and granularity result - 2026-11-01

**PASS for granularity and the requested one-session journey. One test session started, exactly one set logged and independently read back, then Cancel & delete verified all test rows gone. No source/migration/EIF acceptance.**

## Granularity audit

The previous rounded-equality stop is resolved under the operator's explicit rule. For each13-rep row, the unrounded RPE8 working limit is oneRM / (1 +15/30); raw ceiling is oneRM / (1 +13/30). The recorded progression proposals are above the RPE8 limit, so the unrounded applied working value is that limit before the increment floor.

| Row | Unit | Unrounded working kg | Raw ceiling kg | Step kg | Rounded working / ceiling kg |
| --- | --- | --- | --- | --- | --- |
| Mon Lateral Raises | per dumbbell | 11.200000 | 11.720930 | 1 | 11 /11 |
| Mon Barbell Curl | total bar | 18.666667 | 19.534884 | 2.5 | 17.5 /17.5 |
| Wed Lateral Raises | per dumbbell | 11.200000 | 11.720930 | 1 | 11 /11 |
| Thu Dumbbell Curl | per dumbbell | 14.000000 | 14.651163 | 1 | 14 /14 |

All four unrounded working values are strictly below raw ceilings. RPE8 was applied; equality results only from flooring to the existing increment. **Accepted as granularity cases for this verification under the operator's rule; no raw-ceiling defect.** This is not EIF acceptance. Full precision and basis: granularity-check.json. Source confirmation: epleyRpe8WorkingWeight in progression.ts uses target reps +2, as cited in ROUTINE_AUDIT.md. Previous five-day inventory and30warning/0error observations remain the saved-input record; no clinical or maximum-capacity claim is made.

## Baseline retention

Used the earlier explicit numeric confirmations: OHP90kg x8 and Deadlift100kg x5; no corrected values were supplied. No setup change or rebuild in this continuation. The request still included bracketed variant/correction alternatives, so a question was presented for clarification, and remains open. No new explicit confirmation that the actual OHP performance was standing barbell was received or inferred from elapsed time. The saved app exercise is overhead_press / total_bar. This remaining variant clarification does not alter what was tested: the existing already-authorized saved programme. See baseline-retention.json. No alternative baseline or rep count was invented.

## Session, frozen sets and guidance

Retained installed release source bd69229, APK SHA2567407978a5afd3d35b52134ebf934626bdf6e34427202386d32531084c674cf0a; accepted embedded-only provenance unchanged. Selected Week1 Monday Upper preview, then Guided and Start once. Android notification permission allowed; optional exact-alarm setting left unchanged via Not now; optional Health Connect request declined; physical-activity permission allowed for the session. No package/native/settings source edits or app data reset.

The started session was persisted in guided notification mode, six items and16working sets. Read-only stored planned.sets match the prior actual-preview-matching canonical replay exactly for every set in every exercise. Frozen full planned payload hashes remain the same after logging and minimizing/resuming. Working Bench100kg x7 matches preview. UI renders baseline-governed ceiling107.5kg, RPE8 working limit100kg and applied100kg. No warm-up was marked or logged.

Actual notification shade inspected: Session started; Barbell Bench Press /Set1 /100kg /7reps /Total bar weight; Done/Skip/Edit actions. Also Reclaim training in progress /Guided session active. Native dump records the single ReclaimSessionForegroundService, isForeground=true, foregroundId92911, types0x00000100 and reclaim_session_fgs foreground-service notification. Foreground service remained active after returning to the phone UI and after minimizing/resuming; no watch pairing/mirroring or locked-phone exact-alarm timing claim.

Raw notification-shade screenshot was captured in the audit directory and its hash is in guidance-native-check.json. It includes unrelated Google cards/location, so raw screenshot/dumps remain local and unstaged. Only scoped Reclaim notification strings/native lines and seven app/confirmation screenshots are published; no altered or synthetic render is represented as evidence. Other personal raw captures remain local. Several accessibility dumps during the live rest timer could not reach idle; actual screenshots were inspected and DB/native evidence supplies independent state checks.

## Exactly one persisted set and cleanup

Tapped notification Done exactly once for Bench Set1,100kg x7. No additional Done, warm-up mark, Skip, set edit or second session. Canonical performed.sets and training_set_logs both contain exactly this one set. UI shows logged Set1 /100kg x7 and next Set2 /100kg x7. Minimized and resumed through the app, then independently GET-read both authorities again; exactly one set remained and frozen prescription was unchanged.

| Stage | Account sessions | Items | Set logs | Test performed sets | Test set logs |
| --- | --- | --- | --- | --- | --- |
| Before | 5 | 14 | 18 | 0 | 0 |
| Started | 6 | 20 | 18 | 0 | 0 |
| Done once | 6 | 20 | 19 | 1 | 1 |
| Minimized/resumed/read back | 6 | 20 | 19 | 1 | 1 |
| Cancel & delete | 5 | 14 | 18 | 0 | 0 |

Tapped Cancel & delete session, then confirmed Cancel & delete in the explicit destructive dialog. Independent direct known-ID GETs after deletion: test session0rows, its session items0rows, set logs for the six known-owned item IDs0rows. These direct checks avoid relying only on ownership joins that could hide orphans. Every pre-existing session/item/log ID is still present. No direct API writes used. App returns to Training without active-session banner, completed0/frozen0, weekly review back to30warnings/0errors. Native foreground service absent and both Reclaim notifications absent after deletion. No test data remains.

## Evidence and limits

pre/started/logged/reopened/deleted-session-check.json are bounded owner-filtered read-only PostgREST GET receipts, deidentified. Raw rows remain outside the repository. Known deleted IDs were queried directly only after establishing ownership. Credential discovery was read-only and credentials stayed in memory. UI mutations were limited to the authorized one-session test, its one set, cleanup, and the required Android permission decisions described above.

frozen-prescription-comparison.json records exact16-set parity and retained full-planned-payload match after resume; guidance-native-check.json records sanitized native/notification state; session-renders contains seven scoped actual screenshots. No source suite rerun for this runtime/evidence-only task. Product source/native/package diff is empty. Full Play/device/watch/OTA release acceptance is outside this receipt. Existing Tricep Pushdown population default still has no own Epley ceiling; no unsupported personal-ceiling claim is added.

Screenshots and wrapper queue result are recorded below. No node complete/acceptance or broader programme work.

Public wrapper lease / await-approval / automatic-release succeeded20:41UTC under R20261101RELEASEVERIFY. Seven session renders hashed; queue scope note added because existing N-0070 section is retained. Receipt consistency assertions passed for granularity, frozen parity/resume retention, exactly-one canonical/logged set and direct-zero cleanup with prior IDs preserved. Evidence committed and pushed in the following documentation checkpoint. No accept/complete/evidence-add command.
