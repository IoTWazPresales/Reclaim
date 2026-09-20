# AGENTS.md — Reclaim (canonical agent instructions)

**This file is the single source of truth for agent behaviour in this repo.** `CLAUDE.md`, `app/CLAUDE.md` and `.cursor/rules/*.mdc` point here; if anything elsewhere contradicts this file, this file wins.

**Last verified against the tree:** 2026-09-20 · branch `fix/training-confident-ux` · programme `PRG-20260917T222550`.

---

## 1. Project and stack

React Native / Expo wellness and recovery app for people rebuilding from injury, burnout, addiction or illness. Android primary, iOS secondary. App source lives in `app/`.

| Fact | Value (verified in tree) |
|---|---|
| Package | `com.fissioncorporation.reclaim` |
| Version | **1.0.5 / versionCode 15** (`app/android/app/build.gradle`) |
| Runtime | React Native 0.81.5 · React 19.1.0 · Expo SDK ~54.0.33 |
| Data | Supabase (auth + Postgres + RLS) via `@supabase/supabase-js` 2.x; project ref `bgtosdgrvjwlpqxqjvdf` (linked in Supabase CLI) |
| State | Zustand 4 · TanStack React Query 5 |
| UI | react-native-paper 5 (MD3) · @shopify/react-native-skia 2.2 |
| Notifications | expo-notifications ~0.32 through an intent reconciler |
| Health | `react-native-health-connect` 3.5 — **Health Connect only** (Google Fit removed March 2026; never re-add) |
| Ops | Sentry RN ~7.2 · EAS Build · expo-updates ~29 |
| Med catalogue | **357 rows** across `app/src/data/medCatalog.{v1,batch1..4}.json`; exact-name match, governance lint |

Medication content is educational only — no prescribing, dosing, interactions or medical advice.

---

## 2. Branch rules

- Work on **`fix/training-confident-ux`**. **Never touch `main`.** Promotion to `main` is a separate, explicitly requested task.
- `feat/meds-catalog-governance` is fully merged into the working branch; do not check it out.
- Stage explicit paths only — **never `git add .` / `-A`**. Never commit `.env`, secrets, dumps, logcat, bulk screenshots or unrelated snapshots.
- No destructive git (reset --hard, clean, rebase, force-push, branch delete) without explicit instruction.
- **Commit + push after every validated node** (see §6).

---

## 3. Invariants (do not break; fail the node instead)

1. **Complete files.** Write whole files, never fragments the human has to splice.
2. **No empty catch blocks.** At minimum `if (__DEV__) logger.debug(...)`.
3. **Notifications:** `setIntent()` + `reconcileNotifications()` only. Never call `scheduleNotificationAsync`/`cancel*` directly; never `cancelAllScheduledNotificationsAsync`.
4. **Canonical set path unchanged.** Guided training truth is DB `training_session_items.performed.sets` + `sessionWorkAuthority.ts` + `applySetCompletion()`. UI Done, phone-notification Done and watch Done all go through it. Do not add a second completion workflow.
5. **Native FGS** (`withGuidedSessionForegroundService.js`, type `health`) is the guided-session alive transport. Never Expo sticky / background-actions. Running (R3) **extends this one service** with the `location` type — never a second FGS.
6. **Health Connect only.** Declared permissions = requested = used (`healthConnectPermissionUse.test.ts`). Keep HeartRate / ActiveCalories / Steps; do not add RHR / HRV / TotalCalories this cycle.
7. **`CONTEXT.md` is add-only:** new sections at the **top**; never rewrite or delete earlier sections.
8. **Watch invariant:** opening the phone app never cancels or suppresses Wear or FGS guidance. Foreground must not force-reconcile away watch/guided-alive intents.
9. **One plan writer:** `buildFourWeekPlan` (`app/src/lib/training/programPlanner.ts`) produces every plan day for every mode (Strength / Running / Hybrid). `audit:training-dual-paths` enforces it.
10. **Plan and prescription changes apply only to new builds** — never to started or guided sessions. Started sessions keep their planned sets frozen.
11. **Science claims cite** `docs/training/ROUTINE_AUDIT.md` or `docs/training/RUNNING_DESIGN.md` (N-0041). No uncited volume/load/intensity numbers.
12. **Catalogue = static exact-name match.** No fuzzy matching, no clinical copy authored in code.
13. **UI redesign N-0030 is parked** (D-0003). Do not implement Lumen/Hearth production chrome. Design Lab stays `__DEV__`-only (`designLabDevOnly.test.ts`).
14. **Copy:** mechanistic language is “associated with”, never “causes”.

