# Human checks — PRG-20260917T222550

Device, Play Console, and live-DB steps the agent cannot complete. Continue the programme; do not block other nodes on these.

**2026-09-21 deployment update:** N-0055 deployed delete-account version 2 (ACTIVE, verify_jwt=true) with strict required-table error handling. Earlier v1 deployment observations below are historical. N-0047's live wipe remains unverified because the AVD retry failed; do not redeploy v1.

## N-0016 stale session timer — AVD renders

Agent state 2026-09-20: `emulator-5554` was attached but `pm`/`window` services were unreachable (`Can't find service: package`), and no signed-in account with a >5h-old open guided session exists on it. Renders **UNABLE_TO_VERIFY**; `.eif/audit/N-0016/` is empty.

Capture (HEAD debug client, signed in):

1. Start a guided session, log one set, then background the app.
2. Make the session stale without waiting: `adb shell su 0 date 010112002027` on a rooted AVD, **or** set `EXPO_PUBLIC_STALE_SESSION_MINUTES=1` in `app/.env` and rebuild the dev client, wait 2 min.
3. Reopen Training. Expect the dialog **Resume this session?** with buttons **Minimize / Save & close / Resume**, and the header clock reading **Paused** (not hours).
4. `adb exec-out screencap -p > .eif/audit/N-0016/stale-dialog.png`
5. Tap outside the dialog → expect return to the Today list (session still open). Screenshot `stale-minimize.png`.
6. Reopen the session, tap **Resume** → clock starts from `0:00`. Screenshot `stale-resumed.png`.
7. Reply **approve N-0016** or **reject N-0016** in `docs/eif/AWAITING_APPROVAL.md`.

