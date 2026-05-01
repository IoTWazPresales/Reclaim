# Reclaim — permission & sensitive capability justification matrix

**Platform focus:** Android (Google Play / Health Connect). iOS noted where dual.  
**Legend:** **Strong** = clear user-visible or policy-standard use; **Medium** = acceptable with accurate listing; **Weak** = enrichment, mismatch, or unclear surface; **None** = not requested or dead path.

---

## Android manifest — standard app permissions

| Capability / data | Where requested | Where used | Where surfaced | Strength | Why | Action |
|-------------------|-----------------|------------|----------------|----------|-----|--------|
| **POST_NOTIFICATIONS** | `app.config.ts` `android.permissions` | `expo-notifications`, schedulers, training | Settings / notifications flows | **Strong** | Standard for meds, training, nudges | **Keep** |
| **INTERNET** | `app.config.ts` | Supabase, telemetry, updates | — | **Strong** | Expected | **Keep** |
| **WAKE_LOCK**, **VIBRATE** | `app.config.ts` | Notifications | — | **Strong** | Expected | **Keep** |
| **ACTIVITY_RECOGNITION** | `app.config.ts` | **Inference:** intended for steps/activity | **No** HC step read in manifest | **Weak** | HC minimum-scope build **does not** declare `READ_STEPS`; reviewer may question | **Tighten** (justify in listing + UX) **or** **remove** |

---

## Health Connect — declared XML permissions (`withHealthConnectPermissions.js`)

| Data type (HC) | Permission in manifest | Where requested (JS) | Where used | Where surfaced | Strength | Why | Action |
|------------------|-------------------------|----------------------|------------|----------------|----------|-----|--------|
| **Sleep** (`SleepSession` / stages) | `READ_SLEEP` | `HEALTH_CONNECT_DEFAULT_METRICS` → `healthConnectRequestPermissions` in `integrations.ts` | `healthConnectService.ts` reads; `sync.ts` | `SleepScreen.tsx`, dashboard | **Strong** | Core feature | **Keep** |
| **Heart rate** (samples) | `READ_HEART_RATE` | same | `healthConnectService.ts`, `notificationTriggers.ts` | Mindfulness HR-spike path; optional notif | **Medium** | First Play letter challenged **HeartRate**; second did **not** — **Open** reviewer consistency | **Tighten** listing/declaration copy; **Keep** if story is explicit |
| **Oxygen saturation** | `READ_OXYGEN_SATURATION` | same | `healthConnectService.ts` merge into sleep metadata | `SleepScreen.tsx` (avg/min SpO2) | **Strong** when data shown | Tied to sleep detail UI | **Keep** |
| **Respiratory rate** | `READ_RESPIRATORY_RATE` | same | same | `SleepScreen.tsx` | **Strong** when shown | Tied to sleep detail UI | **Keep** |
| **Body temperature** | `READ_BODY_TEMPERATURE` | same | same | `SleepScreen.tsx` skin/body temp | **Strong** when shown | Tied to sleep detail UI | **Keep** |
| **Active calories** | **Not declared** | **Not** in `HEALTH_CONNECT_DEFAULT_METRICS` | `healthConnectService.ts` (`active_energy` helpers); `sync.ts` checks | `TrainingHistoryView.tsx` label when `activeCaloriesKcal` in session summary | **Weak** / **None** (permission) | Play **rejected** calorie reads; code path **requires** `active_energy` grant that connect flow **does not** request | **Remove** misleading “Health Connect” calorie copy **or** **defer** product decision to expand scope with policy plan |
| **Steps, total/active calories (HC), RHR, HRV** | **Not declared** (current plugin) | Apple uses some via `integrations.ts` `METRICS` (iOS only) | iOS paths | — | **N/A (Android)** | Second rejection types; correctly absent from Android manifest **Inference** | **Keep** absent on Android; ensure Console matches |

---

## Health Connect — runtime permission request

| Behavior | Location | Note |
|----------|----------|------|
| Default connect bundle | `HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts` | Matches plugin intent comment (“Minimum scope for Play”) |
| Post-connect verification | `integrations.ts` — `HEALTH_CONNECT_SLEEP_METRICS` only | “Connected” if sleep granted even if user partially denied vitals **Inference** — UX edge case |

---

## Other sensitive access (non-HC)

| Capability | Where requested | Where used | Surfaced | Strength | Why | Action |
|------------|-----------------|------------|----------|----------|-----|--------|
| **Calendar / reminders** | `expo-calendar` plugin `app.config.ts` | `calendar.ts`, `wellnessCalendarContextNudges.ts`, `calendarInsightContext.ts` | Permission prompts per plugin strings | **Medium** | Wellness nudges; file headers say no silent prompt | **Keep**; ensure Data safety mentions if required |
| **Apple HealthKit** | iOS `Info.plist` + `AppleHealthKitProvider` | `integrations.ts` | Integrations | **Strong (iOS)** | Platform-expected | **Keep** |
| **Background health sync** | `backgroundSync.ts` task registration | `SyncEngine` | Not prominent | **Medium** | Needs privacy/battery disclosure alignment | **Tighten** copy/listing **Inference** |
| **Telemetry (`app_logs`)** | — | `telemetry.ts` → Supabase | None | **Medium** | `sanitizeLogPayload`; `user_id` optional | **Tighten** Data safety + verify callers |
| **Play Integrity** | — | `playIntegrity/monitor.ts` | None | **Medium** | Backend **Open** (**OQ-5**) | **Verify** deployment |

---

*When manifest or `HEALTH_CONNECT_DEFAULT_METRICS` changes, update this matrix and `reclaim_play_readiness_audit.md`.*
