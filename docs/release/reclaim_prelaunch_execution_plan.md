# Reclaim — prelaunch execution plan (file-level)

**Sources:** `reclaim_prelaunch_changes_master.md`, `reclaim_implementation_sequence.md`, `reclaim_android_v1_launch_definition.md`, `reclaim_launch_decisions_master.md`, `reclaim_launch_narrative_and_claims.md`, `reclaim_manual_release_work.md`, architecture formalization docs. **Repo inspection** April 2026 for paths and call patterns.

**Rules:** **No** new audit; **no** architecture redesign; **no** code applied in this document. Tasks are **actionable** and **ordered**.

---

## Dependency order (master)

1. **Phase 0** — Product/stakeholder: primary Home story (insight vs recovery); sign-off on launch definition.
2. **Phase A** — **Internal truth** — fix `HEALTH_API_COVERAGE.md` vs `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` (**blocks** wrong Console copy).
3. **Phase B** — **Play Console + listing + Data safety** (manual), using Phase A as source of truth.
4. **Phase C** — **Trust-critical app code/copy** — Training history HC line (M4); Phase 7 Tier 1 (M9); Home/recovery copy (M6/M7).
5. **Phase D** — **Permissions policy** — `ACTIVITY_RECOGNITION` (M10); telemetry/Data safety alignment (M8).
6. **Phase E** — **SHOULD** cluster — post-sync helper where gaps; hierarchy; onboarding; integrations; fairness; docs.

**Safest submission slice:** **Phase A + B + M4 + (minimal M9 Tier 1) + M5 manual + M1/M3/M8 Console** = **credible policy + honest UX**. M6/M7 remain **product-dependent** for full coherence.

---

## MUST items — exact tasks

### M1 — Play Console HC declaration + Data safety ↔ APK

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (P0 policy) |
| **Blast radius** | **High** (store-wide) |
| **Files / evidence (repo)** | `app/plugins/withHealthConnectPermissions.js` (manifest HC XML list); `app/src/lib/health/healthConnectService.ts` (`HEALTH_CONNECT_DEFAULT_METRICS`); built `AndroidManifest.xml` **inference** from prebuild/EAS artifact |
| **Why** | Stale declaration → repeat minimum-scope rejection (`reclaim_play_blocker_matrix.md`) |
| **Task** | For **each** HC permission in **shipped** manifest, ensure **one** matching row in Play Health Connect declaration; **remove** rows for types not in manifest (e.g. steps, calories, RHR, HRV on Android per second rejection narrative). Data safety: match `telemetry.ts` + Sentry usage. |
| **Depends on** | M2 or equivalent internal diff complete |
| **Manual** | **Yes** — Play Console |

---

### M2 — `HEALTH_API_COVERAGE.md` vs code

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (process P0; prevents M1 errors) |
| **Blast radius** | **Medium** |
| **Files** | `app/Documentation/HEALTH_API_COVERAGE.md`; cross-check `app/plugins/withHealthConnectPermissions.js`; `app/src/lib/health/healthConnectService.ts` (`HEALTH_CONNECT_DEFAULT_METRICS`, lines ~33–39) |
| **Why** | Current table **claims** `READ_RESTING_HEART_RATE`, `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_HEART_RATE_VARIABILITY` “Yes” at connect — **contradicts** plugin (only `READ_SLEEP`, `READ_HEART_RATE`, `READ_OXYGEN_SATURATION`, `READ_RESPIRATORY_RATE`, `READ_BODY_TEMPERATURE`) **direct evidence** plugin L8–14 vs doc L11–L17 |
| **Task** | Replace table with **manifest** + **default metrics** + **optional** “code may reference types not in default bundle” note; **or** banner: “Do not use for Play Console — use manifest export.” |
| **Depends on** | None |
| **Manual** | No |

---

### M3 — Store listing copy ↔ features

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (reviewer narrative) |
| **Blast radius** | **High** |
| **Files** | Play Console listing; reference `docs/release/reclaim_permission_justification_matrix.md`, `reclaim_launch_narrative_and_claims.md` |
| **Why** | Tie each HC type to visible sleep detail, mindfulness HR path, etc. |
| **Depends on** | M1/M2 alignment |
| **Manual** | **Yes** |

---