Use `adb` from `%LOCALAPPDATA%\Android\Sdk\platform-tools\` (not on PATH). Do not use PowerShell `>` for the PNG; use `cmd /c` or `adb pull`.

## N-0037 server-side account deletion

**Deployment status (rechecked 2026-09-20, R20260920D):** `delete-account` is ACTIVE, version 1, `verify_jwt=true`, confirmed with `npx --yes supabase functions list --project-ref bgtosdgrvjwlpqxqjvdf`. This supersedes the earlier undeployed observation. N-0044 aligns the repository inventory with the five priority tables reported by the operator. Live throwaway-account deletion remains unverified.

1. Deployment is confirmed; use the deployed `delete-account` for the throwaway-account check below.
2. Create a **throwaway test user** (not a real account). Seed at least one row in `training_events` plus one training session.
3. Sign in as that user → Data & Privacy → delete account.
4. From `app/`:

```
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role>"
$env:DELETED_USER_ID="<uuid>"
npx tsx scripts/verify-account-deletion.ts
```

Expect exit 0 with `OK zero rows across ... keys; auth user is gone`. N-0045's verifier checks every snapshot user key, rejects missing snapshot tables and unknown counts, and requires a confirmed absent auth user. Only reserved optional tables absent from the snapshot may be explicitly skipped.

## R0 calorie source-of-truth (phone + watch)

Why a session may show no calories after a watch-worn workout. Ranked hypotheses:

- (a) never requested
- (b) the watch app syncs to Health Connect late or not at all
- (c) the app never reads calories for the session window
- (d) it reads once, before sync, and never re-reads

**Cheapest discriminating test (your phone):**

1. Wear the watch, complete a Reclaim guided session (note `started_at` / `ended_at` from session history).
2. Open Health Connect → App permissions → Reclaim. Confirm Active calories + Heart rate are allowed.
3. In Health Connect (or Samsung Health / Wear companion), confirm an ActiveCaloriesBurned and HeartRate record exists overlapping that window. If they appear minutes later, (b) is confirmed.
4. Foreground Reclaim after that sync. If calories appear only then, (d) is confirmed. If they never appear despite HC records, (c) remains.
5. Optional ADB (when HEAD debug client is installed):

```
adb logcat -d | findstr /i "HealthConnect session window energy"
```

Record which of (a)–(d) you observed. Do not invent per-set calories if HC records are session-wide.

## C-G guided smoke / Doze / OEM FGS (N-0025)

Requires HEAD debug client (N-0010) on a real device.

1. Start a guided session, lock the phone, confirm rest-end / next-set still fire.
2. `adb shell dumpsys deviceidle force-idle` then wait for the next rest-end. Confirm FGS notification stays.
3. On an OEM device with aggressive battery (Samsung/Xiaomi): start guided, leave the app 15+ minutes. Confirm FGS not killed. If killed, capture `adb shell dumpsys activity services` and OEM battery screenshot.

## R3 running — Play / policy / demo video

When R3 ships (not before):

1. Play Console Data Safety: add **precise location**.
2. Update the public privacy policy for GPS route + Health Connect exercise route.
3. Declare `FOREGROUND_SERVICE_LOCATION` and record the Play FGS demo video (location type, one FGS).
4. Real-device watch check: run/walk audio + haptics mirrored to Wear under the same invariant as guided lifting (opening the phone does not cancel watch guidance).

## N-0010 HEAD debug client accept

`dumpsys` already VERIFIED at 1.0.5 / versionCode 15 / DEBUGGABLE. Operator: confirm the logged-in product screens on that client.

## N-0046 S1 separate account deletion and data reset

**UNABLE_TO_VERIFY — rendered UI / accessibility / deletion journey.**

The Stage 0 AVD failed with a dev-client socket timeout and System UI ANR. One
cold restart was attempted for N-0046: `Medium_Phone_API_36.1`, headless,
`-no-snapshot-load -no-window -no-audio -cores 2`; boot completed and installed
package was visible. Restarted Metro with `npx expo start --dev-client --localhost`,
ADB reverse 8081, correct `exp+reclaim-app` development-client URL. `/status`
returned `packager-status:running`. The initial launch showed unexpected EOF;
Reload input timed out after 15 seconds and the final capture shows
**Reclaim isn't responding**. Metro and emulator were stopped afterward.

Evidence: `.eif/audit/N-0046/current.png`, `current.xml`, `retry.png` (local only;
screenshots transferred with `adb pull`, not PowerShell binary redirection).
These show the dev launcher/error, not the changed product screens. N-0056 owns
the environment repair; N-0047 remains the separate live deletion journey.

When the environment is usable, with a throwaway account only:

1. Open Settings and Data & privacy; capture the "Delete account" button and
   confirmation. Check TalkBack labels, reachable Cancel/confirm, and large text.
2. Cancel once; confirm account/data/reminders remain unchanged.
3. Export any test data desired. Delete from one screen; expect Auth, never Welcome.
4. Restart: the deleted session must not return. Attempt login with the deleted
   account and confirm it cannot sign in; a new account remains possible.
5. Execute N-0047's multi-domain creation and snapshot verification separately.

Warren reviews visible changes in the final build; no intermediate approval stop.

## N-0051 S1 security advisors and combined verification

**Security advisor status 2026-09-21:** zero ERROR. These remaining warnings are
not resolved by the applied SQL migrations:

1. Enable leaked-password protection in the Supabase dashboard for project
   `bgtosdgrvjwlpqxqjvdf` (Authentication / password-security settings). Confirm
   plan availability and re-run security advisors. Do not weaken password rules
   to remove the warning. The agent did not change this dashboard toggle.
2. Review N-0057's moddatetime dependency assessment before any live relocation.
   Do not drop/recreate triggers or move the extension without an impact plan.
3. N-0047 account-deletion AVD journey is still blocked by the documented
   dev-client EOF/ANR after the single cold restart; no throwaway live wipe or
   zero-row/auth-user-absence proof exists. N-0056 owns environment recovery.
4. N-0058 is a source-review account-switch race and blocks release. Resolve it,
   then re-run N-0051's combined deletion/auth review and N-0047 when possible.

These are consolidated for Warren's final review; continue other independent nodes.

## N-0058 Bind account deletion and cleanup to confirmed identity across auth races

# N-0058 device verification — UNABLE_TO_VERIFY

N-0056 still owns the recorded dev-client EOF/ANR after the prescribed cold restart
and timed Reload attempt. See N0046_DEVICE_CHECK.md and `.eif/audit/N-0046/`.
No additional identical restart loop, product screenshot, or live deletion is claimed.

After environment recovery, using throwaway accounts only:

1. On Settings and Data & privacy, confirm the selected account and Delete account
   wording. Open confirmation, change account through a separate pending auth flow,
   then accept the old confirmation: reject without deleting the new account.
2. During deletion, verify the busy message is readable at large text size and
   announced by TalkBack; Back/deep-link must not expose a usable login form.
3. Delay device cleanup after successful server response. Auth appears only when
   cleanup ends; sign in as a different throwaway user and verify its state survives.
4. Verify offline/error recovery removes the busy gate and permits a retry.
5. Complete N-0047's multi-domain wipe and zero-row/auth-user-absence checks.

Record screenshots in `.eif/audit/N-0058/` and journey evidence in
`.eif/audit/delete-account/`. Warren reviews the visible change in the final build.

## N-0018 C-N mood check-in submit lock

# N-0018 — UNABLE_TO_VERIFY on AVD

N-0056 dev-client EOF/ANR remains unresolved after the prescribed cold restart and
timed Reload attempt; see N0046_DEVICE_CHECK.md. No new product render is claimed.

After recovery: on a throwaway account, rapidly double/triple-tap Mood Save check-in.
Expect one history/outbox record and a disabled Saving button. Verify large text
and TalkBack busy/disabled announcement, then a genuine persistence failure and
retry. Record `.eif/audit/N-0018/` renders and the mood-checkin journey evidence.
N-0062 separately owns post-write refresh error messaging and preservation of new
draft edits typed during a save. Final-build review, not an intermediate stop.

## N-0019 C-N repo RLS sleep_sessions policies documented

# N-0019 / N-0063 — live app_logs anonymous SELECT exposure

Linked metadata confirms anon SELECT privilege and a PUBLIC permissive policy
allowing `auth.uid() IS NULL`. This allows anonymous reads regardless of row owner.
No log contents were read. RLS enabled and zero advisor ERROR are not proof of
safe access here. **Release blocked until the live policy is corrected.**

N-0063 owns a narrow migration plus repair of the checked-in unsafe SQL recipe.
Live deployment needs the explicit approval required by AGENTS section 8 for this
additional, non-Stage-1 migration. Preserve anonymous insert if still required;
remove anonymous read access without widening other roles. Prove with rollback-only
synthetic anon/two-user probes and re-run scripts/inspect_sleep_log_rls.sql.
Operator should assess prior exposure/audit logs without assuming a breach.

## N-0032 C-M med curation-tier gate

# N-0032 medication catalogue label — UNABLE_TO_VERIFY on AVD

N-0056 remains the documented EOF/ANR blocker after the prescribed cold restart
and timed Reload attempt; see N0046_DEVICE_CHECK.md. No product render is claimed.

After recovery, open a matched scheduled medication: show Catalogue reference
(not reviewed), not a reviewed/curated claim. Confirm its existing educational
text, reminders and dose history remain available. Check an unmatched medication
still says Tracking only, and PRN still says As needed (PRN). Check the education
section's review label, including PRN, with TalkBack and large text. Record renders
under `.eif/audit/N-0032/` and meds-log journey evidence under `.eif/audit/wave-2/`.

All 357 production rows currently lack explicit review records; none was promoted.
Future reviewed records must contain a real reviewer, non-future UTC YYYY-MM-DD
reviewedOn and an evidenceRef to the actual review artifact. Synthetic test
metadata is never production provenance. This is content review, not certification.

## N-0056 Restore bounded AVD dev-client journeys after repeat ANR

# N-0056 bounded emulator retry — 2026-09-21

Source of truth: the installed Android debug client and observed rendered UI,
not Metro health alone. Existing failure evidence is in N0046_DEVICE_CHECK.md.

Warren requested a fresh attempt, with a new stop condition: if Reclaim still
does not work, stop and report so he can uninstall it, then resume to reinstall.
Do not clear app data or uninstall during this attempt. No product code changes.

Run R20260921B; lease N-0056 through scripts/eif_node.py. One writer; hooks off.
Self-verification only; no independent review claimed.

Attempt: cold headless Medium_Phone_API_36.1, installed client, local Metro,
ADB reverse 8081. Processes have 900-second lifetime bounds; individual device
commands also have timeouts.

Result: FAILED / UNABLE_TO_VERIFY. Android eventually reported
`sys.boot_completed=1`; package inspection confirmed 1.0.5/versionCode 15,
DEBUGGABLE, with the expected exp+reclaim-app scheme. Metro initially returned
`packager-status:running` (a later request timed out after 10 seconds).
The post-boot activity launch returned Status: ok, but the binary-safe captured
and visually inspected `.eif/audit/N-0056/launch.png` shows **System UI isn't
responding**, not usable Reclaim UI. An earlier intent attempt before boot
completion could not resolve the activity. No product journey passed.

Stop per Warren's latest instruction. No uninstall, app-data clearing, native
rebuild, or product source changes were performed. A Reclaim reinstall is not
proven to fix an Android System UI ANR; root cause remains undiagnosed.
After Warren removes the emulator's Reclaim app and says continue, reinstall
the debug client, retry the device gate, then resume wave 2 at N-0026.

## N-0047 S1 throwaway account deletion AVD journey

# N-0047 throwaway journey — email-verification blocker

Date: 2026-09-22. Environment: the operator-started canonical
`npm run android` workflow on `emulator-5554`.

The existing signed-in account was not deleted. It was signed out normally so
the required throwaway signup journey could begin. The app's Sign Up UI was
used with a unique test address and non-reused test password. Google Password
Manager initially interrupted the form; the emulator autofill service was
temporarily disabled and restored to its exact prior value immediately after
the signup attempt.

Supabase accepted the signup and the app rendered:

> Account created! Please check your email to verify your account.

The generated test mailbox is not operator-controlled, so its verification
link cannot be received. No authenticated throwaway session was created. No
mood, medication, training, routine, or sleep data was seeded, no delete action
was attempted, and no zero-row/auth-absence result is claimed.

Human continuation:

1. In Supabase Authentication, remove the unverified test user created around
   2026-09-22 12:57 Africa/Johannesburg if present. Its address begins
   `reclaim.eif.20260922.1305` and ends `@gmail.com`.
2. Supply an operator-controlled throwaway email address, or configure an
   approved test-only confirmation path, then sign up through the AVD and open
   the verification link.
3. Resume N-0047 only after the verified throwaway session is visible. Seed all
   five required domains through app journeys, delete through the UI, then run
   the snapshot verifier and auth-user absence check.

Local screenshots under `.eif/audit/delete-account/` are diagnostic only and
must not be committed because some captures contain account identifiers. The
canonical blocker evidence is this redacted document.

## N-0026 C-P notification permission off first render

# N-0026 source of truth — notification permission off first render

Date: 2026-09-22  
Run: `R20260922A`

## Observed baseline

- `RootNavigator` holds the splash in the `notifications` startup phase until
  `runStartupNotificationPermissionGate()` resolves.
- That gate calls `ensureNotificationPermission()`, which calls
  `Notifications.requestPermissionsAsync()` when permission is not already granted.
- `useNotifications()` can call the same requesting helper after the transient startup
  deferral flag is cleared.

This makes an OS permission prompt part of first render and makes prompt timing dependent
on a race between the startup gate and the mounted notification hook.

## Implementation boundary

- First render may inspect the existing notification permission state, but must never
  request permission or wait for notification reconciliation.
- Permission requests remain available only from explicit user actions that enable a
  notification feature.
- Badge clearing and intent reconciliation remain on the canonical reconciler path and
  run after startup without holding the splash.
- No notification scheduling or cancellation invariant changes are in scope.

## Acceptance evidence required

- Focused Vitest proves startup does not request or await notification permission before
  rendering.
- Full typecheck, full verbose Vitest, and Git Bash dual-path audit pass.
- An ADB time-to-first-render log is captured against the already-running canonical Expo
  development environment; restarting the app process for measurement is allowed, but
  the emulator and Metro environment are not recreated.

## Implemented and source-verified

- `RootNavigator` now releases the startup phase before starting notification
  housekeeping.
- Startup and the mounted notification hook inspect the existing grant without calling
  the OS request API. Explicit feature actions retain the requesting helper.
- Badge clearing and canonical intent reconciliation start as background work.
- Focused startup test: 1/1 passed.
- Typecheck: passed with zero errors.
- Full verbose Vitest: 145 files / 918 tests passed.
- Git Bash dual-path audit: 27/27 passed.
- Medication catalogue QA: 357 rows / zero governance issues.

## ADB timing attempt and blocker

The already-running emulator, Metro process, installed package, app data, and native
project were preserved. The required measurement restarted only the app process:

```text
adb shell am force-stop com.fissioncorporation.reclaim
adb shell am start -W -n com.fissioncorporation.reclaim/.MainActivity
LaunchState: COLD
Activity: com.fissioncorporation.reclaim/expo.modules.devlauncher.launcher.DevLauncherActivity
TotalTime: 6679
WaitTime: 6683
```

That value measures the development launcher, not the Reclaim UI, so it is not claimed
as time-to-product-render. Selecting the live `http://10.0.2.2:8081` development server
advanced to `MainActivity`, but the screen remained blank. Metro `/status` still returned
`packager-status:running`, ADB reverse remained present, and logcat supplied the concrete
failure from the new process:

