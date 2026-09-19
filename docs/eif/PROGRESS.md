# EIF programme progress — PRG-20260917T222550

Durable resume file. Next session: start at the first unfinished node below. Do not reconstruct from chat.

**Branch:** `fix/training-confident-ux` (never `main`)
**Programme:** PRG-20260917T222550
**Ledger interface:** `python -B .eif/runtime/programme/program.py`
**Hooks:** off (`.cursor/hooks.off`, `.cursor/hooks.json.off`)

## Resume pointer

- **Stage:** C execute. Operator: **Hearth**; C-F = why-this-session, technique illustrations, association chips. Watch-alive is an invariant on N-0017.
- **First unfinished:** N-0005 (onboarding retry).
- **N-0014:** in this commit (complete after ledger).

## Ledger snapshot

- **Revision:** 57
- **A0 commit:** `cf12b4d`
- **GATE 1 commit:** `aabab35`
- **N-0004:** rejected (child of N-0001)
- **N-0013:** complete (A3 harness + ROUTINE_AUDIT)
- **N-0011:** retitled F4; `depends_on` N-0020, N-0021, N-0022
- **N-0030:** Hearth (ready, blocked on N-0009)
- **N-0031:** split → N-0033, N-0034, N-0035

## Nodes

| Node | Title | Status | Commit | Evidence | Next |
|---|---|---|---|---|---|
| N-0001 | N1-source-discovery | complete | 652b92b | EV-0001 PHASE_2 | — |
| N-0012 | N12-run-detection-harness | complete | 652b92b | EV-0001 PHASE_2 | — |
| N-0002 | N2-goal-setter-sweep-vitest | complete | 2f9a70c | EV-0002 | — |
| N-0003 | N3-retire-scheduler-split-dual-authority | complete | 995c98d | EV-0003 | — |
| N-0004 | N4-generator-science-audit | **rejected** | — | re-homed | N-0013 |
| N-0013 | N13-generator-science-audit | **complete** | aabab35 | EV-0006 ROUTINE_VOLUME_BASELINE | C-R F1 |
| N-0006 | N6-notification-single-writer | complete | 5cf9a2d | EV-0004 PHASE_3 | — |
| N-0008 | N8-edge-to-edge-insets | proposed **PARTIAL** | 2c59e74 | EV-0005 remaining 140 | C-I |
| N-0005 | N5-onboarding-source-of-truth | proposed (frontier) | — | APP_AUDIT AA-03 | wave 1 |
| N-0007 | N7-training-loading-query-truth | proposed (frontier) | — | APP_AUDIT AA-04 | wave 2 |
| N-0009 | N9-ui-surface-enumeration | proposed | — | `docs/design/UI_AUDIT.md` | A2 shots |
| N-0010 | N10-HEAD-debug-dev-client | proposed (dumpsys VERIFIED) | aabab35 | `docs/eif/baseline/A2.md` | operator accept |
| N-0011 | C-R F4 weekly volume model | proposed (blocked F1–F3) | — | CHARTER | after N-0022 |
| N-0014 | C-N account-delete | **complete** | bde770f | EV-0008 personalDataTables.test.ts | N-0015 |
| N-0015 | C-N HC request-set | **complete** | pending | EV-0009 healthConnectRequestSet.test.ts | N-0005 |
| N-0016 | C-G stale timer audit | proposed (frontier) | — | AA-05 | wave 2 |
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
| N-0030 | C-D UI direction | **blocked** | — | GATE1-UI-DIRECTION | operator |
| N-0031 | C-F features | **blocked** | — | GATE1-FEATURES | operator |
| N-0032 | C-M med curation-tier | proposed (frontier) | — | AA-09 | wave 2 |

## A1–A7 / B status

| Step | Status | Evidence |
|---|---|---|
| A0 ledger | done | `cf12b4d` |
| A1 baseline | done | `docs/eif/baseline/A1_BASELINE.md` |
| A2 N-0010 AVD | dumpsys **VERIFIED**; logged-in UI **UNABLE_TO_VERIFY** | `docs/eif/baseline/A2.md` |
| A3 routine harness + audit | done | `docs/training/ROUTINE_VOLUME_BASELINE.md`, `ROUTINE_AUDIT.md` |
| A4 APP_AUDIT | done | `docs/eif-bootstrap/APP_AUDIT.md` |
| A5 UI_AUDIT | source done; visual **UNABLE_TO_VERIFY** | `docs/design/UI_AUDIT.md` |
| A6 three directions | Design Lab in source; adb shots **UNABLE_TO_VERIFY** | `docs/design/DIRECTIONS.md` |
| A7 MARKET_AUDIT | done | `docs/product/MARKET_AUDIT.md` |
| B charter | done | `docs/eif/CHARTER.md` |
| C execute | **in progress** — Hearth + C-F chartered; N-0014 this commit | — |
