# Optional Cursor continuation - Reclaim only

Prepared 2026-09-28. No editor configuration, model selection or migration was
performed. This works as a continuation prompt in the existing agent too.
The current state and outstanding work are in `CHECKPOINT_REVIEW.md` and
`PROGRESS.md`; do not treat this file as a second programme ledger.

## Recommended setup

Open the existing **C:\Reclaim** folder in Cursor, not just its app subfolder.
Use one local Agent conversation with access to the existing Windows terminal,
SDK and files. Do not create a cloud worker, second checkout or parallel agent
writer. End the existing writing session before another agent starts.

For Cursor's own Agent, my cost-conscious recommendation is **GPT-5.6 Sol** from
your available picker for bounded implementation, with **Claude Opus** reserved
for the native-service/security/race work or a fresh review. This is a task-fit
recommendation, not a benchmark claim that either beats Astra. Cursor's official
model guide identifies both for complex
multi-step work, and availability depends on account/plan:
[Cursor available models](https://prod.cursor.com/help/models-and-usage/available-models).
Select a named model rather than Auto if reproducible reviewer identity matters.

If you instead use the **Codex extension inside Cursor**, Astra at High/Extra High
is a suitable choice for the difficult FGS/race reviews; GPT-6 Sol at Medium is
the implementation default, increasing to High when needed, when available. Avoid Ultra's automatic
delegation for this single-writer programme. Official guidance describes these
roles and the reasoning trade-off:
[OpenAI model guidance](https://learn.chatgpt.com/docs/models).
Higher reasoning costs more time/tokens; use it for difficult decisions, not for
re-reading all historical documents on every node. Changing editor does not
guarantee fresh usage allowance; check the account used by the selected agent.

Do not install another EIF framework, enable hooks or change repository rules.
Existing local `.agents/skills` and the wrapper are the framework interface.
Do not require a whole-repository indexing/discovery pass before starting.

## Paste this continuation prompt

```text
Continue Reclaim PRG-20260917T222550 in C:\Reclaim. This is continuation, not a
new discovery project. Work only on fix/training-confident-ux, never main.

Read AGENTS.md, docs/eif/RESUME.md, PROGRESS.md's latest resume pointer and node
table, and CHECKPOINT_REVIEW.md. Read .eif/CURRENT.md and WORK_ITEM.md as generated
views. Then run scripts/eif_node.py status and inspect git branch/status/log.
Preserve and reconcile all uncommitted work; do not reset, clean or bulk-stage.

N-0065's 89-record static copy audit is source-validated and queued for actual
renders/approval. Do not redo it. Next bounded source work is N-0067 category
headings, followed by outstanding wave-2 safety findings (N-0061/N-0017/N-0059,
N-0066, N-0063). Read only the selected node's acceptance/baseline and its direct
source dependencies after the short state check; no Stage 0/1 rediscovery.

Use executive-orchestrator and the relevant local specialist skills, sequentially.
Single writer: no subagents/parallel agent work. Hooks remain OFF. Ledger mutations
ONLY through python scripts/eif_node.py. Never read EIF runtime internals or invoke
C:\AI framework code. Set one EIF_RUN for this session. Do not invent gate schemas:
N-0053 needs the public contract; N-0054 owns historical gate debt.

Before runtime work, use bounded read-only ADB/Metro checks. Preserve a working
session. Canonical lifecycle is cd C:\Reclaim\app; npm run android. The operator
recovered initial-launch timeout by closing the failed app, keeping Metro alive
and pressing a. Historical APK defects are not current proof. No old APK install,
manual reverse reconstruction, networking changes, prebuild --clean, emulator
wipe or app data clear. If the canonical environment fails again, stop runtime
recovery and report it rather than looping. Source-side independent work can
continue. Never pass a journey from startup alone.

Per node: lease; source-of-truth note; bounded implementation; focused tests; full
verbose Vitest, typecheck, Git Bash dual-path audit and required acceptance gates;
record evidence; update PROGRESS and add-only CONTEXT; explicit-path commit/push;
wrapper evidence and completion or approval/human-check queue; checkpoint queue
changes and release lease. Preserve invariants and final release blockers.

Do not touch live schema without required authority. N-0047 requires a verified
throwaway mailbox, never deletion of Warren's real account. Keep personal renders,
raw logs, secrets, local framework artifacts and unrelated dirty files uncommitted.
No source validation is permission to ship. Report accurate done/outstanding work
at a durable node boundary before usage is exhausted. Do not claim to observe a
remaining account percentage unless the environment actually exposes it.
```

## Local state to preserve

- Unrelated tracked edits: `.cursorignore`, `app/supabase/.temp/cli-latest`,
  `docs/audits/insight-rules-audit.md`,
  `docs/release/play_human_outstanding_2026-07-29.md`.
- Untracked framework files, raw test outputs, personal screenshots/XML and local
  releases exist. A fresh clone will not contain all of them. Prefer this existing
  folder; do not commit them wholesale to make a handoff work.
- The full harness can rewrite `docs/training/ROUTINE_VOLUME_BASELINE.md`; inspect
  any diff and do not mix unrelated generated baseline changes into a copy node.
- Recent tests are recorded per node. Re-run for new source work; do not repeat
  every historical harness or imply that a recent pass closes old runtime gates.

## Efficient catch-up budget

First establish branch, dirty work, ledger/lease, latest checkpoint and the next
node. Report those in a few lines. Then inspect the relevant implementation. If
saved evidence matches the tree, use it; widen discovery only for a concrete
contradiction. Do not paste this entire chat or every old audit into a new context.
The EIF records are the handoff memory, not a reason to rediscover the app.