```text
okhttp.OkHttpClient: Callback failure for call to http://10.0.2.2:8081/...
java.net.ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd
... BundleDownloader.processMultipartResponse
```

This is a malformed multipart/chunked bundle response on the current canonical
development path. It is distinct from the historical manual-APK ClassNotFoundException
and socket timeout. No old APK was installed, no app data was cleared, and neither Metro
nor the emulator was restarted. Per the operator stop condition, runtime verification
stops here. Local diagnostic captures are under `.eif/audit/N-0026/` and are not release
evidence.

Human continuation:

1. End the currently running `npm run android` terminal when convenient.
2. Remove the current Reclaim development build from the emulator if that is the chosen
   reset.
3. Tell the next agent to continue. It must use `cd C:\Reclaim\app` then
   `npm run android`; it must not install a historical APK or clear unrelated emulator
   state.
4. Repeat the ADB time-to-actual-Reclaim-render measurement. Do not complete N-0026 from
   the 6679 ms launcher timing alone.

## N-0028 C-L associated-with copy sweep

# N-0028 final device check

UNABLE_TO_VERIFY on 2026-09-28: bounded `adb devices -l` returned no devices and a
five-second Metro `/status` request could not connect. No emulator launch, app install,
data clear or network change was attempted.

When the operator's canonical Expo session is available:

