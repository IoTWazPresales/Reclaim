# Training confident fixes — handover

**Date:** 2026-07-15  
**Branch:** `fix/training-confident-ux`  
**Audit:** `docs/audits/training-followup-audit.md`

---

## Shipped

### Earlier (`9df3aa2`)
1. X-11 week_index SSOT  
2. Stale in-app threshold 5h  
3. Mindfulness deep link + notif type fallbacks  

### This package (Wear Done + held items)
1. **Wear Done (most likely):** durable pending rest store + DB rest cursor write on SET_DONE + drain/restore in session view; `SET_DONE` `opensAppToForeground: true`
2. **Full Plan jump:** reschedules guided now-prompt for jumped exercise pending set
3. **Calories:** request `ActiveCaloriesBurned` read at session start + manifest permission (still no live Wear workout UI — Health Services not in app)
4. **Android HR baseline:** overnight HeartRate proxy → elevated-HR nudge can get a baseline
5. **Proactive 5h stale notif:** `training_stale:{sessionId}` scheduled at start / refreshed on set; tap opens Training
6. **Diagrams:** name/id keyword heuristics so stick pattern matches exercise better (still not motion video)

## Honest limits
- Live watch workout / calorie burn **during** session is not started by Reclaim (no Health Services bridge). Finish still writes ExerciseSession + reads kcal if watch/OS recorded energy.
- Diagrams remain pattern SVGs, not form coaching videos.
- Wear Done still depends on OS delivering the action; durable path helps when JS eventually runs / app opens.

## Evening test
- [ ] Wear Done → phone rest (background + open app)
- [ ] Rest-complete on Wear still works (regression)
- [ ] Full Plan jump → lock-screen/Wear prompt shows jumped exercise
- [ ] Session start may prompt Active Calories permission
- [ ] Guidance diagram looks closer for squat/deadlift/bench/row
- [ ] After 5h idle (or DEV stale minutes) — “Still training?” notif (needs rebuild + wait)

## Not touched
`applySetCompletion` / `guidedSetCompletionCanonical` / `sessionWorkAuthority` / reconciler intent math beyond TRAINING_STALE branch
