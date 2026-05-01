# Reclaim — Phase 2 file change map (**SHOULD** only)

**Scope:** Items **S1–S10** from `reclaim_prelaunch_changes_master.md`. **No** MUST items here.

---

## S1 — Shared post-sync insight + cache refresh (where gap)

| File path | **Inspection result** (April 2026) | Suggested action |
|-----------|-------------------------------------|------------------|
| `app/src/screens/IntegrationsScreen.tsx` | **Already** calls `refreshInsights('integrations-connect')` and `refreshInsights('integrations-import')` after `requestHealthSync` (~433–458, ~561–588) | **Verify-only** unless regression found |
| `app/src/screens/SleepScreen.tsx` | **Already** calls `refreshInsight` after multiple sync paths (`sleep-health-import`, `sleep-auto-sync`, `sleep-connect`, etc.) | **Verify-only** |
| `app/src/screens/onboarding/SleepStepScreen.tsx` | `requestHealthSync({ reason: 'onboarding_sleep_connect' })` **without** `refreshInsight` in same grep — **InsightsProvider** session refresh **may** cover | **Optional edit:** after successful sync, call `useScientificInsights().refresh` with reason **or** document **sufficient** |
| `app/src/routing/RootNavigator.tsx` | `requestHealthSync(STARTUP_GATE)` **only** (~213–215); **no** `refreshInsight` | **Optional edit:** after sync, `refreshInsight('startup-sync')` **if** product sees stale insights **before** `InsightsProvider` session-ready runs |
| **New** `app/src/lib/sync/afterHealthSyncRefresh.ts` **or** `app/src/hooks/useAfterHealthSync.ts` | **Inference** — only if consolidating | **Create** (optional) |

**Docs:** `docs/release/reclaim_cross_module_call_paths.md`; `reclaim_architecture_formalization_decisions.md` §2.

---

## S2 — Invalidation map (Dashboard vs background)

| File path | Action |
|-----------|--------|
| `app/src/screens/Dashboard.tsx` | `grep` / extract all `queryKey` invalidations — **document** |
| `app/src/lib/backgroundSync.ts` | Lines ~41–51: `dashboard:lastSleep`, `sleep:*`, `meds*`, `mood*`, `training:sessions*` — **document** parity |
| **New** doc in `docs/release/` **or** `app/Documentation/` | **Invalidation map** table |

---

## S3 — Dashboard hierarchy (“one hero” ~5s)

| File path | Action |
|-----------|--------|
| `app/src/screens/Dashboard.tsx` | Compose order, scroll anchors, `ScrollView`/`FlatList` |
| `app/src/components/dashboard/DashboardInsight.tsx` | Hero sizing |
| `app/src/components/dashboard/DashboardRecovery.tsx` | Secondary treatment |
| `app/src/components/dashboard/DashboardPrimaryAction.tsx` | Single primary |
| `app/src/components/dashboard/LifecycleHero.tsx` | Density |
| `app/src/components/dashboard/PremiumStarfield.tsx` | Motion / distraction — **optional** reduce |
| `app/src/components/dashboard/HomeDashboardTile.tsx` | Tile grid density |
| `app/src/components/dashboard/ScheduleOverlay.tsx` | Overlay vs hero |
| `app/src/components/dashboard/DashboardGreeting.tsx` | Header space |
| `app/src/components/dashboard/` (other tiles) | **As needed** per design |

---

## S4 — Onboarding ↔ Home alignment

| File path | Action |
|-----------|--------|
| `app/src/screens/onboarding/WelcomeScreen.tsx` | Soften “one clear daily insight” **or** keep + M3/S3 |
| `app/src/screens/onboarding/CapabilitiesScreen.tsx` | Slide copy vs capability |
| `app/src/screens/Dashboard.tsx` | Match promise |

---

## S5 — Integrations honesty (Garmin / Huawei)

| File path | Action |
|-----------|--------|
| `app/src/lib/integrations.ts` | `DEFINITIONS` / placeholder titles — **copy** |
| `app/src/screens/IntegrationsScreen.tsx` | Subtitle, section order, “setup required” |

---

## S6 — Android resting HR / steps fairness

| File path | Action |
|-----------|--------|
| `app/src/data/insights.json` | Tighten `when` / guards for rules using `steps` or `vitals.restingHrTrendLabel` |
| `app/src/lib/health/fetchHeartRateContextSummary.ts` | Engineer comments — **optional** user-facing string |
| `app/src/components/InsightCard.tsx` **or** `app/src/hooks/useInsightForScreen.ts` | **Inference:** footnote when data thin |
| **Optional** `app/src/screens/SettingsScreen.tsx` | Calibrate expectations |

---

## S7 — Process

| Item | Action |
|------|--------|
| Same as M2 | **S7** satisfied when M2 complete — **no** extra file |

---

## S8 — Mindfulness + HR “why”

| File path | Action |
|-----------|--------|
| `app/src/screens/MindfulnessScreen.tsx` | Short explainer for HR permission value (Android) |
| `app/src/screens/SettingsScreen.tsx` **or** `app/src/screens/NotificationsScreen.tsx` | **Inference:** if HR triggers explained |

---

## S9 — Document `forceRescheduleNotifications`

| File path | Action |
|-----------|--------|
| `app/src/screens/MoodScreen.tsx` | **grep** `forceRescheduleNotifications` — add **code comment** linking to architecture doc |
| `docs/release/reclaim_authority_rules_v1.md` **or** `reclaim_cross_module_call_paths.md` | **Paragraph** on dual-path Mood |

---

## S10 — Measure reconcile cost

| Item | Action |
|------|--------|
| **No** file | **Manual:** Android Studio profiler / `logTelemetry` timing around `reconcileNotifications` in `useNotifications.ts` boot path — **inference** |

---

*Phase 2 = **coherence + fairness**; **not** all launch-blocking.*
