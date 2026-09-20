# EIF programme progress — PRG-20260917T222550

Durable resume file. Next session: start at the first unfinished node below. Do not reconstruct from chat.

**Branch:** `fix/training-confident-ux` (never `main`)
**Programme:** PRG-20260917T222550
**Ledger interface:** `python scripts/eif_node.py` (wrapper; see `AGENTS.md` §5). Never call `program.py` or read `.eif/runtime/**` directly.
**Hooks:** off (`.cursor/hooks.off`, `.cursor/hooks.json.off`)
**Canonical rules:** `AGENTS.md` (repo root). Start prompt: `docs/eif/RESUME.md`.

## Resume pointer

- **Stage:** operator Stage 1 Supabase follow-ups (N-0044–N-0051) before wave 2. Single writer; review consolidated into the final build. N-0030 stays parked and production chrome is excluded. N-0007/N-0016 require AVD journeys before completion.
- **Resume:** N-0044 validated and pushed `137055d` / EV-0017, but ledger completion rejects QUALITY_GATE. N-0053 wrapper public operations pass 14 tests; gate payload documentation still blocks closure (ESCALATION.md). Continue N-0045/N-0046 if the wrapper admits the lease; otherwise record dependency blocker and advance N-0017. Do not repeat full discovery or guess gate schemas. After Stage 1, follow the operator's wave order.
- **Deployment correction:** Supabase CLI confirms `delete-account` ACTIVE version 1 / verify_jwt=true. The former undeployed notes are superseded; live throwaway wipe remains unverified.
- **N-0005:** `7dbeeb7`
- **N-0036 / N-0037 / N-0038 / N-0007 code:** `35e51a5`
- **Watch-alive:** invariant on N-0017 — opening the phone must not stop watch notifications/guidance.
- **Ledger run:** `R20260920D`; obtain current revision from `python scripts/eif_node.py status`.

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
| N-0045 | S1 schema snapshot and drift guard | proposed | — | acceptance/N-0045.txt | after N-0044 |
| N-0046 | S1 client account vs data deletion | proposed | — | acceptance/N-0046.txt | after N-0044 |
| N-0047 | S1 AVD throwaway deletion | proposed | — | acceptance/N-0047.txt | after N-0045/46 |
| N-0048 | S1 program-view invoker security | proposed | — | acceptance/N-0048.txt | Stage 1 |
| N-0049 | S1 function execution grants | proposed | — | acceptance/N-0049.txt | Stage 1 |
| N-0050 | S1 function search paths | proposed | — | acceptance/N-0050.txt | after N-0049 |
| N-0051 | S1 advisors and combined review | proposed | — | acceptance/N-0051.txt | after N-0047–50 |
| N-0052 | Windows full-harness reproducibility | proposed | — | ESCALATION.md; acceptance/N-0052.txt | before final release gate |
| N-0053 | Wrapper public gate operations | partial; public payload schema blocker | this change | 14/14 wrapper tests; baseline/N0053_WRAPPER_GATES.md | release lease; continue product work |
| N-0054 | Historical gate debt reconciliation | proposed | — | public inspect health; ESCALATION.md | after N-0053 |
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
| N-0011 | C-R F4 weekly volume model | proposed (blocked F1–F3) | — | CHARTER | after N-0022 |
| N-0014 | C-N account-delete | **complete** | bde770f | EV-0008 personalDataTables.test.ts | — |
| N-0015 | C-N HC request-set | **complete** | dc37092 | EV-0009 healthConnectRequestSet.test.ts | — |
| N-0016 | C-G stale timer audit | **AWAITING_APPROVAL** (in_progress, rev 3) | 4735228 | EV-0015 staleSessionTimerDisplay.test.ts; renders UNABLE_TO_VERIFY (HUMAN_CHECKS) | visual approve then `complete` |
| N-0017 | C-N mid-guided notifs | proposed (frontier) | — | AA-06 | wave 2 |
| N-0018 | C-N mood submit lock | proposed (frontier) | — | AA-08 | wave 2 |
| N-0019 | C-N RLS sleep policies | proposed (frontier) | — | AA-07 | wave 2 |
| N-0020 | C-R F1 taxonomy | proposed (frontier) | — | ROUTINE_AUDIT | wave 3 |
| N-0021 | C-R F2 wrapper | proposed | — | depends N-0020 | after F1 |
| N-0022 | C-R F3 loads | proposed | — | depends N-0021 | after F2 |
| N-0023 | C-R F5 progression | proposed | — | depends N-0011 | after F4 |
| N-0024 | C-R F6 CI gate | proposed | — | depends N-0011 | after F4 |
| N-0025 | C-G rest/Doze/FGS | proposed | — | depends N-0010 | after A2 |
| N-0026 | C-P permission off first render | proposed (frontier) | — | AA-11 | wave 2 |
| N-0027 | C-T U5 Sentry | proposed (frontier) | — | AA-14 | wave 2 |
| N-0028 | C-L associated-with | proposed (frontier) | — | AA-12 | wave 2 |
| N-0029 | C-H CRLF + memory files | proposed (frontier) | — | AA-13 | wave 2 |
| N-0030 | C-D UI direction | **deferred** D-0003 | — | DESIGN_EXPERIENCE_RECORD | unpark grant |
| N-0031 | C-F features | **split** | — | GATE1-FEATURES | N-0033–35 |
| N-0032 | C-M med curation-tier | proposed (frontier) | — | AA-09 | wave 2 |
| N-0033 | C-F Home why-this-session | proposed | — | waits C-D | after unpark |
| N-0034 | C-F technique illustrations | proposed | — | CHARTER | later |
| N-0035 | C-F association chips | proposed | — | CHARTER | wave 2+ |
| N-0036 | C-N HC declared=requested=used | **complete** | 35e51a5 | EV-0011 healthConnectPermissionUse.test.ts | — |
| N-0037 | C-N server-side account deletion | **complete** (code) | 35e51a5, 4bd2bd5 | EV-0012 / EV-0016; deployment ACTIVE v1 confirmed R20260920D; live wipe unverified | N-0044–47 follow-ups |
| N-0038 | C-H Design Lab __DEV__-only | **complete** | 35e51a5 | EV-0013 designLabDevOnly.test.ts | — |
| N-0039 | R0 session calorie SoT | proposed | — | CHARTER | after N-0036 |
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
