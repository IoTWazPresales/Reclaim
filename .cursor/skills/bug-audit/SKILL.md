---
name: bug-audit
description: >-
  Read-only defect audit for Reclaim. Validates smoke-test / device feedback into
  a ranked, evidence-anchored defect register. NEVER edits code until the Human
  explicitly asks to fix. Use when Human says audit, don't change anything, deep
  audit, why is X broken, or device-smoke feedback needs root causes.
---

# Bug Audit (read-only)

## When to trigger

- Human reports device-smoke / preview-build feedback and wants root causes, not a fix.
- Any message containing "audit", "don't change anything", "deep audit", "why is X broken".
- Before opening a fix PR on a subtle guided-training / notifications / insights defect.

Do NOT trigger for a known one-line fix the Human has already scoped.

## Hard rules

1. READ-ONLY until the Human explicitly says "fix"/"implement". No edits, no migrations, no commits.
2. Every claim carries `file:line` evidence. If you can't cite it, mark it UNVERIFIED — never assert.
3. Validate the reporter's hypothesis against source before repeating it. State CONFIRMED / REFUTED / UNVERIFIED per claim.
4. Best-path fix directions only. Name the thin/patch alternative and REJECT it with why. Never present a patch as the recommendation.
5. Respect frozen invariants (below). If a fix would break one, say so.
6. Deep/ambiguous audits go through a Fable/Opus consult gate before ranking (see Consult gate). Prefer Fable when Human names it; otherwise Opus (dual-agent-fable skill).

## Sync pin (fill every run)

- Branch + commit (e.g. `fix/training-confident-ux @ 7639c35`), pushed? y/n
- Build under test (EAS preview URL if any)
- Consultant model + mode (CONSULT / none)
- Next expected step (audit only / await Human fix gate)

## Frozen invariants (do not casually break in fix plans)

- Guided completion: DB `performed.sets` + `sessionWorkAuthority` + one canonical `applySetCompletion`. UI Done, phone SET_DONE, watch SET_DONE all use `guidedSetCompletionCanonical`.
- Notifications: `setIntent` + `reconcileNotifications` are the ONLY scheduling authority. Never schedule directly.
- "What's next" = DB session cursor (`current_exercise_index`), never `pending[0]`.
- Meds: educational/contextual only; catalogue = exact-name match, no fuzzy.

## Reclaim domains to sweep

- **Wear / guided:** action channel (`SET_DONE`/`NEXT_SET`, `opensAppToForeground`), `useNotifications.ts` delivery/drain, `scheduleGuidedTrainingAfterSetPersist`, `buildNotificationWorkChain` cursor arg, `computeRestSecondsAfterCompletingSet` option parity.
- **Notifications:** intent store, reconciler, cold-start replay, AppState drain, deep-link overlays (`SetFocusOverlay` re-confirm remnants).
- **Insights surfaces:** signal ledger write/read symmetry, backfill presence, standalone-page vs embed justification.
- **Spacing:** `AppCard` default `marginBottom` vs parent `reclaimSectionSpacing` double-gap; per-screen ad-hoc margins.

## Method

1. Restate the Human's reported symptoms verbatim.
2. For each symptom, locate the code path (grep / read). Read the actual function, not the comment.
3. Prove or refute the root cause with `file:line`. Note asymmetries between phone / notification / watch paths — most guided bugs are parity gaps.
4. Rank by user-visible harm to the core promise, then honesty, then polish.
5. Consult gate for deep/forked audits before finalising ranking.
6. Deliver Human feedback: problems · potential fixes · fixed workflow. Do not implement.

## Consult gate (Fable/Opus)

Escalate via `dual-agent-fable` when: a product fork blocks ranking (kill vs rebuild), a fix would touch a frozen invariant, or root cause spans >2 subsystems. Prefer returning READY with a recommended fork stated over asking. Ask the Human at most 5 questions, only if a fork truly blocks the register.

Write seeds under `.tmp/<topic>_consult_<opus|fable>_seed.md` (never commit `.tmp/`).

## Output template

```
CONSULT: READY | NEED_HUMAN | STOP
Sync pin: ...
Operator experience (fixed world): one sentence.

Defect register (ranked):
- ID | severity | symptom | root cause (CONFIRMED/REFUTED/UNVERIFIED) | evidence file:line | best-path fix direction

Rejected thin alternatives: <thin> — REJECT because <why>

Fixed workflow: what the corrected flow does, step by step.

Unit split (only if Human asks to fix; ordered, no implement now): U1..Un
Open questions (max 5, only if a fork blocks): ...
```

## Never

- Never edit, migrate, or commit during an audit.
- Never recommend the smallest-diff path when a stronger architecture keeps governance.
- Never assert a root cause you didn't open the file for.
- Never claim Wear "live workout" when the channel is notification actions only — name the real channel.
