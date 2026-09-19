# EIF programme progress — PRG-20260917T222550

Durable resume file. Next session: start at the first unfinished node below. Do not reconstruct from chat.

**Branch:** `fix/training-confident-ux` (never `main`)
**Programme:** PRG-20260917T222550
**Ledger interface:** `python -B .eif/runtime/programme/program.py`
**Hooks:** off (`.cursor/hooks.off`, `.cursor/hooks.json.off`)

## Resume pointer

- **Stage:** A discovery (A0 done)
- **First unfinished:** A1 baseline commands, then A2 (N-0010), A3 (N-0013), A4–A7, Stage B charter, GATE 1
- **Do not start Stage C** until the operator replies at GATE 1

## Ledger snapshot (after A0)

- **Revision:** 29
- **A0 commit:** pending (this file lands in the A0 commit)
- **N-0004:** rejected (was child of N-0001; blocked leaf completion)
- **N-0013:** new root `N13-generator-science-audit`, same criteria as N-0004
- **N-0011:** `depends_on` patched to N-0013

## Nodes

| Node | Title | Status | Commit | Evidence | Next |
|---|---|---|---|---|---|
| N-0001 | N1-source-discovery | complete (derived after N-0004 reject + operator accept) | 652b92b | EV-0001 `docs/eif-bootstrap/PHASE_2.md` | — |
| N-0012 | N12-run-detection-harness | complete | 652b92b | EV-0001 `docs/eif-bootstrap/PHASE_2.md` | A1 re-run this session |
| N-0002 | N2-goal-setter-sweep-vitest | complete | 2f9a70c | EV-0002 `app/src/lib/training/__tests__/goalSetterSweeps.test.ts` | — |
| N-0003 | N3-retire-scheduler-split-dual-authority | complete | 995c98d | EV-0003 `app/src/lib/training/__tests__/splitWriterUnification.test.ts` | — |
| N-0004 | N4-generator-science-audit | **rejected** | — | note: re-homed to N-0013 | N-0013 |
| N-0013 | N13-generator-science-audit | proposed (frontier) | — | A3 harness + `docs/training/ROUTINE_*.md` | A3 |
| N-0006 | N6-notification-single-writer | complete | 5cf9a2d | EV-0004 `docs/eif-bootstrap/PHASE_3.md` | — |
| N-0008 | N8-edge-to-edge-insets | proposed **PARTIAL** | 2c59e74 | EV-0005 PHASE_3 remaining 140 fudge | C-I |
| N-0005 | N5-onboarding-source-of-truth | proposed (frontier) | — | — | A4 then charter |
| N-0007 | N7-training-loading-query-truth | proposed (frontier) | — | — | A4 then charter |
| N-0009 | N9-ui-surface-enumeration | proposed (frontier) | — | A5 `docs/design/UI_AUDIT.md` | A5 |
| N-0010 | N10-HEAD-debug-dev-client | proposed (frontier) | — | A2 dumpsys | A2 |
| N-0011 | N11-session-volume-and-load-model | proposed (blocked on N-0013) | — | Stage C F1–F6 | after N-0013 |

## Frontier after A0

N-0005, N-0007, N-0013, N-0008, N-0009, N-0010

## A1–A7 / B status

| Step | Status | Evidence |
|---|---|---|
| A0 ledger | done | this file + PROGRAM_LOG rev 29 |
| A1 baseline | unfinished | — |
| A2 N-0010 AVD | unfinished | no device attached at A0 time |
| A3 routine harness + audit | unfinished | — |
| A4 APP_AUDIT | unfinished | — |
| A5 UI_AUDIT | unfinished | — |
| A6 three directions | unfinished | — |
| A7 MARKET_AUDIT | unfinished | — |
| B charter | unfinished | GATE 1 stop |
| C execute | **blocked** until operator GATE 1 reply | — |
