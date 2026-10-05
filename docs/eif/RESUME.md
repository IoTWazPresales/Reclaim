# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-10-02 handover — keep walking. Do not stop to ask.** Read the top of `docs/eif/PROGRESS.md` first. The newest bullet wins. Older bullets that say the emulator is down, that N-0025 never started, that the run-route migration was refused, or that `app_logs` is still world-readable are historical.

The operator’s instruction is to finish as many remaining charter nodes as possible. Park a node only when a stop below is true, write that park in `PROGRESS.md`, and immediately take the next node. Do not pause for permission between nodes. Do not end a turn only to recommend a new chat.

**Stop only for these.** Anything else, do the node.

- Never touch `main`. Never connect GlobalProtect. Never wipe emulator data, clear app data, prebuild, regenerate native projects, or reinstall an old APK. A native rebuild has broken this launch before. Park N-0042’s on-device location proof and keep walking.
- N-0053 and N-0054. On 2026-10-05 the operator asked to close the quality gate. `help event` still has no verification kinds or quality payload. Do not guess it from runtime internals. The node stays blocked.
- N-0030 stays parked. Do not implement production chrome.
- N-0047 and the N-0064 empty-account coach need a mailbox that can receive a verification link. Do not delete or empty the retained account. Do not log, add, edit, or delete a medication or dose on it.
- N-0025’s OEM 15-minute check was waived by the operator on 2026-10-05. The accepted evidence is the 2026-10-01 emulator rest cue in deep idle. Do not log another set on the retained account for that check. Do not claim an OEM-phone measurement.
- Do not drop or move `moddatetime`. Do not re-apply `20261001160000_app_logs_owner_select.sql` or `20260930140000_run_routes.sql`. Do not `db push`. Do not deploy `delete-account`. Do not change `training_sessions.id` away from text.
- Do not invent week multipliers, RIR targets, paces, heart-rate zone percents, treadmill or cycling minute tables, or a running deload cut. Do not start the 5-day twice-a-week planner change or the cardio-modality split.
- Ledger status was tried again on 2026-10-05 with `--run R20260930C` and returned `LEASE_NOT_OWNER: R20260930C`. Do not retry, do not hand-edit `.eif/program`, and do not read `.eif/runtime/**`. Evidence and complete cannot run until status works. Hooks stay off.

**Already done. Do not redo it.**

- Live project `bgtosdgrvjwlpqxqjvdf`. Postgres ports 5432 and 6543 to the pooler time out. `supabase db query --linked` still dials that pooler. Use the Management API for SQL. The operator authorized live-account checks.
- N-0063. Anon and public SELECT on `app_logs` are false. Both SELECT policies are authenticated and owner-only. The rollback probe printed PASS. Synthetic rows and users left behind: 0.
- N-0057. `moddatetime` 1.0 is in `public`. The only trigger is `profiles.set_profiles_updated_at`.
- N-0042 schema. `run_homes`, `run_sessions`, and `run_routes` exist. `training_session_id` is text because session ids are `session_<millis>`. Insert and update policies require the linked row to belong to the same user. The installed debug client is still foreground type `health`.
- N-0034. Farmer’s Walk is scored (Core • Carry, upright). Weeks 1–4 are the same five sessions plus Saturday rest. Glute-ham raise, bench dips, and muscle-ups are not scheduled. Do not start a session to force them onto a day. While a later week loads, the strip used to flash Week 1; source now waits for `week_index`. The running Metro was started with `CI=1`, so reloads are off and that label fix is not on screen yet.
- N-0009 gesture Home is scored. 3-button is restored (`navigation_mode` 0). Do not switch gesture again.
- N-0010. The running client is 1.0.5 / versionCode 15 / debuggable. Home, Training, Analytics, and Settings were opened.
- N-0064 retained account. Four medications are listed and the first-medication coach is absent. No dose was logged.

**Still open. Do these without asking.**

- N-0008’s 3-button in-progress footer is scored. Do not switch gesture navigation. N-0016’s stale dialog was scored on the 1 October session and that session is still in progress; do not delete it and do not log a set on it. Home’s daily signal matches `sleep-debt-accumulating` (category Sleep, "Associated with sleep"). The Sleep screen’s visible card is the local average rule, "Your 7-day average is below 7h", over a 7h 16m night. Mood’s visible card is `mood_fallback`, category Mood. `sleep_serotonin`, `sleep_breath_vagal`, and `mood_dopamine` were not on Home, Sleep, or Mood. "Show me" was not tapped. Both "Clear reminder notifications" labels were read (Notifications, then Med reminders) and were not tapped. Guided proof still open: recents swipe, rest-end identity, and a logged set. Do not repeat the N-0025 set. A new session may be started when a node’s acceptance needs it, then deleted if that node does not need it kept. The dev client cannot load a bundle right now: adb reverse returns no payload, and `10.0.2.2` corrupts the multipart body. Do not loop the same launch.
- Do not sign out the retained account. The signed-out auth form waits on a throwaway login.
- Working tree has uncommitted source and docs from 2026-10-02, including the run-route migration, the week-label change, `scripts/probe_app_logs_isolation.sql`, and the resume notes. Do not assume they are pushed. Do not commit `.eif/audit/`, screenshots, `.env`, or `.eif/runtime/**`.

