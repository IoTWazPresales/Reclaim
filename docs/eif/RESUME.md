# RESUME — start prompt for the next agent (tool-agnostic)

Paste this into Claude Code, Codex CLI, Cursor, or any other agent working in `C:\Reclaim`.

---

You are continuing the Reclaim programme `PRG-20260917T222550` on branch `fix/training-confident-ux`. Never touch `main`.

**2026-09-21 checkpoint — continue, do not rediscover:** Resume at **N-0026**,
then N-0027 → N-0028 → N-0029 and wave-2 findings. N-0032 review-tier labels are
pushed at **7f0c289 / EV-0030**; all 357 catalogue rows remain unreviewed, without invented provenance
or clinical copy. Latest harness **145 files / 918 tests**, types 0, dual-path 27/27,
catalogue 357/0, wrapper 14/14. Use the existing 30-second test timeout workaround;
N-0052 owns default-run reproducibility.

N-0058 deletion race pushed 638ccfb / EV-0026; N-0018 mood guard pushed 6787613 /
EV-0028. N-0019 assessment pushed 593dd9b / EV-0029: sleep policies exist, but live
anonymous app_logs SELECT is unsafe (N-0063; release blocker; additional live
migration approval required). No log rows read or policy changed. N-0017 is parked
because the actual guided plugin/helper use forbidden background-actions; N-0061
owns correction. N-0059/N-0060/N-0062 are chartered notification/mood findings.

AVD EOF/ANR remains N-0056-blocked after the prescribed retry; do not repeat the
same restart loop or claim product renders. Metro/AVD are stopped. Public EIF gate
payload contract remains unavailable (N-0053), with historical debt N-0054: no
schema guessing or runtime reads. PROGRESS.md has commit/evidence pointers.
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
