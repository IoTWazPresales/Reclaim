# EIF programme progress — PRG-20260917T222550

Durable resume file. Next session: start at the first unfinished node below. Do not reconstruct from chat.

**Branch:** `fix/training-confident-ux` (never `main`)
**Programme:** PRG-20260917T222550
**Ledger interface:** `python scripts/eif_node.py` (wrapper; see `AGENTS.md` §5). Never call `program.py` or read `.eif/runtime/**` directly.
**Hooks:** off (`.cursor/hooks.off`, `.cursor/hooks.json.off`)
**Canonical rules:** `AGENTS.md` (repo root). Start prompt: `docs/eif/RESUME.md`.

## Resume pointer

- **N-0039 source-validated, 2026-09-30 (R20260930B):** `303a7f4` / EV-0052. Session calories are a Health Connect window total with `energySource`, `energyReadAt`, and `energyWindow`. A later read can replace an empty or smaller total until 30 minutes after the end. No per-set calories were added. (a) and (c) are false on the finish path. (d) was the gap. (b) was not run on a watch. Focused calorie tests 9/9; close/finalize/writer 9/9. Typecheck 0. Dual-path 29/29. Catalogue 357/0. The default full Vitest hung after a 5-second mood timeout and one mood assertion and was stopped (N-0052). The 30-second retry passed 162 files / 1012 tests in 381.42s. `node.status complete` was rejected by QUALITY_GATE (N-0053). Acceptance was recorded. The worn-watch re-read is in HUMAN_CHECKS. The lease was released. The node stays in progress. Next source node is N-0041. Executor was Grok 4.7.
- **N-0024 source-validated, 2026-09-30 (R20260930A):** `e515eb5` / EV-0051. The volume harness hard-asserts the written session caps (primary 25, accessory 15, isolation 10, session total 120). No sets/muscle/week band was added. CI unit tests run `npm test` (`vitest run`) and include `fix/training-confident-ux`. Focused harness 1/1. Default full Vitest 997/1003 with six 5-second sqlite timeouts (N-0052), 488.03s. A concurrent Vitest stalled the first 30-second retry; that run was stopped. The solo 30-second retry passed 161 files / 1003 tests in 423.28s. No GitHub Actions run was observed. `node.status complete` was rejected by QUALITY_GATE (N-0053). Acceptance was recorded. The node stays in progress. This does not make the routine scientifically correct. Next source node is N-0039. Executor was Grok 4.7.
- **N-0023 source-validated, 2026-09-30 (R20260930A):** `8a00cb6` / EV-0050. Week 1–4 is recorded on a new plan. Sets, load, and rest stay the same across those weeks. No RIR field was added. The audit's week-multiplier sentence is an example, and `rules.v1.json` has no week multiplier and no RIR target, so neither was invented. A two-hold deload stays 10% with increment 0, and that weight is not then increased. Started and guided planned sets stay frozen. Focused 3/3. Typecheck 0. Dual-path 29/29. Catalogue 357/0. Default full Vitest 1002/1003 with one 5-second sqlite timeout in `smallModuleMirrors.read` (N-0052), 441.21s. 30-second retry 161 files / 1003 tests PASS in 476.93s. This does not make the routine scientifically correct. Do not mark N-0023 complete from this source work. Next source node is N-0024. Executor was Grok 4.7.
- **N-0011 source-validated, 2026-09-29 (R20260929G):** `1698231` / EV-0049. New plans enforce `volumeCaps` as session set ceilings — primary 25, accessory 15, isolation 10, session total 120. The fractional muscle count is 1.0 per primary tag and 0.5 per secondary tag. No sets/muscle/week band was added. The audit's 10–20 sentence is an example. Session cap 10 was not added; the session number in the rules is 120. Measured sessions were already inside the caps, so the volume baseline did not move. Started and guided planned sets stay frozen. Focused volume/golden/session tests passed. Typecheck 0. Dual-path 29/29. Catalogue 357/0. Default full Vitest 999/1000 with one 5-second sqlite timeout in `smallModuleMirrors.read` (N-0052), 268.55s. 30-second retry 160 files / 1000 tests PASS in 322.60s. This does not make the routine scientifically correct. Do not mark N-0011 complete from this source work. Next source node is N-0023. Executor was Grok 4.7.
- **N-0022 source-validated, 2026-09-29 (R20260929F):** experience is stored on the existing profile JSON (`constraints.experienceLevel` and `profile_snapshot.experienceLevel`). No new column. Missing or unknown becomes beginner on a new build. A per-exercise Epley ceiling caps suggested load only when that exercise has its own 1RM. Started and guided planned sets stay frozen. Setup chips were captured on emulator-5554 (Beginner hydrated, Intermediate selected, then Exit so the live program was not rewritten). Volume harness remeasured under the beginner default: weeks still 100/100 identical, seed still 18, accessory-in-compound still 50/100, duration over 60 min moved from 28/100 to 0/100. Focused experience/golden/volume passed. Typecheck 0. Dual-path 29/29. Catalogue 357/0. Default full Vitest 993/994 with one 5-second sqlite timeout (N-0052). 30-second retry 159 files / 994 tests PASS in 178.77s. This does not make the routine scientifically correct. Next source node is N-0011. Executor was Grok 4.7.
- **Gym observations, 2026-09-29 production APK** (`dea4df60-4f2c-4f4b-961b-7096863413d7`): recorded in `baseline/GYM_20260929_PRODUCTION_APK.md`. Not fixes. Training loading loop until every profile was deleted (`getTrainingProfile` uses `.single()`; N-0007 stays a different spinner and awaiting approval). Illustrations still miss the movement (N-0034). Cold start showed "Couldn't confirm your profile", then a reopen entered (N-0005 only stopped the Welcome dump). Guided training worked, with notification permission at guided start and Health Connect exercise-session write plus active-calorie read on the first training start of that process. No running module. Garmin and Huawei do not reconnect; Health Connect is the Android connection. Some notifications appeared only when the app was opened. Integrations copy did nothing useful in that session. These do not jump the queue.
- **N-0021 source-validated, 2026-09-29 (R20260929E):** product session builds go through `buildProgramDaySession`. The engine builder is unchanged. Started sessions, and guided sessions that already have items, keep that planned-set snapshot. Focused 34/34. Typecheck 0. Dual-path 29/29. Catalogue 357/0. Default full Vitest 988/990 with two 5-second sqlite timeouts (N-0052). 30-second retry 158 files / 990 tests PASS in 362.92s. This does not make the routine scientifically correct. `node.status complete` was rejected by QUALITY_GATE (N-0053). Acceptance was recorded and the lease was released. The node stays in progress. Next source node is N-0022. Executor was Grok 4.7.
- **N-0020 source-validated, 2026-09-29 (R20260929D):** weekly sets line buckets primary tags from `muscleTaxonomy.ts`. Unknown catalogue tags fail vitest. `cardiovascular` and `full_body` are known non-regional tags and add nothing. Catalogue strings and `computeWeeklyMuscleSessionCounts` are unchanged. The line still sums one count per primary tag. Focused 7/7. Typecheck 0. Dual-path 27/27. Catalogue 357/0. Default full Vitest 983/985 with two 5-second sqlite timeouts (N-0052). 30-second retry 157 files / 985 tests PASS in 290.15s. Session-preview line was not captured. Do not mark N-0020 complete from source tests. Next source node is N-0021.
- **N-0066 source-validated, 2026-09-29 (R20260929C):** a late rest-end timer writes `deliverNow` only when the timed intent is still the pre-await snapshot (`setIntentIfCurrent`). A replacement or a clear is not written back, and a session with `ended_at` is not promoted. The now-slot dismiss in the timer and the timed-receive listener runs only when that slot is still the captured prompt. Reconcile still owns scheduled cancellation. `applySetCompletion` and the one health service are unchanged. Focused 9/9. Typecheck 0. Dual-path 27/27. Catalogue 357/0. Default full Vitest 156 files / 979 tests PASS in 177.74s. Device rest/replace/close was not run. Do not mark N-0066, N-0061, N-0017, or N-0042 complete from source tests.
- **N-0059 source-validated, 2026-09-29 (R20260929C):** application code no longer schedules or cancels OS notifications outside `NotificationScheduler`, and `cancelAllScheduledNotificationsAsync` is gone. One medication clear keeps the other medication, sleep, and a pending guided prompt. Reminder wipe keeps training, mindfulness, and meditation guidance intents. Settings buttons say "Clear reminder notifications". Focused 25/25. Typecheck 0. Dual-path 27/27. Catalogue 357/0. Default full Vitest 967/970 with three 5-second sqlite timeouts (N-0052); isolated re-run 10/10; 30-second retry 154 files / 970 tests PASS. Stalled runs were discarded. Device cancellation was not run. N-0066 is next and still owns rest-timer identity. N-0061 stays a human check. Do not mark N-0059 or N-0061 complete from source tests.
- **Launch recovery, 2026-09-29:** a white "Bundling 100%" screen after the N-0061 debug install was fixed by completely closing Reclaim, ending its process in the emulator, then reopening it. Metro stayed up. Do that before another install, data clear, or network change. The operator has restarted the app this way.
- **N-0061 source-validated, 2026-09-29 (R20260929B):** the prohibited background-actions transport is gone. Guided, mindfulness and meditation share one `HeadlessJsTaskService` (`ReclaimSessionForegroundService`, type health, stopWithTask false). Same domain+session does not restart. A second service was not added. Typecheck 0. Focused 12/12. Default full Vitest 153 files / 965 tests PASS after a concurrent run stalled during the native rebuild and was discarded. Dual-path 27/27. Catalogue 357/0. Wrapper 3/3. `assembleDebug` succeeded and `adb install -r` updated emulator-5554 without clearing data. Guided, rest, Done, Doze, lock-screen and Wear paths are not proven. N-0017 and N-0042 stay non-compliant. Next source nodes are N-0059 and N-0066, coordinated with N-0060. Do not touch live schema (N-0063) or guess N-0053.
- **N-0067 renders captured, 2026-09-29:** ordinary and large-text cards are under `.eif/audit/N-0067/product-renders/`. Home shows Medication, Sleep shows the local `sleep` card ("Bed/wake timing is drifting"), Mood shows `mood_fallback`. The named rules `sleep_serotonin`, `sleep_breath_vagal` and `mood_dopamine` were not the active cards (last night 7h 24m; mood history still settling). No records were written to force them. Node stays awaiting approval. See `baseline/N0067_DEVICE_CHECK.md`.
- **N-0067 source-validated, 2026-09-29 (R20260929A):** category lines no longer title-case internal source tags. `sleep_serotonin` → Sleep, `sleep_breath_vagal` → Breathing, `mood_dopamine` → Mood. Stored tags, rules, routes and telemetry unchanged; chemistry chips remain N-0035. Focused 6/6, types 0, Git Bash 27/27, catalogue 357/0, wrapper 3/3. Default full run 958/959 with one 5-second timeout (`smallModuleMirrors.read` dedupe, N-0052). 30-second retry 151 files / 959 tests PASS. No ADB device or Metro; ordinary/large-text acceptance queued. Therapist-export tag pill was observed and not changed. Next wave-2 source node is N-0061 (frontier; one native FGS). N-0065 stays queued for rendered copy acceptance.
- **N-0065 checkpoint, 2026-09-28 (R20260928A):** all 89 static insights reviewed; 84 records / 242 message-action-why fields revised without changing rule conditions, IDs or routes. Focused 34/34, types 0, Git Bash 27/27, catalogue 357/0, wrapper 3/3. Default full run: 950/953, three 5-second timeouts (N-0052); the 30-second-allowance full retry passed 150 files / 953 tests, reconciled 2026-09-29. Evidence: baseline/N0065_INSIGHT_COPY_REVIEW.md. No ADB device or reachable Metro; visual acceptance remains queued. N-0067 owns internal-tag category headings and is next bounded source work, followed by outstanding wave-2 safety findings. CHECKPOINT_REVIEW.md has the full done/outstanding account; HANDOFF_CURSOR.md is optional continuation guidance, not a performed editor migration.
- **N-0060 source-validated, 2026-09-28:** intent operations serialized; delivery acknowledgement compares write identity and is awaited; replacement identity participates in plan fingerprint/signature; timed receive checks delivered identity. Focused 26/26, full 150 files / 953 tests, types 0, audit 27/27. N-0066 now owns stale timer promotion/post-await dismissal, coordinated with N-0059. Native proof remains queued; N-0017/N-0061 not resolved. Next independent source review N-0065; retain notification/FGS findings before wave closure.
- **N-0064 source-validated, 2026-09-28:** first-medication coaching now requires a successful settled empty list, not merely an undismissed flag. Read failures reach existing error UI. Focused 11/11; full 149 files / 941 tests; types 0; dual-path 27/27. Existing-med AVD re-check remains queued without any dose/medication writes. Continue N-0060 notification-intent races; N-0059/N-0061 and other wave-2 gates remain open.
- **N-0062 source-validated, 2026-09-28:** persisted mood saves no longer become write-failure alerts when summary refresh fails; changed note drafts survive pending saves. Canonical writer and N-0018 duplicate guard retained. Focused 11/11; full 148 files / 930 tests; types 0; dual-path 27/27. Runtime/visual acceptance queued, not complete. Next source finding N-0064, then remaining notification/FGS findings before wave closure.
- **N-0029 source-validated, 2026-09-28:** audit pinned to LF and search errors now fail closed. Git Bash 27/27; injected search failure rejected; types 0; full 147 files / 923 tests PASS. Legacy System32-Bash acceptance remains blocked because that WSL environment lacks `rg`; exact steps are in HUMAN_CHECKS. No environment modification. Continue wave-2 source findings N-0062, then N-0064; N-0059/N-0060/N-0061/N-0063/N-0065 and runtime/quality gates remain before wave closure.
- **N-0028 source-validated, 2026-09-28:** association wording corrected in insight/education copy and Mood's Related patterns title; blanket missed-dose instructions removed. All 89 rule conditions/routes and catalogue match/review metadata preserved. Focused 25/25; full 147 files / 923 tests PASS; types 0; dual-path 27/27. ADB has no attached device and Metro is unreachable; visual acceptance queued in HUMAN_CHECKS. N-0065 owns broader unsupported health certainty in existing insights. Continue N-0029 without environment reconstruction.
- **N-0027 resumed and source-validated, 2026-09-28:** preserved the interrupted R20260922B implementation and renewed its expired lease. Closed U5 Sentry event names now cover successful preference changes, assignment creation and completion persistence. Focused 7/7; typecheck 0; saved full verbose run 147 files / 923 tests PASS; resumed Git Bash audit 27/27. Evidence: `baseline/N0027_U5_SENTRY_EVENTS.md`. No live event receipt or journey claimed. Next source node N-0028, then N-0029; release remains blocked by the existing runtime, security and EIF gate debts.
- **Runtime continuation / N-0064 finding, 2026-09-22:** retained-session inspection reached the Medications screen without changing medication or dose data. It showed four active medications while also showing the zero-medication coaching card ("Add a med to unlock reminders and adherence"). N-0064 now owns that contradiction. During the next bounded read-only capture ADB reported no attached device; per operator instruction the emulator/Metro workflow was not restarted or reconstructed. Continue source-side at N-0027; resume N-0032 visual verification only when the canonical Expo session is available again.
- **Canonical runtime recovered by retained Expo session, 2026-09-22:** the initial automatic `npm run android` launch again timed out/ANRed, but Warren backed out, kept Metro/emulator alive, pressed `a`, observed Android bundling, and Reclaim opened. Non-disruptive verification then confirmed booted `emulator-5554`, Reclaim 1.0.5/vc15 PID, focused `MainActivity`, Metro running, rendered Home, and responsive Settings navigation. The remaining environment issue is limited to unreliable initial launch sequencing/timing; no deeper root cause is claimed. N-0056 remains ledger-blocked only because blocker resolution is unavailable (N-0053). Continue retained-environment visual/runtime checks; do not restart/reinstall. N-0026 still needs actual-product TTF and must not use the 6679 ms dev-launcher time.
- **Operator stop — N-0026 runtime measurement, 2026-09-22:** N-0026 source work is implemented and green (focused 1/1, types 0, full 145 files / 918 tests, dual-path 27/27, catalogue 357/0). The required cold app-process measurement reached the Expo development launcher in 6679 ms, then `MainActivity` remained blank after normal server selection. Metro status and ADB reverse stayed healthy; Android reported `ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd` in `BundleDownloader.processMultipartResponse`. This is a new canonical-workflow multipart response failure, not the historical manual-APK defect. No Metro/emulator restart or reinstall was attempted. Per Warren's instruction, stop and wait for his reset/continue signal. Resume from `baseline/N0026_NOTIFICATION_FIRST_RENDER.md`; do not claim the launcher timing as product TTF.
- **N-0056 canonical workflow recovered, 2026-09-22:** Warren launched with `npm run android`; non-disruptive inspection confirmed ADB/device/package/PID/focused MainActivity, Metro HTTP 200, actual signed-in Home render, and responsive Settings navigation. The old manual-APK socket/class errors are historical, not current defects. BL-0008's real-world condition is resolved, but ledger status remains blocked because the wrapper rejected `node.blocker.resolve` as `UNKNOWN_EVENT`; the intended mutation is in `LEDGER_PENDING.md` for N-0053 repair/replay. N-0046 account-deletion visual/cancel evidence now exists under `.eif/audit/N-0046/product-renders/`; N-0047 remains a separate throwaway/data-erasure journey and is not passed by startup.
- **N-0047 current runtime blocker:** AVD signup through the canonical app reached Supabase, but the project requires email verification. The generated mailbox cannot receive the link, so no authenticated throwaway session or domain data was created and no deletion result is claimed. Exact redacted cleanup/continuation steps: `baseline/N0047_EMAIL_VERIFICATION_BLOCKER.md`. Emulator autofill was restored to its original service.
- **N-0056 stopped after post-uninstall reinstall, R20260921C:** the interrupted state was reconciled at ledger revision 195 (lease only; no product edit/install). The visible AVD booted, the existing 1.0.5/vc15 debug APK installed, Metro and ADB reverse were healthy, but launch rendered the Expo `SocketTimeoutException: Read timed out` error instead of Reclaim. Logcat also reports missing `expo.modules.splashscreen.SplashScreenManager`, making a stale/inconsistent native debug client a concrete but unproven suspect. No restart/reload loop was repeated. Per Warren's stop condition, wait for direction; the next distinct recovery is a fresh native debug build, not another reinstall of the same APK. Evidence: `baseline/N0056_RETRY.md`; local `.eif/audit/N-0056/reinstall-launch.{png,xml}`. No journey passed.
- **Operator stop, R20260921B:** requested fresh emulator retry failed: Android boot completed, installed 1.0.5/vc15 launched, but screenshot shows **System UI isn't responding**. Metro initially healthy, later status request timed out. Per Warren's latest instruction, stop here; no uninstall/data clear performed. Wait for Warren to remove Reclaim and say continue, then reinstall and retry before N-0026. Evidence: `baseline/N0056_RETRY.md`, local `.eif/audit/N-0056/launch.png`. This is not a completed node or passing journey.
- **Stage:** wave 2 correctness; Stage 1 source work reviewed, live journeys/approval still queued. Single writer; review consolidated into the final build. N-0030 stays parked and production chrome is excluded. N-0007/N-0016 require AVD journeys before completion.
- **Resume at wave 2 N-0026:** N-0032 review-tier label gate is source-validated in this checkpoint: **145 files / 918 tests PASS**, types 0, dual-path 27/27, catalogue 357/0, wrapper 14/14. All 357 catalogue rows remain unreviewed; no clinical content/provenance invented. Continue N-0026 → N-0027 → N-0028 → N-0029, then resolve wave-2 findings before closure. N-0019 pushed `593dd9b`, EV-0029: live anonymous app_logs SELECT is unsafe (N-0063; additional live migration approval required); no log rows read or policy changed. N-0018 `6787613` / EV-0028 and N-0058 `638ccfb` / EV-0026 await visual proof under N-0056. N-0017 remains blocked on actual background-actions transport (N-0061; `f5bf5dc` / EV-0027). N-0059/N-0060/N-0062 are chartered findings. N-0053 public gate schema / N-0054 debt unresolved: no guessing/runtime reads. No identical AVD restart loop or Stage 0/1 rediscovery. Programme NOT complete; no final build started.
- **Deployment:** Supabase CLI confirms `delete-account` ACTIVE version 2 / verify_jwt=true (N-0055 update). The former undeployed/v1 notes are superseded; live throwaway wipe remains unverified.
- **N-0005:** `7dbeeb7`
- **N-0036 / N-0037 / N-0038 / N-0007 code:** `35e51a5`
- **Watch-alive:** invariant on N-0017 — opening the phone must not stop watch notifications/guidance.
- **Ledger run:** `R20260930A` for N-0023; obtain current revision from `python scripts/eif_node.py status`.