1. Open Mood and read the Related patterns card and its sleep/medication context.
2. On a throwaway account, trigger the positive mood, consistent sleep, stress and
   incomplete medication logging insights. Check that explanations state observations
   and uncertainty; the missed-dose action refers to instructions or a pharmacist.
3. Inspect the three changed static catalogue descriptions and norepinephrine glossary
   entry. Check readability, wrapping and screen-reader order at normal and large text.
4. Capture screenshots under `.eif/audit/N-0028/` for Warren's final review. Keep any
   captures containing personal medication, mood or account information local.

This check is queued; no visual pass or clinical review is claimed.

## N-0029 C-H dual-path CRLF plus stale memory files

# N-0029 legacy System32 Bash acceptance

The LF-normalized audit now parses through `C:\Windows\System32\bash.exe`, but this
host's WSL environment has no `rg`. Observed on 2026-09-28 with a 20-second bounded
subprocess: `rg: command not found`, followed by the intended fail-closed audit error
(status 127). Git Bash passes all 27 checks.

No WSL install, environment modification or network change was performed. If the old
System32 acceptance is retained, provide a WSL environment with ripgrep available and
run `cd /mnt/c/Reclaim/app && npm run audit:training-dual-paths`. Require 27/27 and a
zero exit. Otherwise the operator must explicitly retire that legacy criterion in
favour of the canonical Git Bash gate; the agent does not silently change acceptance.

