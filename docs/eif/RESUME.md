# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-09-21 checkpoint — continue, do not rediscover:** N-0058 account-switch and
cleanup race is source-fixed; 141 files / 900 tests pass. N-0051 source re-review is
recorded; N-0047 stays AVD-blocked after the prescribed retry (N-0056). Resume at
**N-0032 reviewed-medication label gate**. N-0019 assessed live policy metadata:
sleep owner policies exist, but anonymous app_logs SELECT is unsafe (N-0063,
release blocker; additional live migration approval required). No log rows read
or policy changed. Latest harness 143 files / 906 tests. N-0018 pushed 6787613 /
EV-0028; N-0062 owns separate post-save/draft findings.
N-0017 is parked on the native-transport contradiction:
actual plugin/helper use prohibited background-actions. N-0061 owns correction;
N-0059/N-0060 are chartered notification findings. N-0058 commit 638ccfb / EV-0026. The
public EIF gate payload contract remains unavailable (N-0053): do not guess event
schemas or read runtime internals. PROGRESS.md has the latest commit/evidence
pointer. Preserve unrelated dirty files; hooks remain off. Metro/AVD are stopped.

N-0032 entry points already located: `medCatalog.ts` has confidence/sourceNote but
no review metadata; never infer a review from either. `medProfileMode.ts` and
`medDetailPresentation.ts` return curated for any match; current visible badge is
"Educational reference matched", not the old audit's "Curated profile available".
Use explicit fail-closed review metadata, preserve exact matching and all 357 rows,
and do not invent reviewed provenance or author clinical copy. Tests live under
`components/meds/__tests__`. This is preparation, not an implemented N-0032 fix.

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
