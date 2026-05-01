# Reclaim — policy & Play audit (grounded)

Scope: **Android Health Connect**, **permissions**, **health-adjacent UX**, **telemetry**, **background work**, **calendar**. iOS HealthKit where it touches parity.  
**Not in repo:** live Play Console declarations (full forms), privacy policy URL, final reviewer outcome for the **latest** submission.

**Memory baseline:** `reclaim_canonical_memory_status.md` (**v0.9 provisional**).  
**Raw `policies/`:** `docs/memory/raw/policies/` currently has **no** imported PDFs/snippets (`.gitkeep` only); **verbatim Play policy text** lives under `docs/memory/raw/play-console/`.

---

## 0. Google Play rejection history (primary sources in repo)

The following is **verbatim policy text** imported into:

- `docs/memory/raw/play-console/2026_04_08_First_Play_Console_Rejection_Message.md`
- `docs/memory/raw/play-console/2026_04_16_Second_Play_Console_Rejection_Message.md`

**Issue (both):** *Excessive data access for declared feature* — Health Connect **Minimum Scope**.

### First rejection (dated in filename 2026-04-08)

Reviewer listed as **not appearing required** for current features:

`ActiveCaloriesBurned`, `CyclingPedalingCadence/ExerciseSession`, `StepsCadence/Steps`, `TotalCaloriesBurned`, `HeartRate`, `HeartRateVariabilityRmssd`, `RestingHeartRate`, `RespiratoryRate`, `BodyTemperature`, `OxygenSaturation`.

### Second rejection (2026-04-16)

- References **`Version code 7`**.
- Shorter list of types **not appearing required:** `ActiveCaloriesBurned`, `StepsCadence/Steps`, `TotalCaloriesBurned`, `RestingHeartRate`, `HeartRateVariabilityRmssd`.

**Inference:** Between submissions, the app or declaration likely dropped some types from reviewer concern, or reviewer narrowed focus — **not** provable from these excerpts alone.

**Relation to current code:** `app/plugins/withHealthConnectPermissions.js` declares only `READ_SLEEP`, `READ_HEART_RATE`, `READ_OXYGEN_SATURATION`, `READ_RESPIRATORY_RATE`, `READ_BODY_TEMPERATURE`. That set **overlaps** types Google still questioned in the **first** letter (HR, SpO2, RR, body temp) — so **narrowing manifest alone does not guarantee approval**; **feature visibility + declaration alignment** still matter.

**Conflict / uncertainty:** Second letter **does not** name HR / sleep / overnight vitals as “excessive” — may mean those were justified in listing/app, or reviewer message is partial. **No direct evidence found** for full Console form answers.

### Reconstructed rationale (ChatGPT backfill — not policy evidence)

`docs/memory/raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` (session-reconstructed) describes the same **tension** as §0: map each HC permission to a **user-visible** feature and avoid reads that only **enrich** logic without surfacing. That narrative **aligns** with Google’s “minimum scope” theme but is **not** a substitute for verbatim Play correspondence or current declaration screenshots. See `reclaim_provisional_origin_note.md`.

---

## 1. Declared Android permissions (app config)

### `app/app.config.ts` → `android.permissions`

Evidence: `POST_NOTIFICATIONS`, `WAKE_LOCK`, `VIBRATE`, `INTERNET`, `ACTIVITY_RECOGNITION`.

| Permission | User-visible justification (evidence) | Risk / note |
|------------|-------------------------------------------|-------------|
| `POST_NOTIFICATIONS` | Meds reminders, training timers, wellness nudges — multiple modules (`expo-notifications`, `NotificationScheduler`) | Standard; must match Data safety “messages” if declared. |
| `ACTIVITY_RECOGNITION` | Comment in config: “health/sensor features” | **Inference:** tie to step/activity features if any remain; HC manifest no longer lists `READ_STEPS` in plugin (see below). Confirm listing text does not over-claim. |
| `INTERNET` | Supabase, telemetry, updates | Standard. |
| `WAKE_LOCK` / `VIBRATE` | Notifications | Standard. |