## N-0062 Preserve mood drafts and distinguish post-save refresh failure from failed persistence

# N-0062 — device acceptance still required

UNABLE_TO_VERIFY on 2026-09-28. Read-only `adb devices -l` (15-second timeout)
returned no attached devices; HTTP GET `127.0.0.1:8081/status` (5-second timeout)
was refused. No restart, APK install, data clear or network change was attempted.
This does not invalidate the operator's earlier successful canonical Expo launch.

When the operator's canonical `cd C:\Reclaim\app; npm run android` session is ready:

1. Open Mood on an approved test account, enter a note, and tap Save repeatedly.
   Confirm one persisted row and accessible disabled/busy feedback.
2. With persistence delayed in a controlled test, edit the note while saving.
   Confirm the submitted note is saved and the newer draft remains editable.
3. With a controlled query/forecast/insight refresh failure after persistence,
   confirm the dialog says saved, advises no duplicate save, and history has one row.
4. With actual local persistence failure, confirm an error, preserved draft and a
   working explicit retry. Do not use airplane mode alone as a write-failure test:
   the canonical writer supports device-first saves.
5. Capture approved, redacted renders into `.eif/audit/N-0062/`; exercise the
   mood-checkin journey. Unit/component results do not substitute for these checks.

## N-0064 Hide add-med empty-state coaching when medications exist

# N-0064 — rendered medication coach re-check

UNABLE_TO_VERIFY: the bounded 2026-09-28 checks recorded under N-0062 show no
attached ADB device and no reachable Metro on 8081. Do not repeat recovery loops.