## Stage 0 baseline — R20260920D

- `git pull --ff-only`: already up to date at `4962b3f`. Worktree was dirty on arrival: `.cursorignore`, Supabase CLI temp metadata, two audit/release documents, plus untracked framework/design artifacts. Preserved; never bulk-staged.
- Typecheck passed. Dual-path Git Bash audit 27/27. Catalogue QA 357 rows and zero governance issues. Wrapper pytest 3/3 (run from repo root).
- Default thread-pool full Vitest encountered a source-scan timeout; next run completed 132 files / 807 tests with 3 failures (two mood import timeouts plus contamination from a timed-out test). Metro startup was concurrent. A 30-second thread run then stopped advancing after its first suite; terminated only that run. An isolated fork-pool full run is in progress. No assertion or test has been removed.
- Headless `Medium_Phone_API_36.1` booted; `sys.boot_completed=1`. Installed client 1.0.5 / vc15 / DEBUGGABLE confirmed. ADB reverse established. Metro started; paused for isolated tests. Correct dev-client scheme is `exp+reclaim-app`.
- Live Supabase SQL access works. Security advisors: two ERROR (the two program views), four mutable search-path warnings, exposed definer function grants, public `moddatetime`, and disabled leaked-password protection. No live migrations applied in this node.
- JOURNEYS.yaml now lists the requested AVD paths; all remain NOT_RUN until rendered evidence exists.
- **N-0044 final gates:** configured thread pool with `--testTimeout=30000` (no worker override; Metro stopped): **132 files / 807 tests PASS** in 248.93 s. Focused inventory 8/8. Typecheck 0. Dual-path rerun 27/27. Catalogue QA 357 rows / 0 issues; wrapper 3/3. Source diff check clean. `N-0052` retains the default-run instability for resolution before release.
- AVD capture `.eif/audit/stage0/avd.png` shows dev-client socket timeout plus System UI ANR; no product journey passed. Retry emulator and Metro once after the harness.

