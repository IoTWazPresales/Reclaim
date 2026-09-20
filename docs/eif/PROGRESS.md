# EIF programme progress — PRG-20260917T222550

Durable resume file. Next session: start at the first unfinished node below. Do not reconstruct from chat.

**Branch:** `fix/training-confident-ux` (never `main`)
**Programme:** PRG-20260917T222550
**Ledger interface:** `python -B .eif/runtime/programme/program.py` (global flags before subcommand)
**Hooks:** off (`.cursor/hooks.off`, `.cursor/hooks.json.off`)

## Resume pointer

- **Stage:** C execute. C-D parked (D-0003). Corrections N-0036/N-0037/N-0038 complete. N-0007 code landed, **AWAITING_APPROVAL** (do not complete until visual approve). Next unfinished implement: **N-0016** (stale timer audit). Do not implement Lumen/Hearth production chrome. N-0033 waits on unparked C-D.
- **First unfinished:** N-0016 (N-0007 waits visual approval).
- **N-0005:** `7dbeeb7`
- **N-0036 / N-0037 / N-0038 / N-0007 code:** `35e51a5`
- **Watch-alive:** invariant on N-0017 — opening the phone must not stop watch notifications/guidance.
- **Ledger rev:** 105 (`R20260920C`)

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
| N-0030 | C-D UI direction | **deferred** D-0003 | — | DESIGN_EXPERIENCE_RECORD | unpark grant |
| N-0031 | C-F features | **split** | — | GATE1-FEATURES | N-0033–35 |
| N-0032 | C-M med curation-tier | proposed (frontier) | — | AA-09 | wave 2 |
| N-0033 | C-F Home why-this-session | proposed | — | waits C-D | after unpark |
| N-0034 | C-F technique illustrations | proposed | — | CHARTER | later |
| N-0035 | C-F association chips | proposed | — | CHARTER | wave 2+ |
| N-0036 | C-N HC declared=requested=used | **complete** | 35e51a5 | EV-0011 healthConnectPermissionUse.test.ts | — |
| N-0037 | C-N server-side account deletion | **complete** | 35e51a5 | EV-0012 delete-account fn; live wipe HUMAN_CHECKS | — |
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
| C execute | **in progress** — corrections N-0036–38 done; N-0007 AWAITING_APPROVAL; wave 2 next **N-0016** | — |