---

## 4. Detection harness (run from `app/` unless noted)

| Check | Command | Notes |
|---|---|---|
| Types | `npm run typecheck` | `tsc --noEmit`, must be 0 errors |
| Unit | `npm test -- --reporter=verbose` | Always `--reporter=verbose`. On PowerShell, redirect to a file (`cmd /c "npm test -- --reporter=verbose > out.txt 2>&1"`) — piping through `Select-String` has stalled runs. Baseline 2026-09-20: **132 files / 806 tests**. |
| Dual-path | `npm run audit:training-dual-paths` | **Run in Git bash** (`"C:\Program Files\Git\bin\bash.exe" -lc "cd /c/Reclaim/app && npm run audit:training-dual-paths"`). System32 bash fails on CRLF. Baseline **27/27**. |
| Med catalogue | `npm run med-catalog-qa` | 357 rows, 0 governance issues |
| Ledger wrapper | `python -m pytest scripts/test_eif_node.py -q` (repo root) | 3 tests; skips if `.eif/runtime` absent |

Focused vitest first (`npx vitest run <path>`), then the full suite before commit.

---

## 5. EIF workflow — use `scripts/eif_node.py` only

The programme ledger lives in `.eif/program/` and is mutated **only** through `python scripts/eif_node.py` (repo root). **Never read or edit EIF runtime internals** (`.eif/runtime/**`, `engine.py`, `cli.py`, `store.py`). Never invoke the framework checkout at `C:\AI\…`.

```
python scripts/eif_node.py status [--node N-00xx]
python scripts/eif_node.py lease N-00xx
python scripts/eif_node.py evidence N-00xx --commit <sha> --path <file> --note "<what was proven>"
python scripts/eif_node.py complete N-00xx --commit <sha>
python scripts/eif_node.py await-approval N-00xx --renders .eif/audit/N-00xx
python scripts/eif_node.py human-check N-00xx --steps <steps.md>
python scripts/eif_node.py add --id N-00xx --title "..." --class feature --risk R2 --depends-on N-0001 --acceptance criteria.txt
python scripts/eif_node.py --dry-run <any of the above>
```

- Set `EIF_RUN` (e.g. `R20260921A`) once per session; default is `R<YYYYMMDD>`.
- Every mutation appends a line under “Ledger mutation log” in `docs/eif/PROGRESS.md`. Failures append the intended mutation to `docs/eif/LEDGER_PENDING.md` and exit non-zero — replay them, do not hand-edit the ledger.
- Generated views (`.eif/CURRENT.md`, `ROADMAP.md`, `WORK_ITEM.md`, `PROGRAM.md`, `ESCALATION.md`) are read-only outputs.
- Hooks are **off** (`.cursor/hooks.off`, `.cursor/hooks.json.off`). Leave them off.

Per node: `lease` → implement → harness → commit + push → `evidence` → `complete` **or** `await-approval` / `human-check`.

---

## 6. Durability

- Commit + push per node on `fix/training-confident-ux`. A node without a pushed commit is not done.
- Update `docs/eif/PROGRESS.md` resume pointer and node table in the same commit.
- Add a `CONTEXT.md` section (top) when state changes materially.
- **Resume from `docs/eif/PROGRESS.md`**, not from chat history. `docs/eif/RESUME.md` is the start prompt.

---

## 7. Approval protocol (never blocks the next node)