### M4 — Training history “Active calories (Health Connect…)”

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (non-negotiable misleading health UX) |
| **Blast radius** | **Low–Medium** |
| **Files** | `app/src/components/training/TrainingHistoryView.tsx` (`~186` weekly line; `~215–270` session lines referencing HC framing — **verify** on edit) |
| **Why** | `active_energy` / `ActiveCaloriesBurned` **not** in `HEALTH_CONNECT_DEFAULT_METRICS`; label implies HC merge users may never get (`reclaim_play_readiness_audit.md`) |
| **Task** | Remove “Health Connect” framing **or** show only when `activeCaloriesKcal` from **non-HC** sources **or** neutral “Active calories (this week)” with **no** HC claim; **product** choice |
| **Depends on** | None (can parallel M2) |
| **Manual** | No |

---

### M5 — Privacy policy URL

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** |
| **Blast radius** | **Medium** |
| **Files** | `app/src/lib/storeCompliance.ts` (`PRIVACY_POLICY_URL`, `EXPO_PUBLIC_PRIVACY_POLICY_URL`); hosted URL |
| **Why** | **OQ-4** (`reclaim_trust_risk_notes.md`) |
| **Task** | **Manual:** open URL in incognito; verify content matches collection practices; **no** code change if URL already correct |
| **Depends on** | None |
| **Manual** | **Yes** |

---

### M6 — Primary Home story (insight vs recovery vs routine)

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Product-dependent** — **Yes** for identity coherence if onboarding promises “one clear daily insight” |
| **Blast radius** | **Medium** |
| **Files** | `app/src/screens/Dashboard.tsx`; `app/src/components/dashboard/DashboardInsight.tsx`; `app/src/components/dashboard/DashboardRecovery.tsx`; `app/src/components/dashboard/DashboardPrimaryAction.tsx`; `app/src/components/dashboard/LifecycleHero.tsx`; `app/src/components/dashboard/DashboardToday.tsx`; **optional** order in `Dashboard.tsx` compose tree |
| **Why** | Two rankers — **parallel** (`reclaim_primary_next_action_decision.md`); user must see **one** primary narrative |
| **Task** | **Product** picks hero; **implement** reorder, collapse secondary, or copy **only** — **no** new orchestrator |
| **Depends on** | Phase 0 |

---

### M7 — Recovery journey marketing vs evidence

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Product-dependent** — **Yes** if copy implies **automatic** stage progression |
| **Blast radius** | **Medium** |
| **Files** | `app/src/screens/onboarding/WelcomeScreen.tsx` (lines ~50–51 “daily insight”); `app/src/screens/onboarding/CapabilitiesScreen.tsx` (`Sleep & recovery` slide ~31–36, “program that adapts”); `app/src/components/dashboard/DashboardRecovery.tsx`; `app/src/lib/dashboard/recoveryCardMeta.ts` (strings **inference**); `app/src/screens/SettingsScreen.tsx` (recovery reset — **grep** `recovery`); `app/src/lib/recovery.ts` (**no** change required if copy-only fix) |
| **Why** | `setRecoveryStage` / `markStageCompleted` **uncalled** outside `recovery.ts` (`reclaim_architecture_discovery_vs_prior_audits.md`) |
| **Task** | **Copy:** “guidance” / “steps” vs “automated journey”; **or** **code:** wire progression (larger scope — **post-launch** candidate) |

---

### M8 — Telemetry + Data safety

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (under-declaration risk) |
| **Blast radius** | **Medium** |
| **Files** | `app/src/lib/telemetry.ts` (`user_id` on `app_logs` insert L27–32); `app/src/lib/logSanitizer.ts` (`sanitizeLogPayload`); Play Data safety form; **optional** Sentry: `app/app.config.ts` Sentry plugin |
| **Why** | Account/identifier collection must be declared (`reclaim_trust_risk_notes.md`) |
| **Task** | **Manual:** add Data safety categories; **optional** code audit: `logTelemetry`/`sanitizeLogPayload` edge cases |
| **Depends on** | None |
| **Manual** | **Yes** (Console) |

---

### M9 — Phase 7 Tier 1 ship-blockers

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Yes** (`reclaim_launch_non_negotiables.md` — no placeholders) |
| **Blast radius** | **Low–Medium** per file |
| **Source of truth** | `app/Documentation/PHASE_7_UI_AUDIT_BACKLOG.md` §Tier 1 |