## Ledger snapshot

- **Revision:** 81
- **A0 commit:** `cf12b4d`
- **GATE 1 commit:** `aabab35`
- **N-0004:** rejected (child of N-0001)
- **N-0013:** complete (A3 harness + ROUTINE_AUDIT)
- **N-0011:** retitled F4; `depends_on` N-0020, N-0021, N-0022
- **N-0030:** **deferred** (D-0003; Lumen candidate, menu rejected)
- **N-0031:** split → N-0033, N-0034, N-0035
- **D-0001:** superseded by D-0003

## Nodes

| Node | Title | Status | Commit | Evidence | Next |
|---|---|---|---|---|---|
| N-0044 | S1 deployed account deletion inventory | validated/pushed; QUALITY_GATE blocker | 137055d | EV-0017; 807/807 | N-0053 public schema required |
| N-0045 | S1 schema snapshot and drift guard | validated/pushed; ledger gate closure pending | 1d00a28 | EV-0019; 26 live tables; full 824/824 | N-0053 blocker |
| N-0046 | S1 client account vs data deletion | source validated; confirmation/cancel renders obtained; full journey pending | c4f9d9e | EV-0020; 844/844; N-0056 retained renders | N-0047 throwaway erasure and final approval |
| N-0047 | S1 AVD throwaway deletion | blocked: verified operator-controlled throwaway email required | — | baseline/N0047_EMAIL_VERIFICATION_BLOCKER.md | remove unverified test user; verify controlled throwaway; resume five-domain journey |
| N-0048 | S1 program-view invoker security | applied and validated/pushed; ledger closure pending | ae7dff2 | EV-0022; live RLS probe twice; 880/880 | N-0053 gate contract |
| N-0049 | S1 function execution grants | applied and validated/pushed; ledger closure pending | 3838d21 | EV-0023; signup/RPC probes; 882/882 | N-0053 gate contract |
| N-0050 | S1 function search paths | applied and validated/pushed; ledger closure pending | 67ebba9 | EV-0024; probes; 884/884; advisors zero ERROR | N-0053 gate contract |
| N-0051 | S1 advisors and combined review | source finding fixed; still journey-blocked | b8c6a6e + N-0058 checkpoint | baseline/N0051_STAGE1_REVIEW.md; 900/900; prior 0 advisor ERROR | N-0056 / N-0047 runtime proof |
| N-0052 | Windows full-harness reproducibility | proposed | — | ESCALATION.md; acceptance/N-0052.txt | before final release gate |
| N-0053 | Wrapper public gate operations | blocked; public payload schema unavailable | 751c2b5 | EV-0018; 14/14 wrapper tests; baseline/N0053_WRAPPER_GATES.md | public contract needed |
| N-0054 | Historical gate debt reconciliation | proposed | — | public inspect health; ESCALATION.md | after N-0053 |
| N-0055 | Strict server missing-table classification | validated/pushed; deployed v2; gate closure pending | 70b9572 | EV-0021; 878/878 | N-0053 gate contract |
| N-0056 | AVD canonical Expo workflow | runtime recovered; ledger blocker stale because unblock event unsupported | d7610ac + current checkpoint | baseline/N0056_RETRY.md; local Home/Settings renders; native confirm hierarchy | N-0053 repair/replay; continue runtime journeys without restart |
| N-0057 | Public moddatetime warning review | proposed | — | acceptance/N-0057.txt | security follow-up / final human checks |
| N-0058 | Account-switch deletion / cleanup race | validated/pushed; visual/runtime approval queued | 638ccfb | EV-0026; baseline/N0058_ACCOUNT_IDENTITY.md; 900/900 | N-0056 renders / final review; no AVD claim |
| N-0059 | Notification cancellation authority | source-validated; device check queued; lease released | e228eef / EV-0044 | baseline/N0059_CANCELLATION.md; default 967/970; retry 970/970 | N-0066 rest-timer identity; do not complete from source tests |
| N-0060 | Intent write / acknowledgement races | source-validated; native check queued | `3f48798` / EV-0040 | acceptance/N-0060.txt | full 953/953; N-0066 producer race remains |
| N-0061 | Correct prohibited guided FGS transport | source-validated; device journey queued | 1cf0612 / EV-0043 | baseline/N0061_FGS_TRANSPORT.md; full 965/965 | human-check guided/rest/Done/Doze; N-0017 stays blocked |
| N-0062 | Mood post-save feedback / draft preservation | source-validated; visual acceptance queued | `1c05ff5` / EV-0038 | acceptance/N-0062.txt | full 930/930; no AVD journey claim |
| N-0063 | Live anonymous app_logs read exposure | proposed; release blocker; additional live approval required | — | acceptance/N-0063.txt; baseline/N0019_RLS_ASSESSMENT.md | source repair, authorized migration, synthetic probes |
| N-0064 | Hide add-med empty-state coaching when medications exist | source-validated; AVD re-check queued | `d5858d7` / EV-0039 | acceptance/N-0064.txt | full 941/941; personal renders not committed |
| N-0065 | Review unsupported health certainty in static insight copy | source validated with timeout allowance; visual acceptance queued; lease released | 70424cc / EV-0041 | baseline/N0065_INSIGHT_COPY_REVIEW.md; retry 953/953 | default 950/953 remains N-0052; N-0067 next source node |
| N-0066 | Bind rest-end timer promotion / dismissal to prompt identity | source-validated; device check queued; lease released | 202afd8 / EV-0045 | baseline/N0066_REST_TIMER.md; default 979/979 | do not complete from source tests |
| N-0067 | Neutral insight category headings | source-validated; ordinary and large-text cards captured; approval still open | 3739816 / EV-0042 | baseline/N0067_DEVICE_CHECK.md | named chemistry rules were not the active cards |
| N-0001 | N1-source-discovery | complete | 652b92b | EV-0001 PHASE_2 | — |
| N-0012 | N12-run-detection-harness | complete | 652b92b | EV-0001 PHASE_2 | — |
| N-0002 | N2-goal-setter-sweep-vitest | complete | 2f9a70c | EV-0002 | — |
| N-0003 | N3-retire-scheduler-split-dual-authority | complete | 995c98d | EV-0003 | — |
| N-0004 | N4-generator-science-audit | **rejected** | — | re-homed | N-0013 |
| N-0013 | N13-generator-science-audit | **complete** | aabab35 | EV-0006 ROUTINE_VOLUME_BASELINE | C-R F1 |
| N-0006 | N6-notification-single-writer | complete | 5cf9a2d | EV-0004 PHASE_3 | — |
| N-0008 | N8-edge-to-edge-insets | proposed **PARTIAL** | 2c59e74 | EV-0005 remaining 140 | C-I |
| N-0005 | N5-onboarding-source-of-truth | **complete** | 7dbeeb7 | EV-0010 resolveOnboardStatus.test.ts | wave 2 |
| N-0007 | N7-training-loading-query-truth | **AWAITING_APPROVAL** (in_progress) | 35e51a5 | EV-0014 activeSessionQueryTruth.test.ts | visual approve then complete |
| N-0009 | N9-ui-surface-enumeration | proposed | — | `docs/design/UI_AUDIT.md` | A2 shots |
| N-0010 | N10-HEAD-debug-dev-client | proposed (dumpsys VERIFIED) | aabab35 | `docs/eif/baseline/A2.md` | operator accept |
| N-0011 | C-R F4 weekly volume model | source-validated; muscle/week bands not defined, so not invented | 1698231 / EV-0049 | baseline/N0011_WEEKLY_VOLUME.md | N-0023; do not complete from source tests |
| N-0014 | C-N account-delete | **complete** | bde770f | EV-0008 personalDataTables.test.ts | — |
| N-0015 | C-N HC request-set | **complete** | dc37092 | EV-0009 healthConnectRequestSet.test.ts | — |
| N-0016 | C-G stale timer audit | **AWAITING_APPROVAL** (in_progress, rev 3) | 4735228 | EV-0015 staleSessionTimerDisplay.test.ts; renders UNABLE_TO_VERIFY (HUMAN_CHECKS) | visual approve then `complete` |
| N-0017 | C-N mid-guided notifs | blocked: actual transport contradicts invariant 5 | f5bf5dc | EV-0027; baseline/N0017_TRANSPORT_CONTRADICTION.md | N-0061; continue independent wave 2 |
| N-0018 | C-N mood submit lock | validated/pushed; visual review queued | 6787613 | EV-0028; baseline/N0018_MOOD_SAVE.md; 904/904 | N-0056 renders / final review |
| N-0019 | C-N RLS sleep policies | assessed/pushed; live app_logs exposure blocks security closure | 593dd9b | EV-0029; baseline/N0019_RLS_ASSESSMENT.md; 906/906 | N-0063 correction; continue independent nodes |
| N-0020 | C-R F1 taxonomy | source-validated; preview line not captured; lease released | 33ed4bb / EV-0046 | baseline/N0020_MUSCLE_TAXONOMY.md | N-0021; do not complete from source tests |
| N-0021 | C-R F2 wrapper | source-validated; quality-gate completion blocked; lease released | 115c134 / EV-0047 | baseline/N0021_PLAN_PATH.md | N-0022; do not claim the routine is scientifically correct |
| N-0022 | C-R F3 loads | source-validated; setup chips awaiting approval | edecd1c / EV-0048 | baseline/N0022_EXPERIENCE_LOADS.md | N-0011; do not claim the routine is scientifically correct |
| N-0023 | C-R F5 progression | source-validated; week multipliers and RIR targets not defined, so not invented | 8a00cb6 / EV-0050 | baseline/N0023_FOUR_WEEK_PROGRESSION.md | N-0024; do not complete from source tests |
| N-0024 | C-R F6 CI gate | source-validated; quality-gate completion blocked; lease to release | e515eb5 / EV-0051 | baseline/N0024_HARNESS_CI.md | N-0039; do not complete from source tests |
| N-0025 | C-G rest/Doze/FGS | proposed | — | depends N-0010 | after A2 |
| N-0026 | C-P permission off first render | source validated; actual Reclaim cold-start timing still unverified | da07c8b | EV-0033; 918/918; baseline/N0026_NOTIFICATION_FIRST_RENDER.md | canonical session currently unavailable; do not use Expo-launcher timing |
| N-0027 | C-T U5 Sentry | validated/pushed; QUALITY_GATE closure blocked | 429cee8 | EV-0035; baseline/N0027_U5_SENTRY_EVENTS.md; full 923/923 | N-0053 public verification contract; continue N-0028 |
| N-0028 | C-L associated-with | validated/pushed; visual approval queued | 942928d | EV-0036; baseline/N0028_ASSOCIATION_COPY.md; full 923/923 | final AVD review; continue N-0029 |
| N-0029 | C-H CRLF + memory files | source-validated; legacy System32 gate queued | `c8be0ed` / EV-0037 | AA-13 | Git Bash 27/27, full 923; WSL lacks rg; lease released |
| N-0030 | C-D UI direction | **deferred** D-0003 | — | DESIGN_EXPERIENCE_RECORD | unpark grant |
| N-0031 | C-F features | **split** | — | GATE1-FEATURES | N-0033–35 |
| N-0032 | C-M med curation-tier | validated/pushed; visual review queued | 7f0c289 | EV-0030; baseline/N0032_MED_REVIEW_TIER.md; 918/918 | N-0056 renders / final review |
| N-0033 | C-F Home why-this-session | proposed; latest operator scope includes existing UI | — | CHARTER plus operator wave-6 mandate | do not unpark N-0030 production chrome |
| N-0034 | C-F technique illustrations | proposed | — | CHARTER | later |
| N-0035 | C-F association chips | proposed | — | CHARTER | wave 2+ |
| N-0036 | C-N HC declared=requested=used | **complete** | 35e51a5 | EV-0011 healthConnectPermissionUse.test.ts | — |
| N-0037 | C-N server-side account deletion | complete (code); follow-up deployment ACTIVE v2 confirmed under N-0055 | 35e51a5, 4bd2bd5 | EV-0012 / EV-0016; live erasure unverified | N-0044–47 follow-ups |
| N-0038 | C-H Design Lab __DEV__-only | **complete** | 35e51a5 | EV-0013 designLabDevOnly.test.ts | — |
| N-0039 | R0 session calorie SoT | source-validated; quality-gate completion blocked; watch re-read in HUMAN_CHECKS | 303a7f4 / EV-0052 | baseline/N0039_SESSION_CALORIES.md | N-0041; do not complete from source tests |
| N-0040 | R1 training modes | proposed | — | CHARTER | after N-0021 |
| N-0041 | R2 running design | proposed | — | CHARTER | after N-0013 |
| N-0042 | R3 running build | proposed | — | CHARTER | after N-0040/41/06/37 |
| N-0043 | R4 Wear OS proposal only | proposed | — | CHARTER | after N-0042 |

