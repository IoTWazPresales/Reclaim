# P0-3 Recovery progression contract (implementation note)

Date: 2026-04-25

## Root cause

Recovery progression persistence existed (`currentStageId`, `currentWeek`, `completedStageIds`) but no runtime path wrote progression from completion signals. Dashboard rendered completion-like state from `computeRecoveryActionSteps`, while `recovery:progress:v1` remained unchanged (commonly week 1/foundation).

## Contract

- Recovery stage advancement is now driven by a deterministic completion event:
  - when all current stage action steps are `done`, progress is advanced once for that stage.
- Progression is idempotent per stage:
  - if `completedStageIds` already includes the current stage, no further advancement occurs for that stage.
- Advancement writes authoritative recovery storage:
  - mark current stage as completed
  - move to next stage (if any)
  - set `currentWeek` to at least the next stage start week (`1,4,7,10`)
  - refresh `startedAt` on stage transitions

## Code

- Authority helper: `app/src/lib/recovery.ts`
  - `deriveRecoveryProgressFromStageCompletion`
  - `advanceRecoveryProgressFromStageCompletion`
- Event wiring: `app/src/screens/Dashboard.tsx`
  - when computed current-stage steps are all done, call `advanceRecoveryProgressFromStageCompletion(true)`
  - write result into query cache (`['recovery:progress']`) to avoid stale card state
- Tests: `app/src/lib/__tests__/recoveryProgression.test.ts`

## Non-goals (this pass)

- No broad recovery redesign.
- No changes to recovery card copy model.
- No changes to non-recovery notification ownership flows.
