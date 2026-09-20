# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

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