## A1–A7 / B status

| Step | Status | Evidence |
|---|---|---|
| A0 ledger | done | `cf12b4d` |
| A1 baseline | done | `docs/eif/baseline/A1_BASELINE.md` |
| A2 N-0010 AVD | dumpsys **VERIFIED**; logged-in UI **UNABLE_TO_VERIFY** | `docs/eif/baseline/A2.md` |
| A3 routine harness + audit | done | `docs/training/ROUTINE_VOLUME_BASELINE.md`, `ROUTINE_AUDIT.md` |
| A4 APP_AUDIT | done | `docs/eif-bootstrap/APP_AUDIT.md` |
| A5 UI_AUDIT | source done; visual **UNABLE_TO_VERIFY** | `docs/design/UI_AUDIT.md` |
| A6 three directions | Design Lab + Lumen/Pulse high-fidelity; C-D parked | `docs/design/DIRECTIONS.md`, `.eif/audit/N-0030/` |
| A7 MARKET_AUDIT | done | `docs/product/MARKET_AUDIT.md` |
| B charter | done | `docs/eif/CHARTER.md` |
| C execute | **in progress** — corrections N-0036–38 done; N-0007 + N-0016 AWAITING_APPROVAL; wave 2 next **N-0017** | — |
| Close-out 2026-09-20 | wrapper `scripts/eif_node.py` + pytest smoke; `AGENTS.md` canonical; `CLAUDE.md`, `app/CLAUDE.md`, `RESUME.md`; `EIF_FRAMEWORK_DEFECTS.md` (engine.py pristine); CHARTER Stage C addendum (43/43 nodes) | this commit |

