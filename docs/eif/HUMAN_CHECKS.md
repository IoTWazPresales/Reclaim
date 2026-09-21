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