### Health Connect XML permissions (Expo config plugin)

Evidence: `app/plugins/withHealthConnectPermissions.js` — adds:

- `android.permission.health.READ_SLEEP`
- `android.permission.health.READ_HEART_RATE`
- `android.permission.health.READ_OXYGEN_SATURATION`
- `android.permission.health.READ_RESPIRATORY_RATE`
- `android.permission.health.READ_BODY_TEMPERATURE`

**Does not declare** (in this file): Steps, active/total calories, resting HR, HRV, exercise session.

### Runtime Health Connect request set

Evidence: `app/src/lib/health/healthConnectService.ts` — `HEALTH_CONNECT_DEFAULT_METRICS`:

`sleep_analysis`, `sleep_stages`, `heart_rate`, `oxygen_saturation`, `respiratory_rate`, `body_temperature`.

Connect flow: `app/src/lib/health/integrations.ts` — `healthConnectRequestPermissions(HEALTH_CONNECT_DEFAULT_METRICS)`; post-connect validation uses `HEALTH_CONNECT_SLEEP_METRICS`.

---

## 2. Document ↔ code conflict (high priority)

| Source | Claim |
|--------|-------|
| `app/Documentation/HEALTH_API_COVERAGE.md` | Table rows: `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`, `READ_RESTING_HEART_RATE`, `READ_HEART_RATE_VARIABILITY` “Yes” for connect + reads |
| `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` | **None** of those permissions/metrics in the current Android minimum set |

**Status:** Internal docs **out of date** relative to code **unless** another code path requests extra permissions (searched: default connect uses `HEALTH_CONNECT_DEFAULT_METRICS` only).

**Play risk:** **Inference** — if Play Data safety or health declaration was filled using the **old** table, it could **over-declare** vs actual APK. If filled using **narrow** manifest, docs could **under-explain** engineering notes. **Action:** reconcile before submission.

---

## 3. Sensitive capabilities by area

### Sleep & overnight vitals

- **Reads:** HC `SleepSession` + optional overnight SpO2/RR/temp/HR enrichment — sync pipeline in `app/src/lib/sync.ts` (multiple references `health_connect`), consolidation helpers in `app/src/lib/sleep/*`.
- **UI:** `SleepScreen.tsx`, dashboard sleep tiles (**Inference** from Phase 6/7 docs).
- **Justification strength:** **Strong** for `READ_SLEEP`; **medium** for overnight vitals if Sleep UI shows those fields — verify screen renders match reads.

### Heart rate — mindfulness / notifications (Android)

- **Reads:** `READ_HEART_RATE` for polling / samples — `app/src/lib/health/notificationTriggers.ts`, `healthConnectSubscribeRecentHeartRate` (referenced from `notificationTriggers` / `healthConnectService`).
- **Copy / gating:** Phase 5/6 docs and commits reference HR spike gating + softer copy; header comments in `notificationTriggers.ts` (iOS gap documented).
- **Justification:** **Strong** if in-app explains optional nudges and user can disable; **weak** if notifications fire without clear settings toggle (**needs screen verification** — `NotificationsScreen.tsx`, mindfulness settings).

### Resting HR “context” for insights

- **Android:** `fetchHeartRateContextSummary` returns **no** HC resting data — `app/src/lib/health/fetchHeartRateContextSummary.ts` lines 14–20.
- **iOS:** Apple HealthKit path `appleHealthKitFetchRestingHrDailyRows`.
- **Risk:** Insight rules keyed on `vitals.restingHrTrendLabel` may **never** match on Android — **not a policy violation** but can confuse reviewers if listing promises “recovery/resting” equally on both platforms.

### Training ↔ active calories

- **Reads:** `healthConnectService.ts` contains `active_energy` / `ActiveCaloriesBurned` read helpers and merge logic (e.g. `healthConnectHasPermissions(['active_energy'])`).
- **Manifest:** **No** `READ_ACTIVE_CALORIES_BURNED` in `withHealthConnectPermissions.js` (current file).
- **Inference:** Merge path may be **dead** or **gracefully no-op** without permission — **verify** training “End & save” HC merge behavior when calories not granted. **Policy:** If merge is advertised, manifest + declaration must include calories; if not granted, UI must not imply success.