## Ledger mutation log (scripts/eif_node.py)

- `2026-09-20T11:04:32Z` run `R20260920C` — node.lease.acquire N-0016 lease acquired
- `2026-09-20T11:04:34Z` run `R20260920C` — evidence.add EV-0015 for N-0016 @ 4735228 (app/src/lib/training/__tests__/staleSessionTimerDisplay.test.ts)
- `2026-09-20T11:04:36Z` run `R20260920C` — node.stage_note N-0016 AWAITING_APPROVAL renders=.eif\audit\N-0016
- `2026-09-20T11:04:37Z` run `R20260920C` — node.lease.release N-0016 lease released
- `2026-09-20T11:05:44Z` run `R20260920C` — evidence.add EV-0016 for N-0037 @ 4bd2bd5 (app/src/lib/__tests__/personalDataTables.test.ts)
- `2026-09-20T15:19:58Z` run `R20260920D` — node.add N-0044 “S1 deployed account deletion inventory alignment” class=feature risk=R2
- `2026-09-20T15:20:45Z` run `R20260920D` — node.lease.acquire N-0044 lease acquired
- `2026-09-20T15:29:29Z` run `R20260920D` — node.add N-0045 “S1 live user-keyed schema snapshot and drift guard” class=feature risk=R2
- `2026-09-20T15:29:49Z` run `R20260920D` — node.add N-0046 “S1 separate account deletion and data reset” class=feature risk=R2
- `2026-09-20T15:29:51Z` run `R20260920D` — node.add N-0047 “S1 throwaway account deletion AVD journey” class=human risk=R2
- `2026-09-20T15:29:52Z` run `R20260920D` — node.add N-0048 “S1 security-invoker program views” class=feature risk=R2
- `2026-09-20T15:29:54Z` run `R20260920D` — node.add N-0049 “S1 restrict security-definer function execution” class=feature risk=R2
- `2026-09-20T15:29:56Z` run `R20260920D` — node.add N-0050 “S1 pin flagged function search paths” class=feature risk=R2
- `2026-09-20T15:29:57Z` run `R20260920D` — node.add N-0051 “S1 security advisors and combined verification” class=observation risk=R2
- `2026-09-20T15:37:36Z` run `R20260920D` — node.add N-0052 “Windows full-harness reproducibility” class=feature risk=R1
- `2026-09-20T15:40:54Z` run `R20260920D` — evidence.add EV-0017 for N-0044 @ 137055d (docs/eif/baseline/N0044_DELETE_INVENTORY.md)
- `2026-09-20T15:40:56Z` run `R20260920D` — node.accept N-0044 accepted
- `2026-09-20T15:42:03Z` run `R20260920D` — node.add N-0053 “Wrapper public quality and verification gate support” class=feature risk=R1
- `2026-09-20T15:42:07Z` run `R20260920D` — node.lease.release N-0044 lease released
- `2026-09-20T15:42:11Z` run `R20260920D` — node.lease.acquire N-0053 lease acquired
- `2026-09-20T20:14:31Z` run `R20260920D` — node.add N-0054 “Reconcile historical programme gate debt” class=feature risk=R2
- `2026-09-20T20:14:33Z` run `R20260920D` — node.stage_note N-0053: Record missing public gate schema blocker; continue independent work
- `2026-09-20T20:15:02Z` run `R20260920D` — node.blocker.open N-0053: Missing public gate payload contract
- `2026-09-20T20:15:16Z` run `R20260920D` — evidence.add EV-0018 for N-0053 @ 751c2b5 (docs/eif/baseline/N0053_WRAPPER_GATES.md)
- `2026-09-20T20:15:18Z` run `R20260920D` — node.lease.acquire N-0045 lease acquired
- `2026-09-20T20:24:58Z` run `R20260920D` — node.add N-0055 “S1 fail closed on deletion schema errors” class=feature risk=R2
- `2026-09-20T20:29:36Z` run `R20260920D` — evidence.add EV-0019 for N-0045 @ 1d00a28 (docs/eif/baseline/N0045_SCHEMA_DRIFT.md)
- `2026-09-20T20:29:53Z` run `R20260920D` — node.stage_note N-0045: N-0045 source validated; gate closure pending N-0053
- `2026-09-20T20:29:55Z` run `R20260920D` — node.lease.release N-0045 lease released
- `2026-09-20T20:29:56Z` run `R20260920D` — node.lease.acquire N-0046 lease acquired
- `2026-09-20T20:41:12Z` run `R20260920D` — node.stage_note N-0046 HUMAN_CHECK steps=N0046_DEVICE_CHECK.md
- `2026-09-20T20:41:23Z` run `R20260920D` — node.add N-0056 “Restore bounded AVD dev-client journeys after repeat ANR” class=feature risk=R1
- `2026-09-20T20:42:09Z` run `R20260920D` — node.stage_note N-0046 AWAITING_APPROVAL renders=.eif\audit\N-0046\product-renders (UNABLE_TO_VERIFY — renders missing)
- `2026-09-20T20:42:10Z` run `R20260920D` — node.lease.release N-0046 lease released
- `2026-09-21T08:50:47Z` run `R20260920D` — evidence.add EV-0020 for N-0046 @ c4f9d9e (docs/eif/baseline/N0046_CLIENT_DELETION.md)
- `2026-09-21T08:50:49Z` run `R20260920D` — node.lease.acquire N-0055 lease acquired
- `2026-09-21T08:55:00Z` run `R20260920D` — node.lease.acquire N-0047 lease acquired
- `2026-09-21T08:55:02Z` run `R20260920D` — node.blocker.open N-0047: AVD journey blocked after prescribed restart; continue security nodes
- `2026-09-21T08:56:34Z` run `R20260920D` — evidence.add EV-0021 for N-0055 @ 70b9572 (docs/eif/baseline/N0055_SERVER_ERRORS.md)
- `2026-09-21T08:56:36Z` run `R20260920D` — node.stage_note N-0055: N-0055 validated/deployed; completion gate contract pending
- `2026-09-21T08:56:38Z` run `R20260920D` — node.lease.release N-0055 lease released
- `2026-09-21T08:56:39Z` run `R20260920D` — node.lease.acquire N-0048 lease acquired
- `2026-09-21T09:03:44Z` run `R20260920D` — evidence.add EV-0022 for N-0048 @ ae7dff2 (docs/eif/baseline/N0048_VIEW_SECURITY.md)
- `2026-09-21T09:03:46Z` run `R20260920D` — node.stage_note N-0048: N-0048 validated/applied; gate contract pending
- `2026-09-21T09:03:47Z` run `R20260920D` — node.lease.release N-0048 lease released
- `2026-09-21T09:03:50Z` run `R20260920D` — node.lease.acquire N-0049 lease acquired
- `2026-09-21T09:09:29Z` run `R20260920D` — evidence.add EV-0023 for N-0049 @ 3838d21 (docs/eif/baseline/N0049_FUNCTION_GRANTS.md)
- `2026-09-21T09:09:31Z` run `R20260920D` — node.stage_note N-0049: N-0049 applied/validated; gate contract pending
- `2026-09-21T09:09:32Z` run `R20260920D` — node.lease.release N-0049 lease released
- `2026-09-21T09:09:34Z` run `R20260920D` — node.lease.acquire N-0050 lease acquired
- `2026-09-21T09:12:04Z` run `R20260920D` — node.add N-0057 “Assess public moddatetime extension warning and dependencies” class=observation risk=R1
- `2026-09-21T09:15:12Z` run `R20260920D` — evidence.add EV-0024 for N-0050 @ 67ebba9 (docs/eif/baseline/N0050_SEARCH_PATHS.md)
- `2026-09-21T09:15:14Z` run `R20260920D` — node.stage_note N-0050: N-0050 applied/validated; gate contract pending
- `2026-09-21T09:15:18Z` run `R20260920D` — node.lease.release N-0050 lease released
- `2026-09-21T09:15:20Z` run `R20260920D` — node.lease.acquire N-0051 lease acquired
- `2026-09-21T09:17:08Z` run `R20260920D` — node.add N-0058 “Bind account deletion and cleanup to confirmed identity across auth races” class=feature risk=R2
- `2026-09-21T09:17:11Z` run `R20260920D` — node.stage_note N-0051 HUMAN_CHECK steps=N0051_HUMAN_CHECKS.md
- `2026-09-21T09:21:53Z` run `R20260920D` — evidence.add EV-0025 for N-0051 @ b8c6a6e (docs/eif/baseline/N0051_STAGE1_REVIEW.md)
- `2026-09-21T09:21:56Z` run `R20260920D` — node.blocker.open N-0051: N-0051 review recorded; journey blocked and N-0058 scheduled next
- `2026-09-21T14:07:59Z` run `R20260921A` — node.lease.acquire N-0058 lease acquired
- `2026-09-21T14:19:45Z` run `R20260921A` — node.stage_note N-0058 HUMAN_CHECK steps=N0058_DEVICE_CHECK.md
- `2026-09-21T14:24:40Z` run `R20260921A` — node.add N-0059 “Centralize native notification cancellation and remove cancel-all escape path” class=feature risk=R2
- `2026-09-21T14:24:46Z` run `R20260921A` — node.add N-0060 “Serialize notification intent writes and bind delivery acknowledgements to prompt identity” class=feature risk=R2
- `2026-09-21T14:31:50Z` run `R20260921A` — evidence.add EV-0026 for N-0058 @ 638ccfb (docs/eif/baseline/N0058_ACCOUNT_IDENTITY.md)
- `2026-09-21T14:31:52Z` run `R20260921A` — node.stage_note N-0058 AWAITING_APPROVAL renders=.eif\audit\N-0058 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-21T14:31:55Z` run `R20260921A` — node.lease.release N-0058 lease released
- `2026-09-21T14:31:57Z` run `R20260921A` — node.add N-0061 “Replace prohibited guided background-actions transport with one native FGS” class=feature risk=R2
- `2026-09-21T14:31:59Z` run `R20260921A` — node.lease.acquire N-0017 lease acquired
- `2026-09-21T14:32:59Z` run `R20260921A` — node.blocker.open N-0017: Native transport contradicts invariant 5; corrective N-0061 chartered; continue N-0018
- `2026-09-21T14:33:43Z` run `R20260921A` — evidence.add EV-0027 for N-0017 @ f5bf5dc (docs/eif/baseline/N0017_TRANSPORT_CONTRADICTION.md)
- `2026-09-21T14:33:45Z` run `R20260921A` — node.lease.acquire N-0018 lease acquired
- `2026-09-21T14:35:51Z` run `R20260921A` — node.add N-0062 “Preserve mood drafts and distinguish post-save refresh failure from failed persistence” class=feature risk=R1
- `2026-09-21T14:37:25Z` run `R20260921A` — node.stage_note N-0018 HUMAN_CHECK steps=N0018_DEVICE_CHECK.md
- `2026-09-21T19:04:45Z` run `R20260921A` — evidence.add EV-0028 for N-0018 @ 6787613 (docs/eif/baseline/N0018_MOOD_SAVE.md)
- `2026-09-21T19:04:47Z` run `R20260921A` — node.stage_note N-0018 AWAITING_APPROVAL renders=.eif\audit\N-0018 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-21T19:04:49Z` run `R20260921A` — node.lease.release N-0018 lease released
- `2026-09-21T19:04:50Z` run `R20260921A` — node.lease.acquire N-0019 lease acquired
- `2026-09-21T19:07:24Z` run `R20260921A` — node.add N-0063 “Close live anonymous app_logs SELECT exposure and repair unsafe SQL recipe” class=feature risk=R2
- `2026-09-21T19:07:26Z` run `R20260921A` — node.stage_note N-0019 HUMAN_CHECK steps=N0019_HUMAN_CHECKS.md
- `2026-09-21T19:11:55Z` run `R20260921A` — node.blocker.open N-0019: Sleep policies observed; live app_logs anonymous SELECT exposure chartered N-0063; continue N-0032
- `2026-09-21T19:12:33Z` run `R20260921A` — evidence.add EV-0029 for N-0019 @ 593dd9b (docs/eif/baseline/N0019_RLS_ASSESSMENT.md)
- `2026-09-21T19:12:35Z` run `R20260921A` — node.lease.acquire N-0032 lease acquired
- `2026-09-21T19:16:13Z` run `R20260921A` — node.stage_note N-0032 HUMAN_CHECK steps=N0032_DEVICE_CHECK.md
- `2026-09-21T19:21:22Z` run `R20260921A` — evidence.add EV-0030 for N-0032 @ 7f0c289 (docs/eif/baseline/N0032_MED_REVIEW_TIER.md)
- `2026-09-21T19:21:24Z` run `R20260921A` — node.stage_note N-0032 AWAITING_APPROVAL renders=.eif\audit\N-0032 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-21T19:21:25Z` run `R20260921A` — node.lease.release N-0032 lease released
- `2026-09-21T19:36:50Z` run `R20260921B` — node.lease.acquire N-0056 lease acquired
- `2026-09-21T19:40:16Z` run `R20260921B` — node.stage_note N-0056 HUMAN_CHECK steps=N0056_RETRY.md
- `2026-09-21T19:40:19Z` run `R20260921B` — node.lease.release N-0056 lease released
- `2026-09-21T20:01:01Z` run `R20260921C` — node.lease.acquire N-0056 lease acquired
- `2026-09-22T07:22:08Z` run `R20260921C` — node.blocker.open N-0056: post-uninstall reinstall still cannot load Reclaim; operator stop
- `2026-09-22T10:50:38Z` run `R20260922A` — evidence.add EV-0031 for N-0056 @ 04f2e84 (docs/eif/baseline/N0056_RETRY.md)
- `2026-09-22T10:50:41Z` run `R20260922A` — evidence.add EV-0032 for N-0046 @ 04f2e84 (docs/eif/baseline/N0046_AVD_REVIEW.md)
- `2026-09-22T11:00:05Z` run `R20260922A` — node.stage_note N-0047 HUMAN_CHECK steps=N0047_EMAIL_VERIFICATION_BLOCKER.md
- `2026-09-22T11:00:10Z` run `R20260922A` — node.blocker.open N-0047: verified throwaway email required
- `2026-09-22T11:04:15Z` run `R20260922A` — node.lease.acquire N-0026 lease acquired
- `2026-09-22T11:22:22Z` run `R20260922A` — node.stage_note N-0026 HUMAN_CHECK steps=N0026_NOTIFICATION_FIRST_RENDER.md
- `2026-09-22T11:22:24Z` run `R20260922A` — node.blocker.open N-0026: ADB product-render timing blocked by malformed Metro multipart response; operator reset required
- `2026-09-22T11:28:41Z` run `R20260922A` — evidence.add EV-0033 for N-0026 @ da07c8b (app/src/startup/__tests__/notificationStartupGate.test.ts)
- `2026-09-22T16:00:59Z` run `R20260922B` — evidence.add EV-0034 for N-0056 @ b011c80 (docs/eif/baseline/N0056_RETRY.md)
- `2026-09-22T18:38:14Z` run `R20260922B` — node.add N-0064 “Hide add-med empty-state coaching when medications exist” class=feature risk=R1
- `2026-09-22T18:50:21Z` run `R20260922B` — node.lease.acquire N-0027 lease acquired
- `2026-09-28T07:21:17Z` run `R20260922B` — node.lease.release N-0027 lease released
- `2026-09-28T07:21:19Z` run `R20260922B` — node.lease.acquire N-0027 lease acquired
- `2026-09-28T07:22:41Z` run `R20260922B` — evidence.add EV-0035 for N-0027 @ 429cee8 (docs/eif/baseline/N0027_U5_SENTRY_EVENTS.md)
- `2026-09-28T07:22:43Z` run `R20260922B` — node.accept N-0027 accepted
- `2026-09-28T07:36:00Z` run `R20260922B` — node.lease.release N-0027 lease released
- `2026-09-28T07:39:41Z` run `R20260922B` — node.lease.acquire N-0028 lease acquired
- `2026-09-28T07:42:02Z` run `R20260922B` — node.add N-0065 “Review unsupported health certainty in static insight copy” class=feature risk=R2
- `2026-09-28T08:56:05Z` run `R20260922B` — node.stage_note N-0028 HUMAN_CHECK steps=N0028_DEVICE_CHECK.md
- `2026-09-28T10:30:03Z` run `R20260922B` — evidence.add EV-0036 for N-0028 @ 942928d (docs/eif/baseline/N0028_ASSOCIATION_COPY.md)
- `2026-09-28T10:30:05Z` run `R20260922B` — node.stage_note N-0028 AWAITING_APPROVAL renders=.eif\audit\N-0028 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-28T10:30:06Z` run `R20260922B` — node.lease.release N-0028 lease released
- `2026-09-28T10:45:36Z` run `R20260922B` — node.lease.acquire N-0029 lease acquired
- `2026-09-28T11:24:34Z` run `R20260922B` — node.stage_note N-0029 HUMAN_CHECK steps=N0029_SYSTEM32_CHECK.md
- `2026-09-28T12:25:35Z` run `R20260922B` — evidence.add EV-0037 for N-0029 @ c8be0ed (docs/eif/baseline/N0029_AUDIT_HYGIENE.md)
- `2026-09-28T12:25:37Z` run `R20260922B` — node.lease.release N-0029 lease released
- `2026-09-28T12:26:17Z` run `R20260922B` — node.lease.acquire N-0062 lease acquired
- `2026-09-28T12:30:52Z` run `R20260922B` — node.stage_note N-0062 HUMAN_CHECK steps=N0062_DEVICE_CHECK.md
- `2026-09-28T12:33:23Z` run `R20260922B` — evidence.add EV-0038 for N-0062 @ 1c05ff5 (docs/eif/baseline/N0062_MOOD_SAVE.md)
- `2026-09-28T12:33:25Z` run `R20260922B` — node.stage_note N-0062 AWAITING_APPROVAL renders=.eif\audit\N-0062 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-28T12:33:26Z` run `R20260922B` — node.lease.release N-0062 lease released
- `2026-09-28T12:33:34Z` run `R20260922B` — node.lease.acquire N-0064 lease acquired
- `2026-09-28T12:37:27Z` run `R20260922B` — node.stage_note N-0064 HUMAN_CHECK steps=N0064_DEVICE_CHECK.md
- `2026-09-28T12:40:45Z` run `R20260922B` — evidence.add EV-0039 for N-0064 @ d5858d7 (docs/eif/baseline/N0064_MEDS_COACH.md)
- `2026-09-28T12:40:47Z` run `R20260922B` — node.stage_note N-0064 AWAITING_APPROVAL renders=.eif\audit\N-0064 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-28T12:40:49Z` run `R20260922B` — node.lease.release N-0064 lease released
- `2026-09-28T12:40:55Z` run `R20260922B` — node.lease.acquire N-0060 lease acquired
- `2026-09-28T12:48:00Z` run `R20260922B` — node.add N-0066 “Bind rest-end timer promotion and dismissal to current prompt identity” class=feature risk=R2
- `2026-09-28T12:49:58Z` run `R20260922B` — node.stage_note N-0060 HUMAN_CHECK steps=N0060_DEVICE_CHECK.md
- `2026-09-28T12:52:30Z` run `R20260922B` — evidence.add EV-0040 for N-0060 @ 3f48798 (docs/eif/baseline/N0060_INTENT_RACES.md)
- `2026-09-28T12:52:32Z` run `R20260922B` — node.stage_note N-0060 AWAITING_APPROVAL renders=.eif\audit\N-0060 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-28T12:52:34Z` run `R20260922B` — node.lease.release N-0060 lease released
- `2026-09-28T18:37:28Z` run `R20260928A` — node.lease.acquire N-0065 lease acquired
- `2026-09-28T18:49:26Z` run `R20260928A` — node.add N-0067 “Replace unsupported insight category headings with neutral labels” class=feature risk=R2
- `2026-09-28T18:51:17Z` run `R20260928A` — node.stage_note N-0065 HUMAN_CHECK steps=N0065_DEVICE_CHECK.md
- `2026-09-29T07:18:57Z` run `R20260928A` — node.lease.release N-0065 lease released
- `2026-09-29T07:19:02Z` run `R20260928A` — node.lease.acquire N-0065 lease acquired
- `2026-09-29T07:20:51Z` run `R20260928A` — evidence.add EV-0041 for N-0065 @ 70424cc (docs/eif/baseline/N0065_INSIGHT_COPY_REVIEW.md)
- `2026-09-29T07:20:59Z` run `R20260928A` — node.stage_note N-0065 AWAITING_APPROVAL renders=.eif\audit\N-0065\product-renders (UNABLE_TO_VERIFY — renders missing)
- `2026-09-29T07:21:04Z` run `R20260928A` — node.lease.release N-0065 lease released
- `2026-09-29T10:49:00Z` run `R20260929A` — node.lease.acquire N-0067 lease acquired
- `2026-09-29T11:04:08Z` run `R20260929A` — evidence.add EV-0042 for N-0067 @ 3739816 (docs/eif/baseline/N0067_CATEGORY_HEADINGS.md)
- `2026-09-29T11:04:10Z` run `R20260929A` — node.stage_note N-0067 HUMAN_CHECK steps=N0067_DEVICE_CHECK.md
- `2026-09-29T11:04:12Z` run `R20260929A` — node.stage_note N-0067 AWAITING_APPROVAL renders=.eif\audit\N-0067\product-renders (UNABLE_TO_VERIFY — renders missing)
- `2026-09-29T11:04:14Z` run `R20260929A` — node.lease.release N-0067 lease released
- `2026-09-29T12:27:26Z` run `R20260929B` — node.lease.acquire N-0061 lease acquired
- `2026-09-29T12:44:15Z` run `R20260929B` — node.lease.release N-0061 lease released
- `2026-09-29T12:44:18Z` run `R20260929B` — node.lease.acquire N-0061 lease acquired
- `2026-09-29T13:04:52Z` run `R20260929B` — node.lease.release N-0061 lease released
- `2026-09-29T13:05:00Z` run `R20260929B` — node.lease.acquire N-0061 lease acquired
- `2026-09-29T13:14:17Z` run `R20260929B` — evidence.add EV-0043 for N-0061 @ 1cf0612 (docs/eif/baseline/N0061_FGS_TRANSPORT.md)
- `2026-09-29T13:14:19Z` run `R20260929B` — node.stage_note N-0061 HUMAN_CHECK steps=N0061_HUMAN_STEPS.md
- `2026-09-29T13:14:44Z` run `R20260929B` — node.lease.release N-0061 lease released
- `2026-09-29T13:50:50Z` run `R20260929C` — node.lease.acquire N-0059 lease acquired
- `2026-09-29T14:39:25Z` run `R20260929C` — evidence.add EV-0044 for N-0059 @ e228eef (docs/eif/baseline/N0059_CANCELLATION.md)
- `2026-09-29T14:39:37Z` run `R20260929C` — node.stage_note N-0059 HUMAN_CHECK steps=N0059_DEVICE_CHECK.md
- `2026-09-29T14:39:41Z` run `R20260929C` — node.stage_note N-0059 AWAITING_APPROVAL renders=.eif\audit\N-0059 (UNABLE_TO_VERIFY — renders missing)
- `2026-09-29T14:39:45Z` run `R20260929C` — node.lease.release N-0059 lease released
- `2026-09-29T14:41:41Z` run `R20260929C` — node.lease.acquire N-0066 lease acquired
- `2026-09-29T14:54:07Z` run `R20260929C` — evidence.add EV-0045 for N-0066 @ 202afd8 (docs/eif/baseline/N0066_REST_TIMER.md)
- `2026-09-29T14:54:21Z` run `R20260929C` — node.stage_note N-0066 HUMAN_CHECK steps=N0066_DEVICE_CHECK.md
- `2026-09-29T14:54:26Z` run `R20260929C` — node.lease.release N-0066 lease released
- `2026-09-29T15:18:17Z` run `R20260929D` — node.lease.acquire N-0020 lease acquired
- `2026-09-29T15:47:37Z` run `R20260929D` — evidence.add EV-0046 for N-0020 @ 33ed4bb (docs/eif/baseline/N0020_MUSCLE_TAXONOMY.md)
- `2026-09-29T15:47:52Z` run `R20260929D` — node.stage_note N-0020 HUMAN_CHECK steps=N0020_DEVICE_CHECK.md
- `2026-09-29T15:47:55Z` run `R20260929D` — node.stage_note N-0020 AWAITING_APPROVAL renders=.eif\audit\N-0020\product-renders (UNABLE_TO_VERIFY — renders missing)
- `2026-09-29T15:47:58Z` run `R20260929D` — node.lease.release N-0020 lease released
- `2026-09-29T20:55:57Z` run `R20260929E` — node.lease.acquire N-0021 lease acquired
- `2026-09-29T21:26:59Z` run `R20260929E` — evidence.add EV-0047 for N-0021 @ 115c134 (docs/eif/baseline/N0021_PLAN_PATH.md)
- `2026-09-29T21:27:13Z` run `R20260929E` — node.accept N-0021 accepted
- `2026-09-29T21:27:22Z` run `R20260929E` — node.lease.release N-0021 lease released
- `2026-09-29T21:33:53Z` run `R20260929F` — node.lease.acquire N-0022 lease acquired
- `2026-09-29T21:48:41Z` run `R20260929F` — evidence.add EV-0048 for N-0022 @ edecd1c (docs/eif/baseline/N0022_EXPERIENCE_LOADS.md)
- `2026-09-29T21:48:59Z` run `R20260929F` — node.stage_note N-0022 AWAITING_APPROVAL renders=.eif\audit\N-0022
- `2026-09-29T21:49:05Z` run `R20260929F` — node.lease.release N-0022 lease released
- `2026-09-29T22:03:08Z` run `R20260929G` — node.lease.acquire N-0011 lease acquired
- `2026-09-29T22:28:51Z` run `R20260929G` — node.lease.release N-0011 lease released
- `2026-09-29T22:28:56Z` run `R20260929G` — node.lease.acquire N-0011 lease acquired
- `2026-09-29T22:31:41Z` run `R20260929G` — evidence.add EV-0049 for N-0011 @ 1698231 (docs/eif/baseline/N0011_WEEKLY_VOLUME.md)
- `2026-09-29T22:32:03Z` run `R20260929G` — node.lease.release N-0011 lease released
- `2026-09-29T22:52:23Z` run `R20260930A` — node.lease.acquire N-0023 lease acquired
- `2026-09-29T23:16:33Z` run `R20260930A` — evidence.add EV-0050 for N-0023 @ 8a00cb6 (docs/eif/baseline/N0023_FOUR_WEEK_PROGRESSION.md)
- `2026-09-29T23:17:06Z` run `R20260930A` — node.stage_note N-0023: Source-validated. Week multipliers and RIR targets were not invented. Do not complete from source tests.
- `2026-09-29T23:17:13Z` run `R20260930A` — node.lease.release N-0023 lease released
- `2026-09-29T23:19:22Z` run `R20260930A` — node.lease.acquire N-0024 lease acquired
- `2026-09-29T23:43:37Z` run `R20260930A` — node.lease.release N-0024 lease released
- `2026-09-29T23:43:43Z` run `R20260930A` — node.lease.acquire N-0024 lease acquired
- `2026-09-29T23:53:31Z` run `R20260930A` — evidence.add EV-0051 for N-0024 @ e515eb5 (docs/eif/baseline/N0024_HARNESS_CI.md)
- `2026-09-29T23:53:48Z` run `R20260930A` — node.accept N-0024 accepted
- `2026-09-29T23:54:22Z` run `R20260930A` — node.lease.release N-0024 lease released
- `2026-09-30T07:34:31Z` run `R20260930B` — node.lease.acquire N-0039 lease acquired
- `2026-09-30T07:53:45Z` run `R20260930B` — node.lease.release N-0039 lease released
- `2026-09-30T07:53:49Z` run `R20260930B` — node.lease.acquire N-0039 lease acquired
- `2026-09-30T08:05:08Z` run `R20260930B` — node.lease.release N-0039 lease released
- `2026-09-30T08:05:27Z` run `R20260930B` — node.lease.acquire N-0039 lease acquired
- `2026-09-30T08:13:39Z` run `R20260930B` — evidence.add EV-0052 for N-0039 @ 303a7f4 (docs/eif/baseline/N0039_SESSION_CALORIES.md)
- `2026-09-30T08:13:58Z` run `R20260930B` — node.accept N-0039 accepted
- `2026-09-30T08:14:15Z` run `R20260930B` — node.stage_note N-0039 HUMAN_CHECK steps=N0039_HUMAN_CHECK.md
- `2026-09-30T08:14:18Z` run `R20260930B` — node.lease.release N-0039 lease released
