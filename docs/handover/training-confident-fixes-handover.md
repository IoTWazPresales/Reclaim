# Training confident fixes — handover

**Date:** 2026-07-15  
**Base:** `chore/reclaim-uiux-audit-pilot` @ `3545d42` (+ audit docs commit)  
**Fix branch:** `fix/training-confident-ux`  
**Audit:** `docs/audits/training-followup-audit.md`

---

## Shipped on fix branch (safe relative to guided outbound rest prompts)

1. **X-11** — This Week “Week N” uses program `week_index` from current week program days (planner SSOT); calendar math only as fallback when no days.
2. **Stale threshold** — `STALE_SESSION_HOURS` 6 → 5 (in-app Resume/Discard only; no new push intent).
3. **Mindfulness deep link** — reads `autoStart` + `intervention` and starts the tool once.
4. **Notification type fallbacks** — body tap / HEALTH_TRIGGER START: navigate Meditation or Mindfulness with params when URL missing or as primary for START (does not touch TRAINING_* action handlers).

**Validation:** `npm run typecheck` pass; `npx vitest run src/lib/training/__tests__/staleSessionGuard.test.ts` pass.

## Explicitly held back (next session)

- Guided Wear **Done** durable transition / idempotency / `opensAppToForeground`
- Full Plan jump ↔ notification reschedule
- Live HC / Wear workout + calorie permissions
- Android resting-HR baseline for elevated-HR nudges
- Proactive 5h “still open?” notification
- Movement diagram asset replacement
- SetFocusOverlay / Log Set confirm path cleanup
- Any change to `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority`, or reconciler internals

## Evening test checklist

- [ ] Training Today: Next Session week and This Week week match (same N)
- [ ] Open session older than 5h with no recent sets → Resume/Discard (DEV: `EXPO_PUBLIC_STALE_SESSION_MINUTES=1`)
- [ ] Tap a wellness / mindfulness notif (or `reclaim://mindfulness?intervention=box_breath_60&autoStart=true`) → breathing starts
- [ ] Tap auto meditation notif → Meditation auto-starts (regression)
- [ ] Guided training: rest-complete still appears on Wear (must not regress)
- [ ] Guided training: Wear Done still as before (not claimed fixed)

## Next session

Phase 0 log-driven Wear Done diagnosis only — do not combine with jump/HC/HR.