When the canonical Expo session is available, open Medications in the retained
account. Without adding, editing, deleting or logging medications/doses, confirm
the existing medications remain visible and no first-medication coaching appears.
Compare locally against `.eif/audit/N-0032/` (contains personal medication data;
do not commit those screenshots). Save redacted after evidence under
`.eif/audit/N-0064/`. Check accessibility traversal has no hidden Show me/Dismiss
coach controls when the card is absent.

On an approved empty throwaway account, confirm the coach appears after loading,
Show me navigates to the existing add form, and dismissal still works. Do not
empty an existing account to manufacture this test. Loading/read-error states
must not claim there are zero medications. Component tests cover these states;
the AVD journey is still outstanding.

## N-0060 Serialize notification intent writes and bind delivery acknowledgements to prompt identity

# N-0060 — notification delivery device checks

UNABLE_TO_VERIFY: bounded checks on 2026-09-28 found no attached ADB device or Metro
listener. Do not rebuild/reinstall/recover the environment to manufacture evidence.
Use the operator's canonical Expo session when available.

On an approved guided test session, exercise set, rest, notification Done and
foreground/background transitions. Confirm each current prompt remains actionable,
rapid transitions do not restore older prompts, unrelated reminders remain, and
Wear/FGS guidance continues when the phone opens. Record redacted evidence under
`.eif/audit/N-0060/` and the guided-session/notification-Done wave journeys.

Re-run after N-0061/N-0017 transport and foreground corrections, N-0059 cancellation
ownership, and N-0066 timer promotion/dismissal are implemented. Passing intent-store
tests alone cannot certify those separately chartered invariants or native delivery.

## N-0065 Review unsupported health certainty in static insight copy

# N-0065 rendered insight copy

Status: UNABLE_TO_VERIFY on 2026-09-28. Bounded, read-only SDK `adb devices`
(15-second process timeout) returned no attached devices, exit 0. HTTP GET of
`http://127.0.0.1:8081/status` (5-second timeout) could not connect. No restart,
reinstall, reverse reconstruction, data clearing or networking change attempted.
This does not invalidate the operator's earlier successful canonical Expo render.

When the canonical session is available:

1. Use `cd C:\Reclaim\app; npm run android` if no session exists. Preserve a working
   session. The operator's known initial-launch recovery is to close the failed
   app, retain Metro and press `a` in the Expo terminal; do not substitute old APKs.
2. With an approved throwaway account/fixture, trigger representative mood, sleep,
   medication, training and fallback insights. Do not edit real medication/dose data
   to force a case. Capture both main text and expanded explanations.
3. Check ordinary and large text: no truncation of support or medication guidance,
   readable actions, correct destination after tapping, no unsafe dose/timing advice.
   Crisis support must clearly identify 988's US/territories scope.
4. Compare the displayed body/action/explanation with the checked-in data. Confirm
   a missing social tag is not described as isolation and a missing dose log is not
   treated as proof of a missed dose. Record exact insight IDs and fixture inputs.
5. Capture redacted before/after evidence under `.eif/audit/N-0065/product-renders/`
   and `.eif/audit/wave-2/association-copy/`. Existing internal-tag headings still
   require N-0067; optional chemistry/association chips require N-0035 review.
6. Update JOURNEYS.yaml only for actually executed checks and queue final operator
   approval. Startup, source inspection and passing unit tests are not this journey.

## N-0067 Neutral insight category headings

# N-0067 rendered category headings

Status: UNABLE_TO_VERIFY on 2026-09-29. Bounded read-only `adb devices` returned
no attached devices. HTTP GET of `http://127.0.0.1:8081/status` (5-second timeout)
could not connect. No restart, reinstall, reverse reconstruction, data clearing
or networking change was attempted.

When the canonical session is available:

1. Use `cd C:\Reclaim\app; npm run android` if no session exists. Preserve a
   working session. Initial-launch recovery is to close the failed app, retain
   Metro and press `a`. Do not install historical APKs.
2. Open insight cards whose stored tags are `sleep_serotonin`,
   `sleep_breath_vagal` and `mood_dopamine` (rule IDs sleep-debt-serotonin,
   vagal-tone-breath, dopamine-downshift). At ordinary text size the category
   line must read Sleep, Breathing and Mood. It must not show Serotonin, Vagal
   or Dopamine.
3. Repeat those three cards at large text. The category line stays fully
   readable and does not overflow into the message.
