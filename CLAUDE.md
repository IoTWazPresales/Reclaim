@AGENTS.md

# Claude Code — Reclaim notes (Claude-specific only; rules live in AGENTS.md)

## Model use
- Default executor for routine nodes (copy sweeps, insets, tests, docs, R1 hygiene).
- Use the **strongest available model** for the high-risk nodes: guided notifications **N-0017**, the F2 plan-build path **N-0021**, the running FGS / location work **N-0042**, and anything touching account deletion **N-0037 / `delete-account`**. If you are not the strongest model, say so in PROGRESS.md before starting those nodes.

## Keep context small
- Read `docs/eif/PROGRESS.md` and the current node (`python scripts/eif_node.py status --node N-00xx`) first. Do not read whole docs, the ledger log, or `.eif/runtime/**`.
- Open only the files the node touches plus their tests. Use `npx vitest run <path>` for the focused loop; run the full suite once before commit.
- `CONTEXT.md` is long: read the top two sections only.