| ID | File | Task (from backlog) |
|----|------|---------------------|
| T1-01 | `app/src/screens/SleepScreen.tsx` (~2639–2655) | Remove Roadmap hint block |
| T1-02 | `app/src/screens/MeditationScreen.tsx` (~873–881) | Remove `SpotifyPlaceholderCard` + call |
| T1-03 | `app/src/screens/MeditationScreen.tsx` (~990) | Remove dev `Text` |
| T1-04 | `app/src/screens/AboutScreen.tsx` | `__DEV__` gate or remove “Test Sentry” |
| T1-05 | `app/src/screens/MedsScreen.tsx` (~1254) | `__DEV__` gate “Test reminder in 10s” |
| T1-06 | `app/src/components/training/TrainingHistoryView.tsx` (~177) | Filter ghost sessions |
| T1-07 | `app/src/screens/MindfulnessScreen.tsx` (~1472) | Map intervention IDs to display names |
| T1-08 | `app/src/components/training/TrainingSessionView.tsx` (~2325–2367) | Footer button hierarchy |

**Depends on** | None for parallel; **verify line numbers** before edit (drift risk) |

---

### M10 — `ACTIVITY_RECOGNITION`

| Field | Value |
|-------|--------|
| **Launch-blocking** | **Should treat as Yes** until justified or removed (`reclaim_play_readiness_audit.md`) |
| **Blast radius** | **Medium** |
| **Files** | `app/app.config.ts` (`android.permissions` ~32–37); **optional** `app/Documentation/HEALTH_FIXES_SUMMARY.md` (historical mention — **not** user-facing) |
| **Why** | No HC `READ_STEPS` in manifest — reviewer may question sensor permission |
| **Task** | **Product:** tie to visible step/activity feature **or** remove permission and rebuild native |
| **Depends on** | Product decision |

---

## SHOULD items — exact tasks (summary)

| ID | Task | Files | Launch-blocking | Blast | Depends |
|----|------|-------|-----------------|-------|---------|
| S1 | Post-sync helper **only where gap** | **Verify:** `IntegrationsScreen.tsx` **already** `refreshInsights` after connect/import (`~458`, `~588`); `SleepScreen.tsx` **already** multiple `refreshInsight` paths; `SleepStepScreen.tsx` has `requestHealthSync` **without** `refreshInsight` in grep — **candidate** add refresh after onboarding sleep connect; `RootNavigator.tsx` `STARTUP_GATE` **only** `requestHealthSync` — **InsightsProvider** `session-ready` may suffice; **if** stale insights reported, add targeted refresh | **No** | **Medium** | Product repro |
| S2 | Invalidation map doc | `Dashboard.tsx`; `app/src/lib/backgroundSync.ts` (query keys ~41–51); **new** `docs/release/` or `app/Documentation/` table | **No** | **Medium** | None |
| S3 | One-hero hierarchy | `Dashboard.tsx`; `app/src/components/dashboard/*.tsx` (see phase 2 map) | **No** | **Medium** | M6 |
| S4 | Onboarding ↔ Home | `WelcomeScreen.tsx`; `CapabilitiesScreen.tsx`; `Dashboard.tsx` | **No** | **Medium** | M6 |
| S5 | Garmin/Huawei copy | `app/src/lib/integrations.ts` (definitions); `app/src/screens/IntegrationsScreen.tsx` | **No** | **Low** | None |
| S6 | Android RHR/steps fairness | `app/src/data/insights.json`; `app/src/lib/health/fetchHeartRateContextSummary.ts`; optional `InsightCard` / tooltips | **No** | **Medium** | None |
| S7 | Process: **M2** blocks Console paste | Same as M2 | **No** | **Low** | M2 |
| S8 | Mindfulness HR **why** | `app/src/screens/MindfulnessScreen.tsx`; settings/notifications **inference** | **No** | **Low** | None |
| S9 | Document `forceRescheduleNotifications` | `app/src/screens/MoodScreen.tsx`; `docs/release/reclaim_authority_rules_v1.md` or architecture doc | **No** | **Low** | None |
| S10 | Measure reconcile cost | **Manual** profiling | **No** | **Low** | None |

---

## CAN DEFER (explicit)

Per `reclaim_prelaunch_changes_master.md` P1–P13 — **not** listed as execution tasks here.

---

## Build / submit (end of pipeline)

| Task | Files | Launch-blocking |
|------|-------|-----------------|
| EAS production build | `app/app.config.ts` (`versionCode` **8**); `app/eas.json` | **Yes** |
| **AAB** manifest diff vs prior rejection | **Manual** | **Yes** |
| Submit | Play Console | **Yes** |

---

*Companion: `reclaim_phase_1_file_change_map.md`, `reclaim_phase_2_file_change_map.md`, `reclaim_prelaunch_risk_control_notes.md`.*