### Calendar

- **Reads:** `expo-calendar` plugin in `app.config.ts`; `app/src/lib/calendar.ts` (typed `CalendarEvent`); wellness nudges `app/src/lib/wellness/wellnessCalendarContextNudges.ts` use `getEventsForDateRangeIfGranted` — **no silent permission prompt** (per file header comment).
- **Insights:** `app/src/lib/insights/calendarInsightContext.ts` — `hasCalendarPermissions` before read.
- **Justification:** **Strong** if copy stays non-clinical (“optional”, “not diagnosis”); **weak** if event titles uploaded to server without disclosure (**needs check** — nudges appear local + notifications).

### Telemetry

- **Writes:** `app/src/lib/telemetry.ts` → Supabase `app_logs` with optional `user_id`.
- **Sanitization:** `sanitizeLogPayload` imported — review for PII (**not fully audited in this pass**).
- **Play:** Declare analytics collection in Data safety; link privacy policy.

### Background sync

- **Task:** `BACKGROUND_HEALTH_SYNC_TASK` in `app/src/lib/backgroundSync.ts` — `runOncePush` / `runOncePull` from `SyncEngine`.
- **Justification:** **Inference** — acceptable if user understands cloud sync; must align with Data safety “data is encrypted in transit” etc.

### Play Integrity

- **Code:** `app/src/lib/playIntegrity/monitor.ts`, invoked from `App.tsx` (`runPlayIntegrityMonitor`).
- **Backend:** `supabase.functions.invoke('verify-play-integrity')` — deployment not in repo.

---

## 4. Likely Play review blockers / risks (ranked)

1. **Data safety / health declaration mismatch** with actual HC permission set if Console was filled from stale docs.  
2. **Over-broad health claims** in store listing vs non-clinical disclaimers in app (`HealthDisclaimerModal` in `RootNavigator.tsx`).  
3. **Incomplete or placeholder UX** called out in `PHASE_7_UI_AUDIT_BACKLOG.md` Tier 1 — reviewer perception risk.  
4. **ACTIVITY_RECOGNITION** without clear user-facing step feature if steps are not actually read from HC on Android.  
5. **Medical / evidence** screens — `EvidenceNotesScreen` + compliance commits; ensure citations/disclaimer present (commit `5ad510f` message references peer-reviewed citations).  
6. **Background behavior** — explain battery/data in listing if required; `expo-background-fetch` usage.  
7. **Cross-platform parity claims** — iOS HR triggers partial vs Android (**PHASE_6**).  
8. **Third-party / Supabase** naming in user-facing strings — Phase 7 Tier 2 calls out “Supabase” in privacy copy; policy prefers neutral wording.  
9. **Training data quality** — ghost sessions called out in Phase 7 T1-06; trust issues not always policy blocks but drive bad reviews.  
10. **Secrets / config** — missing `EXPO_PUBLIC_*` on EAS → broken app → functional review failure.

---

## 5. Recommended actions (keep / tighten / remove)

| Action | Target |
|--------|--------|
| **Tighten** | Update `HEALTH_API_COVERAGE.md` to match `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` **or** update code if product needs more reads. |
| **Tighten** | Re-audit `PHASE_7_UI_AUDIT_BACKLOG.md` Tier 1 against current screens before production. |
| **Tighten** | Align store copy with Android resting-HR limitation (`fetchHeartRateContextSummary`). |
| **Keep** | Narrow HC manifest philosophy documented in plugin comments (“Minimum scope for Play”). |
| **Verify** | Training calorie merge path vs actual HC grants. |

---

## Related formal audit (post–v0.9 memory)

Structured Play/trust pass: `docs/release/reclaim_play_readiness_audit.md` (+ permission matrix, blocker matrix, trust notes in same folder).
