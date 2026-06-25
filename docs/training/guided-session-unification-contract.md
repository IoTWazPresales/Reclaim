# Guided training session unification contract

**Status:** Complete — PR-A–H landed (branch `cursor/cloud-agent-1782316881540-7ft0i`)  
**North star:** Persisted DB is the single source of truth (SSOT). All UI, cache, and notification scheduling derive from DB reads after writes.

## Layers

| Layer | Owner module | Contract |
|-------|--------------|----------|
| Write | `applySetCompletion.ts`, `applySetSkip`, `applySetEdit.ts` | One API per mutation; online retry then offline queue |
| Read | `getTrainingSession` / `getTrainingSessionItemById` | After every write, reload before scheduling or position decisions |
| Work authority | `sessionWorkAuthority.ts` | `deriveActiveWorkTarget`, `getLoggedSetIndices` from `performed.sets` |
| Notification chain | `trainingNotificationWorkPlan.ts` | `listPendingWorkTargets` → `buildNotificationWorkChain` from DB-shaped items |
| Schedule | `scheduleGuidedTrainingAfterSetPersist.ts`, `scheduleGuidedTrainingNextSetFromDb.ts` | Post-write and NEXT_SET paths schedule only from `buildNotificationWorkChain` |
| Session end | `finalizeTrainingSession.ts` | Alert End and in-app Complete share one finalize + intent cleanup |
| Cache | `sessionQueryPatch.ts` | Speed layer only; never authoritative for scheduling or position |

## Allowed flow (target)

```
User / watch / notification action
  → canonical write (applySet*)
  → getTrainingSession (DB read)
  → buildNotificationWorkChain(items)
  → scheduleTrainingRest / scheduleTrainingSet / scheduleTrainingSetImmediate
  → patchSessionItemPerformedInCache (optional speed layer, after persist)
  → UI reads deriveActiveWorkTarget from session query
```

## Forbidden patterns (grep audit enforces)

1. **Payload lookahead scheduling** — Building `next` / `nextAfter` / `nextNextAfter` from notification `data.*` or plan walk instead of DB reload.
2. **Parallel in-app schedulers** — `TrainingSessionView` calling `scheduleTrainingRest` / `scheduleTrainingSet` directly instead of unified scheduler after persist.
3. **Plan-based session start** — `computeFirstSetInfo` plan linearisation instead of DB session items.
4. **External transition builder** — `buildGuidedRestNotificationContextAfterCompletedSet` as scheduling authority (display hints only after DB chain exists).
5. **Cache-before-persist** — Patching performed sets in cache before `applySet*` resolves.
6. **Replay without invalidation** — `syncOfflineQueue()` without `invalidateQueriesAfterTrainingOfflineReplay` on success.

## PR sequence

| PR | Scope | Exit |
|----|-------|------|
| A | This contract + `scripts/audit-training-dual-paths.sh` + test scaffolds | Audit fails on known forks; scaffolds present |
| B | `NEXT_SET` → `scheduleGuidedTrainingNextSetFromDb` | No payload lookahead in NEXT_SET handler |
| C | In-app Done/Skip → unified scheduler; remove parallel schedulers in `TrainingSessionView` | In-app uses `scheduleGuidedTrainingAfterSetPersist` |
| D | Session start → `scheduleGuidedTrainingSessionStart` from DB items | No `computeFirstSetInfo` |
| E | Persist-first everywhere; demote cache patches | Write before cache patch |
| F | `replayTrainingOfflineQueueAndRefreshUI()` at all replay sites | All replay paths invalidate `training:session:*` |
| G | CI gates + extract `trainingSessionProgression.ts` | Tier 1–5 tests green |
| H | Deletion pass + doc update | `audit-training-dual-paths.sh` passes |

**All PRs A–H complete.** Device gym QA may proceed after D10 fresh-agent sign-off.

## Exit criteria (D1–D10) before device gym test

- **D1** Single write path per mutation (set done, skip, edit).
- **D2** Single read-before-schedule path (`getTrainingSession` + `buildNotificationWorkChain`).
- **D3** `NEXT_SET` DB-derived (no frozen payload lookahead).
- **D4** In-app and notification scheduling share `scheduleGuidedTrainingAfterSetPersist` / `scheduleGuidedTrainingNextSetFromDb`.
- **D5** Session start from DB items, not plan walk.
- **D6** Offline replay always invalidates `training:session:*` and `set_logs`.
- **D7** Alert End and in-app Complete both call `finalizeTrainingSession` + intent cleanup.
- **D8** `npm run typecheck` and `npm test` pass.
- **D9** `scripts/audit-training-dual-paths.sh` passes.
- **D10** Fresh-agent re-read of changed files confirms no reintroduced forks.

## Out of scope (this unification pass)

- Program periodization / macro planner changes.
- Wearable Health Connect workout autostart.
- Normal-mode notification bleed from guided intents.

## References

- `docs/audits/second-system-removal-verification.md` — prior optimistic-authority removal
- `app/CLAUDE.md` rule #2 — DB SSOT for training
- `CONTEXT.md` — branch status and phase history
