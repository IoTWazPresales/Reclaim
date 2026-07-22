# Guided rest notification audit — 2026-07-22

**Mode:** read-only (no code changes)  
**Sync pin:** `fix/training-confident-ux` @ `4d847e1` · EAS preview `487a89db-c54d-43b4-803b-3f0ba7036b15` (runtime 1.0.4)  
**Channel:** Wear = phone notification actions bridged (`SET_DONE` / `NEXT_SET`), not a Wear companion.

## Reporter symptoms (verbatim sense)

1. Rest starts → notification shows on watch → disappears by itself after a few seconds (wants it to stay during rest).
2. Notifications feel ~1–2 minutes late, especially around rest.

## Defect register (ranked)

### D1 — Rest tile vanishes shortly after appearing | **High** | CONFIRMED (code) + CONFIRMED (platform constraint)

**Symptom:** Rest appears on watch, then gone within seconds.

**Root cause A — same OS id for two concurrent intents (CONFIRMED):**  
During rest, the app intentionally holds **two** live intents:

- `training_now:{sessionId}` → immediate `TRAINING_REST` (“Rest started”)
- `training_at:{sessionId}` → timed `TRAINING_SET` (“Rest complete”) at `restEndsAtMs`

Both materialize with the **same** Android notification identifier `reclaim-training-{sessionId}`:

- Design comment: `trainingNotificationScheduler.ts` L15–17, `trainingNotificationKeys.ts` L29–32, test `intentKeyParity.test.ts` L31–33
- Planner assigns that id to both: `NotificationScheduler.ts` L506–534
- Rest + timed set written together: `scheduleGuidedTrainingAfterSetPersist.ts` L126–147
- Reconcile schedules each logical key independently via `scheduleNotificationAsync` with that shared `identifier` (`NotificationScheduler.ts` L737–739, L921–930)

Expo/Android treat that identifier as one notification request. Scheduling the timed prompt with the same id **replaces/cancels** the already-presented rest tile. On Wear, bridged dismiss follows → rest vanishes after the few seconds it takes for the second schedule to land.

Stale checks already avoid this pattern with a **separate** id (`reclaim-training-stale-*`, `NotificationScheduler.ts` L553–570). Rest/timed do not.

**Root cause B — Wear bridge UX (CONFIRMED platform):**  
Even a healthy non-ongoing rest tile only **peeks** on the watch face, then leaves the face for the notification stream. Phone **ongoing**/sticky notifications are **not bridged** to Wear (Android Wear bridging rules). So `sticky: true` alone would keep rest on the phone shade and often **stop** Wear bridging — wrong for “stay on watch face.” True watch-face persistence needs a Wear **OngoingActivity** / companion (explicitly out of current scope).

**Best-path fix direction:**

1. **Separate OS identifiers** for `training_now` vs `training_at` (mirror stale). Rest stays presented until rest-complete fires; then dismiss the rest id when posting the set prompt (or replace only within the now-slot).
2. Keep rest **non-ongoing** so it still bridges to Wear; accept stream (not always-on face) unless/until Wear companion.
3. Optional product layer: update **FGS** content text to “Resting — …” for phone awareness (FGS ongoing also does not bridge to Wear).

**Rejected thin alternatives:**

- Only bump channel importance / vibration — REJECT: does not stop same-id cancel.
- `sticky: true` on rest without separate ids / Wear strategy — REJECT: fights Wear bridging; doesn’t fix id collision.
- Revive Expo `TRAINING_SESSION_ACTIVE` sticky — REJECT: frozen anti-pattern; wrong transport.
- Re-post rest every N seconds — REJECT: battery/reconcile thrash patch.

---

### D2 — Rest-boundary notifications ~1–2 min late | **High** | CONFIRMED (scheduling shape) · OEM variance UNVERIFIED

**Symptom:** Delay especially around rest (most likely **rest-complete / next-set** fire; possibly also rest-start after Done if JS wake is slow).

**Root cause (CONFIRMED scheduling shape):**  
Timed rest-end intent stores an absolute `scheduledAt`, but the reconciler materializes it as a **relative** `timeInterval` `seconds` trigger, not a `date` trigger:

- Intent absolute time: `trainingNotificationScheduler.ts` L109, `scheduleGuidedTrainingAfterSetPersist.ts` L127–144
- Materialize: `NotificationScheduler.ts` L507–517 (`secUntil` → `typeTimeInterval`)
- `buildTriggerForSchedule` supports `date` (`L87–89`) but training path never uses it

`SCHEDULE_EXACT_ALARM` is declared (`app.config.ts` L41–42) and comments expect wall-clock fidelity, but the training path still uses interval triggers. Under Doze / OEM batching, inexact or deferred interval alarms commonly land **~1–2 minutes late** — matches the report. Device docs already note exact-alarm policy is OS-dependent (`docs/release/guided-notification-device-test.md`).

Secondary (possible, lower confidence): rest-start only appears after `applySetCompletion` → `scheduleGuidedTrainingAfterSetPersist` → `reconcileNotifications` completes on the Wear action path (`guidedTrainingNotificationActions.ts` L285–293). Under FGS this should be seconds, not minutes; if Human sees delay **after Done before Rest started**, measure separately.

**Best-path fix direction:**

1. Materialize `training_at` with an absolute **`date` / calendar** trigger from `scheduledAt` (keep authority as `setIntent` + `reconcile`).
2. Verify at runtime that Expo schedules via exact alarm path when permission granted; surface missing exact-alarm permission in guided session UX if OEM revoked it.
3. Do not invent a parallel AlarmManager outside the reconciler.

**Rejected thin alternatives:**

- Shorten planned `restSeconds` to “feel” on time — REJECT: corrupts training data/UX contract.
- Fire rest-complete from an in-app `setTimeout` — REJECT: dies when process frozen; bypasses notification authority.
- Extra reconcile spam — REJECT: doesn’t fix AlarmManager batching.

---

## Fixed workflow (target)

1. Done → persist → `training_now` rest posts immediately (own OS id) and stays visible on phone + in Wear stream for the whole rest window (chronometer OK).
2. `training_at` armed with **absolute** wall-clock trigger (own OS id).
3. At rest end → rest-complete/next-set posts; rest id dismissed; Done actions available.
4. Watch face may still auto-collapse peeks (OS); stream + phone shade remain truthful. Watch-face pin = future Wear companion / OngoingActivity.

## Unit split (only if Human says fix)

- **U1:** Separate OS ids for now vs timed + dismiss/replace rules (fixes D1a).
- **U2:** Absolute `date` trigger for `training_at` + exact-alarm verification (fixes D2).
- **U3 (optional product):** FGS content mirrors rest/set phase for phone; document Wear face vs stream honesty.

## Open questions (smoke clarity only)

1. After rest “disappears” on the watch face, is it still in the **watch notification stream** and/or **phone shade**? (stream yes → more D1b; both gone → D1a dominant)
2. Is the 1–2 min lag mainly **Rest complete** after the timer, or **Rest started** after Done?
