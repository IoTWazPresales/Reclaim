# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-10-01 handover — continue, do not rediscover.** HEAD before the emulator-network note was `4674d47`, pushed and in sync with `origin/fix/training-confident-ux`. Read the top of `docs/eif/PROGRESS.md` first. Older resume bullets that say N-0025 was not started, or that the emulator is down, are historical. The newest bullets win.

The newest bullet is the stuck Metro reload. After the profile gate, the emulator process was replaced and the next open stayed on **Loading from 10.0.2.2:8081** even though `/status` on that address still returned `packager-status:running`. An `adb reverse` probe of `127.0.0.1:8081` returned empty. Do not repeat the host-GPU boot that died with `VK_ERROR_DEVICE_LOST`. Do not score gesture Home, and do not start a session, until a settled signed-in Home is on screen. `navigation_mode` was left at 0.

Ledger status returns `LEASE_NOT_OWNER: R20260930C`. Try `python scripts/eif_node.py status` once. If it fails the same way, do not retry, do not hand-edit `.eif/program`, and do not read `.eif/runtime/**`. Product work can still land. Evidence and complete cannot until status works. Hooks stay off.

Do not redo source-validated work: N-0020 through N-0024, N-0033, N-0034, N-0035, N-0039, N-0040, N-0041, N-0042 source, N-0043 (proposal only), N-0008 source, N-0052, the N-0063 checked-in recipes, and N-0059 through N-0067 source. Last full suite in the app_logs commit was 170 files / 1043 tests. `npm test -- --reporter=verbose` from `app/` is the harness. Do not pass a shorter timeout. Do not run two Vitest processes at once.

**Walk what is still open. Park a node when its blocker is real, then keep going.**

Still blocked. Do not retry until the named condition is gone:

- N-0053 and N-0054. The public quality-gate payload schema is unavailable. Do not guess it from runtime internals.
- N-0063 live policy. Three linked CLI attempts timed out (catalog, 40s apply, authorized 75s apply). The migration `app/supabase/migrations/20261001160000_app_logs_owner_select.sql` is not applied. The probe was not run. Do not send another query until the pooler answers. Do not `db push`.
- N-0057. The `moddatetime` catalog was not read. Do not drop or recreate triggers.
- N-0042 device proof. The installed debug manifest is still foreground type `health`. Do not prebuild. After a query actually returns, apply `20260930140000_run_routes.sql` on its own, refresh `docs/schema/user_keyed_tables.json`, then rebuild. Do not deploy `delete-account` before that migration.
- N-0047. Throwaway signup still needs a mailbox that can receive the verification link.
- N-0030 stays parked. Do not implement production chrome.

Still open on the emulator, without a new live migration:

- N-0009 gesture Home. Switching to gesture navigation reloads the app. Score a settled Home, then restore 3-button (`navigation_mode` 0).
- N-0008 signed-out auth and an in-progress session footer were not checked. 3-button Home, Settings, Mood, Medications, Sleep, Mindfulness, and Meditation scrolled ends sit above the system buttons.
- N-0034. Dumbbell Shoulder Press showed an Overhead figure. Glute-ham raise, farmer's walk, bench dips, and muscle-ups were not opened. Do not start a session. The details control overlaps Start session.

Operator phone, not the emulator:

- N-0025. One set was logged. With the screen off and deep idle forced, the health foreground service stayed up and Notification Manager posted "Rest complete". After wake the service was gone while the session still showed set 2. The session was deleted. Training shows Next Session / Start. The 15-minute aggressive-battery check is the operator's phone. Do not log another set on the signed-in account unless the operator asks.

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
- Resume at the first unfinished node that is not in the blocked list above. Lease, implement, harness, commit, push, evidence, complete — or park with `await-approval` / `human-check` / a recorded blocker, then keep walking.
- Update `docs/eif/PROGRESS.md` in the same commit. Add a `CONTEXT.md` section at the top when state changes materially.
- Stage explicit paths only. Do not stage `.env`, screenshots, `.eif/audit/`, `.eif/runtime/**`, or unrelated dirty files.
- PowerShell has no `&&` and no bash heredoc. Use `;` and `git commit -m "..." -m "..."`.
- If the repo contradicts the plan for a node, record it in PROGRESS.md and move to the next independent node.

Do not read `.eif/runtime/**`. Do not implement N-0030 or production chrome. Do not implement deferred items listed in AGENTS.md §8.