4. Confirm the message, action and why text still match the N-0065 copy, and
   that tapping the action still opens the existing route. Nerd-mode chemistry
   chips, if enabled, may still name mechanisms; that is N-0035, not this check.
5. Save redacted screenshots under `.eif/audit/N-0067/product-renders/`.
   Source tests and a booted app are not this journey.

## N-0061 Replace prohibited guided background-actions transport with one native FGS

# N-0061 device proof

Install the debug build that contains `ReclaimSessionForegroundService` over the
current app without clearing data (`adb install -r` of the new `app-debug.apk`,
or `npm run android` from `app/` while Metro stays up). Then, signed in:

1. Start a guided session. Confirm one ongoing notification, "Reclaim training in progress", and that a second session service is not running (`adb shell dumpsys activity services ReclaimSessionForegroundService`).
2. Leave the training screen and reopen the phone app. Guidance and the notification must still be up.
3. Swipe the app out of Recents. The notification must remain. Open the app again and confirm the session is still the same one.
4. Complete a set from the phone and, if the watch is paired, from the watch. Both must go through the existing Done path. Do not expect a second completion workflow.
5. Let a rest timer reach its end with the screen off. The rest-end tick must still fire.
6. End the session. The notification must leave. A mindfulness or meditation start after that must be able to take the same service. Starting one while guided is still open must refuse.
7. Optional: leave the session open, put the emulator in Doze, and confirm the notification is still present afterward.

Record the exact limitation if the watch or Doze step cannot be run. This does not complete N-0061, N-0017, or N-0042.

## N-0059 Centralize native notification cancellation and remove cancel-all escape path

# N-0059 — device check for cancellation authority

Source tests do not prove OS behaviour. Do not mark N-0059 complete from them.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Open Settings. Confirm both former "Cancel all notifications" buttons now
   say "Clear reminder notifications".
2. With a medication reminder and a different reminder still scheduled, cancel
   reminders for one medication. The other medication reminder and any open
   training, mindfulness, or meditation guidance must still be scheduled.
3. Tap "Clear reminder notifications". Saved dose, refill, and sleep reminder
   intents should drop. An open guided, mindfulness, or meditation prompt must
   stay. Daily reminders that come from notification settings may return on
   the reconcile that follows.
4. Do not use this check as the N-0061 guided/rest/Done/Doze/Wear journey, and
   do not use it as the N-0066 rest-timer identity check.

This session did not open Settings or run those steps. Metro was left up.
No runtime pass is claimed.

## N-0066 Bind rest-end timer promotion and dismissal to current prompt identity

# N-0066 — device check for rest-end timer identity

Source tests do not prove OS, watch, or foreground-service behaviour.
Do not mark N-0066 complete from them. Do not mark N-0061, N-0017, or N-0042
complete from this check.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Start a guided session and begin a rest. Confirm the live rest tile and the
   rest-end prompt are the current ones.
2. While a rest is counting, replace or skip that rest so a newer prompt is
   armed before the old timer would have fired. The old timer must not replace
   the newer prompt and must not dismiss the newer now-slot tile.
3. End the session before a rest timer fires. The closed session must not get
   a new rest-end prompt from the timer that was already armed.
4. Let one rest finish normally. The rest-complete prompt may appear, and the
   previous rest tile for that same prompt may go away.
5. Opening the phone must not stop guidance. Wear, lock-screen, and Doze remain
   the N-0061 human check.

This session did not run those steps. No runtime pass is claimed.

## N-0020 C-R F1 canonical muscle taxonomy

# N-0020 — device check for the weekly sets line

Source tests do not prove the session-preview line on a device.
Do not mark N-0020 complete from them.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Open Training and preview an existing planned day. Do not start the session.
2. Read the weekly sets line in the preview. Core work that the catalogue tags
   `core` should contribute to Core. Conditioning tagged `cardiovascular` and
   days tagged `full_body` should not appear as their own buckets.
3. Back out of the preview. No new session, dose, mood, or sleep row should be
   written for this check.

This session captured Home only (`emulator-5554`, Reclaim focused).
`uiautomator dump` returned "could not get idle state", so the preview was
not opened. That capture is not acceptance of the line.

## N-0039 R0 session calorie source-of-truth via Health Connect

# N-0039 — late Health Connect calorie re-read

Source tests cover the decision. This check is the worn-watch case.

