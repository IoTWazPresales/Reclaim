# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-09-28 checkpoint — continue, do not rediscover:** Read the latest N-0065
entry in PROGRESS.md and baseline/N0065_INSIGHT_COPY_REVIEW.md for exact gate results.
The static-copy implementation is preserved; visual acceptance remains queued.
Next bounded source node is N-0067 (neutral category headings), then outstanding
wave-2 safety findings. CHECKPOINT_REVIEW.md gives the full completed/outstanding
breakdown; HANDOFF_CURSOR.md provides an optional minimal continuation prompt.
N-0066 owns the newly chartered stale timer promotion/dismissal race alongside N-0059.
N-0029 is pushed at c8be0ed / EV-0037; System32/WSL lacks rg (human check).
N-0062 (1c05ff5 / EV-0038) and N-0064 have source gates green, visual acceptance queued. N-0027 is
pushed at **429cee8 / EV-0035** (source validated, EIF quality closure blocked by
N-0053). N-0028 is pushed at **942928d / EV-0036** (source validated, visual review
queued). N-0032 review-tier labels remain pushed; all 357 catalogue rows remain
unreviewed, without invented provenance. Last passing full default verbose harness:
**150 files / 953 tests PASS** at N-0060, types 0, dual-path 27/27, catalogue 357/0.
N-0065's later default run had 950/953 with three 5000ms timeouts; its bounded
retry passed all 150 files / 953 tests (reconciled September 29). Never relabel
that default run as passing. Source acceptance has this timeout limitation.
N-0052 still owns Windows harness stalls; sandbox-denied subprocess creation is not
a product failure. Preserve existing source/evidence and do not rerun completed nodes.

N-0058 deletion race pushed 638ccfb / EV-0026; N-0018 mood guard pushed 6787613 /
EV-0028. N-0019 assessment pushed 593dd9b / EV-0029: sleep policies exist, but live
anonymous app_logs SELECT is unsafe (N-0063; release blocker; additional live
migration approval required). No log rows read or policy changed. N-0017 is parked
because the actual guided plugin/helper use forbidden background-actions; N-0061
owns correction. N-0059/N-0060/N-0062 are chartered notification/mood findings.

N-0056 recovered through the operator's normal `npm run android` workflow: close the
failed initial instance, retain Metro, press `a`, bundle, render Reclaim. Home/Settings
and account-delete confirmation/cancel renders were obtained. Old manual-APK defects
are historical. N-0056's ledger blocker is stale; unblock contract remains N-0053.
Later ADB detached; read-only checks on 2026-09-28 found no device or reachable Metro.
Do not repeat manual recovery loops or reinstall historical APKs. Preserve any working
session. N-0026 actual-product TTF, N-0047 verified throwaway deletion and other journeys
remain unverified. N-0064 owns the rendered medication empty-state contradiction;
N-0065 owns broader unsupported certainty in static insight copy. Public EIF gate
payload contract remains unavailable (N-0053), with historical debt N-0054: no schema
guessing or runtime reads. PROGRESS.md has commit/evidence pointers.
Preserve unrelated dirty files; hooks stay off. No final build has been started.

**Read, in this order, and nothing else first:**

1. `AGENTS.md` — canonical rules, invariants, harness, EIF wrapper, approval protocol.
2. `docs/eif/PROGRESS.md` — resume pointer and node table. The **first unfinished node** there is your starting point.
3. `docs/eif/CHARTER.md` — full node list with acceptance criteria and execute order (original table + Stage C addendum).
4. `docs/eif/AWAITING_APPROVAL.md` — visible changes waiting on the operator. Do not mark those nodes complete; do not redo them.
5. `docs/eif/HUMAN_CHECKS.md` — device / Play Console / live-DB steps only a human can run. Do not block on them.

**Then:**

- `python scripts/eif_node.py status` to confirm the ledger loads and matches PROGRESS.md.
- Resume at the first unfinished node. For each node: `lease` → implement → harness (typecheck, full vitest verbose, dual-path in Git bash, med-catalog-qa) → commit + push → `evidence` → `complete`, or `await-approval` / `human-check` when the protocol in AGENTS.md §7 applies.
- Update `docs/eif/PROGRESS.md` in the same commit as the code. Add a `CONTEXT.md` section at the top when state changes materially.
- **Run to completion**: work through every remaining node in CHARTER.md order without stopping for confirmation. Only the two queues above park work; nothing else does.
- If the repo contradicts the plan for a node, record the contradiction in PROGRESS.md, skip to the next independent node, and continue.

Do not read `.eif/runtime/**`. Do not implement N-0030 or production chrome. Do not implement deferred items listed in AGENTS.md §8.
