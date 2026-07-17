# Training confident fixes — handover

**Date:** 2026-07-17 (docs refresh)  
**Branch:** `fix/training-confident-ux`  
**HEAD (docs refresh):** `e9a02d0`  
**Audit:** `docs/audits/training-followup-audit.md`  
**Parent UI track:** `chore/reclaim-uiux-audit-pilot` @ `038cf96` (merge-base)

---

## Status

| Item | Status |
|------|--------|
| X-11 week_index SSOT | ✅ `9df3aa2` |
| Stale in-app 5h + proactive `training_stale` notif | ✅ `9df3aa2` / `fdf16e3` |
| Mindfulness deep link + notif type fallbacks | ✅ `9df3aa2` |
| Wear Done durable pending rest + wake | ✅ `fdf16e3` |
| Full Plan jump → reschedule guided prompt | ✅ `fdf16e3` |
| Active calories permission at session start + manifest | ✅ `fdf16e3` |
| Android overnight HR proxy (elevated HR baseline) | ✅ `fdf16e3` |
| Diagram name/id heuristics | ✅ `fdf16e3` |
| Insight support teal (no gold outline) | ✅ `7e78b80` |
| SessionPreviewModal empty Android overlay | ✅ `7e78b80` |
| Home section gaps (AppCard double-margin) | ✅ `e9a02d0` |
| New EAS preview with above | ⏳ **Required before device sign-off** |
| Evening Wear / stale device checklist | ⏳ Unchecked (below) |

---

## Shipped commits (this branch)

### `9df3aa2`
1. X-11 — This Week / Next Session use `programDay.week_index`
2. Stale in-app threshold 6h → 5h
3. Mindfulness `autoStart` / intervention + notification type fallbacks

### `fdf16e3`
1. Wear Done: durable pending rest store + DB rest cursor + drain in session view; `SET_DONE` `opensAppToForeground: true`
2. Full Plan jump reschedules guided now-prompt
3. Active calories read permission at session start + `READ_ACTIVE_CALORIES_BURNED` in HC plugin
4. Android overnight HeartRate proxy for elevated-HR nudge baseline
5. Proactive `training_stale:{sessionId}` notification
6. Diagram name/id keyword heuristics (still pattern SVGs, not form video)

### `7e78b80` / `e9a02d0` (preview UI regressions)
1. Support insight: teal wash + left bar (no gold outline)
2. Paper Modal: explicit sheet height / no Modal `flex:1` (Start/Review empty dim overlay)
3. Home: nested cards `marginBottom={0}`; parent owns 16px section gap; footnotes/quota use internal block gap

---

## Honest limits (not unfinished bugs)

- Live watch workout / calorie burn **during** session is not started by Reclaim (no Health Services bridge). Finish may write ExerciseSession + read kcal if OS/watch recorded energy.
- Diagrams remain pattern SVGs, not form coaching videos.
- Wear Done still depends on OS delivering the action; durable path helps when JS runs / app opens.

## Not touched (unless explicitly scoped)

`applySetCompletion` / `guidedSetCompletionCanonical` / `sessionWorkAuthority` internals / reconciler intent math beyond `TRAINING_STALE` branch / med module.

---

## Device checklist (needs rebuild on this HEAD)

- [ ] New EAS `preview` APK installed (must include `e9a02d0+`)
- [ ] Home: even section rhythm; Daily signal teal (not gold); Medication context not oddly tight
- [ ] Training Start / Review → sheet content + buttons visible (not empty dim overlay)
- [ ] Wear Done → phone rest (background + open app)
- [ ] Rest-complete on Wear still works (regression)
- [ ] Full Plan jump → lock-screen/Wear prompt shows jumped exercise
- [ ] Session start may prompt Active Calories permission
- [ ] Guidance diagram closer for squat/deadlift/bench/row
- [ ] After 5h idle (or DEV stale minutes) — “Still training?” notif

---

## Play note (training-related)

Manifest now declares `READ_STEPS` + `READ_ACTIVE_CALORIES_BURNED`. Default connect bundle (`HEALTH_CONNECT_DEFAULT_METRICS`) still omits `steps` / `active_energy` — session start / nudge paths request selectively. **Play Console Health declaration + Data safety must list these types with visible feature justification** before production resubmission. See `docs/release/reclaim_play_readiness_audit.md`.
