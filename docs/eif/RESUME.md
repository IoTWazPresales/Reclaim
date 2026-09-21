# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-09-21 checkpoint — continue, do not rediscover:** Stage 1 code and security
migrations are pushed through N-0050 (`67ebba9`); advisors are zero ERROR. Combined
N-0051 review found **N-0058 account-switch / deletion-cleanup race**, the next source
node and a release blocker. Read its acceptance file and N0051_STAGE1_REVIEW.md,
then lease it. N-0047 stays AVD-blocked after the prescribed retry (N-0056). The
public EIF gate payload contract remains unavailable (N-0053): do not guess event
schemas or read runtime internals. PROGRESS.md has the latest commit/evidence
pointer. Preserve unrelated dirty files; hooks remain off. Metro/AVD are stopped.

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