**Emulator.** Swiftshader `Medium_Phone_API_36.1` is up. Metro is on 8084. The proxy on 8083 dechunks the bundle and the guest must use the current host Wi-Fi address (`192.168.101.253:8083` on the 2026-10-04 boot; re-read it if the network changes), not `10.0.2.2` and not `adb reverse`. Reclaim is signed in. A cold start reached Home between 44 and 62 seconds. Tap Wait, not Close, if "isn't responding" covers the screen. Do not connect GlobalProtect. Do not pass `-dns-server`. On 2026-10-02 the host DNS was 1.1.1.1 and 8.8.8.8, and Try again reached Supabase. An earlier boot on a different resolver failed when forced to 8.8.8.8. ICMP loss is not failure. `debug_http_host` is `10.0.2.2:8081` for this boot because reverse returns no payload. `10.0.2.2` still corrupts a multipart bundle. Prefer reverse when a guest `/status` actually returns `packager-status:running`. Cold start can show “Reclaim isn’t responding” or “System UI isn’t responding”; tap Wait, not Close. A process restart reached Home with no profile gate after the underscore key was stored. Do not repeat the host-GPU boot that died with `VK_ERROR_DEVICE_LOST`. `adb` is `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. Screenshots: `adb shell screencap` then `adb pull`. The pinned **Start session** button starts a session. The big card **Preview** does not. One Android back closes a preview. A second back can leave the app. Version stays 1.0.5 / versionCode 15. Animator scales were restored to 1. `navigation_mode` is 0.

Do not invent week multipliers, RIR targets, paces, heart-rate zone percents, treadmill or cycling minute tables, or a running deload cut. Do not start the 5-day twice-a-week planner change or the cardio-modality split. Those were diagnosed and left out of the charter. Version stays 1.0.5 / versionCode 15.

Emulator `emulator-5554` was left signed in. Metro is the existing `npm run android` session in `app/`. If a launch times out on the LAN address, `adb reverse tcp:8081 tcp:8081` and open `http://127.0.0.1:8081`. `adb` is `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`. Screenshots: `adb shell screencap` then `adb pull`. Do not clear app data. Do not reinstall historical APKs. The set-level Done button sits in the scroll card. The sticky footer button is Minimize. Do not tap Start while a foreground service is already running.

Visible nodes in `docs/eif/AWAITING_APPROVAL.md` stay parked until the operator approves them. Committing to this branch is fine. Nothing ships from that queue.

**Read, in this order, and nothing else first:**

1. `AGENTS.md` — canonical rules, invariants, harness, EIF wrapper, approval protocol.
2. `docs/eif/PROGRESS.md` — resume pointer and node table. The newest bullets win.
3. `docs/eif/CHARTER.md` — full node list with acceptance criteria and execute order.
4. `docs/eif/AWAITING_APPROVAL.md` — visible changes waiting on the operator.
5. `docs/eif/HUMAN_CHECKS.md` — device, Play Console, and live-DB steps.

**Then:**

- `python scripts/eif_node.py status` once. On `LEASE_NOT_OWNER`, continue the product work and skip evidence.
- Resume at the first unfinished node that is not in the stop list above. Do the node. If a stop condition is real, park it in one PROGRESS bullet and take the next node in the same turn. Do not ask the operator whether to continue.
- Update `docs/eif/PROGRESS.md` in the same commit. Add a `CONTEXT.md` section at the top when state changes materially.
- Stage explicit paths only. Do not stage `.env`, screenshots, `.eif/audit/`, `.eif/runtime/**`, or unrelated dirty files.
- PowerShell has no `&&` and no bash heredoc. Use `;` and `git commit -m "..." -m "..."`.
- If the repo contradicts the plan for a node, record it in PROGRESS.md and move to the next independent node.

Do not read `.eif/runtime/**`. Do not implement N-0030 or production chrome. Do not implement deferred items listed in AGENTS.md §8.