1. On a phone with Health Connect, wear the watch and finish a Reclaim session. Note the session start and end.
2. Confirm Reclaim is allowed to read Active calories.
3. If ActiveCaloriesBurned for that window appears in Health Connect only after the session ends, that is hypothesis (b).
4. Leave Reclaim open for about a minute, or open Training history within 30 minutes of the end. The session summary should gain `activeCaloriesKcal`, `energySource` = `health_connect`, `energyReadAt`, and `energyWindow` for that same start and end.
5. Confirm the session items do not gain a per-set calorie field. Health Connect active-calorie records are intervals, not sets.
6. If the first read was already the full total, a later smaller read must not reduce it.

Do not mark the node complete from this file alone. Record what the phone showed.

## N-0040 R1 training modes Strength Running Hybrid

# N-0040 visual check

UNABLE_TO_VERIFY the setup mode chips.

1. `adb devices` showed `emulator-5554`.
2. The screen was the Expo development launcher, server `http://10.0.2.2:8081`.
3. A UI dump then showed "Error loading app" / "timeout". The dialog was dismissed.
4. Metro was not rebuilt and the app was not reinstalled.
5. Strength / Running / Hybrid chips were not seen in the product. Do not treat the launcher screenshot as that review.

## N-0042 R2 running location on the one foreground service

The emulator is down. These checks are queued. Do not treat source tests as this review.

1. Apply `app/supabase/migrations/20260930140000_run_routes.sql` to project `bgtosdgrvjwlpqxqjvdf` only. On 2026-09-30 the CLI authenticated to that project and then timed out connecting to `aws-1-eu-west-1.pooler.supabase.com`. Confirm the project ref again, then apply. After it lands, run `python scripts/refresh_user_keyed_tables.py` from the repo root and commit the refreshed snapshot.
2. Deploy `delete-account` only after that migration. The updated function treats `run_homes`, `run_sessions`, and `run_routes` as required. Deploying it first makes account deletion fail closed while the tables are absent.
3. Rebuild the native dev client so the foreground-service plugin is in the APK. The installed client does not yet have `health|location` or `getLastLocation`.
4. Start a running-mode session. Expect a fine-location prompt only then, and only if it is not already granted. Strength setup must not show that prompt.
5. Deny location once: the run should still open, and no route points should be stored.
6. Allow location, tap **Save home**, then confirm points within 200 m of that fix are absent from `run_routes`. A point farther out should be stored. 200 m is the privacy radius, not a pace or a session length.
7. Finish the run. Health Connect should show a running exercise session (type 56) with a route. A strength session should still be type 70 with no route.
8. GPX playback: Extended Controls → Location → Routes, speed at or under 2×. The in-repo parser is `parseGpxTrack`. Device playback is this check.
9. Play Console: declare the location foreground service, record the FGS demo video, and update Data Safety for precise location and the route. Do not declare coarse location or route read.

## N-0042 visual

UNABLE_TO_VERIFY the run screen. The emulator was not available. The session header for a run says **Run** and shows **Save home**. That was not rendered.

## N-0008 live bottom insets

The emulator is down. These checks are queued. Source tests are not this review.

1. Reload the current dev client. This change is JavaScript. A native rebuild is not required for the inset hook.
2. Gesture navigation: open Home, Training, Meds, and Settings. The last card should sit above the tab bar, not under it and not with a large empty band.
3. Switch the emulator to 3-button navigation and open the same four screens. The last card should still clear the tab bar and the system buttons.
4. Open an in-progress training session. The last exercise should clear the sticky footer. The footer should sit above the system navigation once.
5. On Meds, open **View history**. The sheet should sit above the system navigation.
6. On the signed-out auth screen, the bottom of the form, including **Continue with Google**, should sit above the system navigation.

## N-0034 technique figures

The emulator is down. These checks are queued. Source tests are not this review.

1. Reload the current dev client. This change is JavaScript. A native rebuild is not required.
2. Open exercise details for Glute Ham Raise. The figure should hinge at the hips, not raise the arms out to the side.
3. Open Farmer's Walk or Sandbag Carry. The figure should stay upright with the arms down, not hold a plank.
4. Open Bench Dips. The figure should straighten the elbows overhead, not lie back into a bench press.
5. Open Muscle-ups. The figure should pull from overhead, not press a bar overhead from the shoulders.
6. Open Barbell Bench Press and Back Squat. The press should stay a press and the squat should stay a squat.