| Situation | Do |
|---|---|
| Change is **visible** to the user | Capture AVD renders into `.eif/audit/N-00xx/`, run `await-approval`, describe it in `docs/eif/AWAITING_APPROVAL.md`, **keep working** on the next node. The operator replies approve/reject per node. |
| Check needs a **real device, Play Console, or live DB** | Write the steps to a file, run `human-check`, which appends them to `docs/eif/HUMAN_CHECKS.md`. Continue. |
| Renders cannot be captured | Record `UNABLE_TO_VERIFY` with the methods tried in HUMAN_CHECKS; never claim visual review from source. |

Nothing ships from either queue until the operator approves. Committing to the branch is fine.

---

## 8. Mandate for the next agent

Complete **every remaining node in `docs/eif/CHARTER.md`** (original table + Stage C addendum), in the execute order given there, **without stopping**, except to park items in the two queues above. Start at the first unfinished node in `docs/eif/PROGRESS.md`. Do not start N-0030 or production chrome. Do not implement deferred items (fuzzy med matching, drug interactions, OCR, Google Fit, schema migrations without approval, Wear workout bridge beyond the N-0043 proposal).

If the repo contradicts the plan, stop that node, record the contradiction in PROGRESS.md, and move to the next independent node.

---

## 9. Emulator / adb / Metro (Windows)

- **SDK:** `%LOCALAPPDATA%\Android\Sdk`. `adb` is **not on PATH** — call `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (or add it for the session).
- `adb devices` should show `emulator-5554`. If `adb shell pm list packages` returns `Can't find service: package`, the AVD is not fully booted — wait or cold-boot it.
- **Screenshots:** `adb exec-out screencap -p > file.png` **only from `cmd /c`**; PowerShell `>` corrupts binaries. Or `adb shell screencap -p /sdcard/x.png` + `adb pull`.
- **Metro / dev client:** from `app/`, `npx expo start --dev-client`; `adb reverse tcp:8081 tcp:8081` so the emulator reaches Metro. HEAD debug client = 1.0.5 / vc15 debuggable (N-0010 dumpsys verified).
- **GPX playback (R3):** Emulator Extended Controls → Location → Routes → import `.gpx` and Play; or `adb emu geo fix <lon> <lat>` per point from a script. Set speed multiplier ≤ 2× for realistic cue timing.
- **Stale-session repro:** `EXPO_PUBLIC_STALE_SESSION_MINUTES=1` in `app/.env` (dev build) instead of waiting 5 h.
- Logcat: `adb logcat -d | findstr /i "Reclaim GUIDED STALE_SESSION HealthConnect"`.

---

## 10. Architecture hotspots (read before editing)

| Area | Authority |
|---|---|
| Guided training | DB `performed.sets` + `sessionWorkAuthority.ts` + `applySetCompletion()`; `TrainingSessionView.tsx` is display only |
| Stale session | `staleSessionGuard.ts` (decision) + `staleSessionTimerDisplay.ts` (header clock); `started_at` is never rewritten |
| Plan building | `programPlanner.ts › buildFourWeekPlan`; `scheduler.ts` was deleted (Writer B) — do not resurrect |
| Notifications | `NotificationIntentStore.setIntent` → `NotificationScheduler.reconcileNotifications` |
| Account delete | `dataPrivacy.deleteAllPersonalData` → Edge Function `delete-account` (service role; **not yet deployed**, see HUMAN_CHECKS) → client fallback = RLS-allowed tables only |
| Health Connect | `healthConnectMetrics.ts` + `plugins/withHealthConnectPermissions.js`; declared = requested = used |
| Med detail | `useMedDetailContext` + `InsightsProvider` SSOT; `medCatalog*.ts`, `medCatalogGovernance.ts` |
| Insights | `InsightsProvider` → `contextBuilder` → `InsightEngine` |
| Screen spacing | Parent `reclaimSectionSpacing` owns gaps; nested AppCards pass `marginBottom={0}` |

Locate symbols by **name**, not by line numbers from older audits.
