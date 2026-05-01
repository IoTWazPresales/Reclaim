# Reclaim — Phase 1 file change map (**MUST** only)

**Scope:** Items **M1–M10** from `reclaim_prelaunch_changes_master.md`. **No** SHOULD items here.

**Legend:** **Change type** = likely **edit** vs **verify-only** vs **manual**.

---

## 1. Docs (internal / process)

| MUST | File path | Expected change / action | Change type |
|------|-----------|--------------------------|-------------|
| M2 | `app/Documentation/HEALTH_API_COVERAGE.md` | **Rewrite** table to match `app/plugins/withHealthConnectPermissions.js` (`HEALTH_CONNECT_READ_PERMISSIONS` L8–14) and `HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts` (~33–39). **Remove** or **strike** incorrect “Yes” rows for steps, RHR, HRV, active/total calories **unless** manifest is expanded (not planned for v1). Add **warning** header: do not copy to Play without manifest diff. | **Edit** |
| M2 | `app/Documentation/HEALTH_FIXES_SUMMARY.md` | **Optional** note: `ACTIVITY_RECOGNITION` / Fit-era docs **historical** — **inference** to avoid internal confusion with M10 | **Edit** (optional) |

---

## 2. UX / copy (in-app)

| MUST | File path | Expected change / action | Change type |
|------|-----------|--------------------------|-------------|
| M4 | `app/src/components/training/TrainingHistoryView.tsx` | Remove/reword **“Active calories (Health Connect, this week)”** and any user-visible string tying active calories to HC when default connect does not grant `active_energy` | **Edit** |
| M6 | `app/src/screens/Dashboard.tsx` | Reorder / style / collapse so **one** primary hero aligns with product (insight vs recovery) | **Edit** |
| M6 | `app/src/components/dashboard/DashboardInsight.tsx` | Prominence, spacing, or “primary” affordance per M6 | **Edit** (optional) |
| M6 | `app/src/components/dashboard/DashboardRecovery.tsx` | Secondary treatment or copy if insight is hero (or inverse) | **Edit** (optional) |
| M6 | `app/src/components/dashboard/DashboardPrimaryAction.tsx` | Ensure primary CTA reflects product decision | **Edit** (optional) |
| M6 | `app/src/components/dashboard/LifecycleHero.tsx` | If competes with insight hero — reduce or reposition | **Edit** (optional) |
| M6 | `app/src/components/dashboard/DashboardToday.tsx` | Same | **Edit** (optional) |
| M7 | `app/src/screens/onboarding/WelcomeScreen.tsx` | Lines ~50–51: tighten “one clear daily insight” **or** match density after M6 | **Edit** |
| M7 | `app/src/screens/onboarding/CapabilitiesScreen.tsx` | Slide “Sleep & recovery” / “program that adapts” — **qualify** if training adaptiveness < copy (`reclaim_vision_gap_matrix.md`) | **Edit** |
| M7 | `app/src/components/dashboard/DashboardRecovery.tsx` | Card title/subtitle if “journey” over-claims | **Edit** (optional) |
| M7 | `app/src/lib/dashboard/recoveryCardMeta.ts` | User-facing strings **if** sourced here — **grep** `recovery` copy | **Edit** (optional) |
| M7 | `app/src/screens/SettingsScreen.tsx` | Recovery section strings if they imply auto progression | **Edit** (optional) |

---

## 3. Code (non-copy)

| MUST | File path | Expected change / action | Change type |
|------|-----------|--------------------------|-------------|
| M4 | `app/src/components/training/TrainingHistoryView.tsx` | Logic: when to show weekly/session active calories; filter T1-06 ghost sessions | **Edit** |
| M9 | `app/src/screens/SleepScreen.tsx` | Remove Roadmap block (T1-01) | **Edit** |
| M9 | `app/src/screens/MeditationScreen.tsx` | Remove Spotify placeholder, dev text (T1-02, T1-03) | **Edit** |
| M9 | `app/src/screens/AboutScreen.tsx` | Gate Sentry test (T1-04) | **Edit** |
| M9 | `app/src/screens/MedsScreen.tsx` | Gate test reminder (T1-05) | **Edit** |
| M9 | `app/src/components/training/TrainingHistoryView.tsx` | Ghost session filter (T1-06) — **overlap** M4 file | **Edit** |
| M9 | `app/src/screens/MindfulnessScreen.tsx` | Intervention display map (T1-07) | **Edit** |
| M9 | `app/src/components/training/TrainingSessionView.tsx` | Footer actions hierarchy (T1-08) | **Edit** |
| M10 | `app/app.config.ts` | Remove `ACTIVITY_RECOGNITION` from `android.permissions` **or** leave + justify in listing (no code change if justified) | **Edit** **or** **verify-only** |

---

## 4. Reference-only (no edit, or verify)

| MUST | File path | Role |
|------|-----------|------|
| M1 | `app/plugins/withHealthConnectPermissions.js` | **Source of truth** for manifest HC XML |
| M1 | `app/src/lib/health/healthConnectService.ts` | **Source of truth** for `HEALTH_CONNECT_DEFAULT_METRICS` |
| M2 | Same | Cross-check for doc |
| M8 | `app/src/lib/telemetry.ts` | `user_id` column — cite in Data safety |
| M8 | `app/src/lib/logSanitizer.ts` | Reference for sanitization story |
| M5 | `app/src/lib/storeCompliance.ts` | `PRIVACY_POLICY_URL` — verify live URL |

---

## 5. Policy / Play Console / manual (no repo path)

| MUST | Work item | Owner |
|------|-----------|--------|
| M1 | Health Connect declaration rows ↔ APK | **Manual** Play Console |
| M1 | Data safety ↔ `telemetry` + Sentry | **Manual** Play Console |
| M3 | **Full** + **short** description; feature graphic; screenshots | **Manual** Play Console |
| M5 | **Privacy policy** URL live + **support** email | **Manual** |
| M8 | Data safety **categories** (identifiers, health, diagnostics, etc.) | **Manual** |
| M8 | **Export** Console screenshots to `docs/memory/raw/` **when available** (`reclaim_manual_release_work.md` C8) | **Manual** |

---

## 6. Product / ownership (no file)

| MUST | Deliverable |
|------|-------------|
| M6 | **Written** decision: primary hero = insight **or** recovery **or** explicit dual with hierarchy |
| M7 | **Written** decision: copy-only vs schedule `setRecoveryStage` wiring (latter = larger scope) |

---

*Phase 1 = MUST before “credible” Android v1 launch per **policy + trust** + **non-negotiables**.*
