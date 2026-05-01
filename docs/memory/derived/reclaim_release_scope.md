# Reclaim — release scope matrix (evidence-based)

**Memory baseline:** `reclaim_canonical_memory_status.md` (**PROVISIONAL CANONICAL MEMORY v0.9**). Historical completeness for pre-export ChatGPT threads remains **provisional** (`reclaim_provisional_origin_note.md`).

**Legend:** Reasoning cites repo paths or docs. **Inference** = plausible but not proven by automated test or Play review.

---

## Ship now (technical baseline)

| Item | Reasoning |
|------|-----------|
| Core app shell: auth, onboarding, drawer + tabs, linked deep routes | `app/src/routing/RootNavigator.tsx` (`reclaim://` linking), `AppNavigator.tsx`, `TabsNavigator.tsx` |
| Health: Android Health Connect for sleep + vitals reads aligned with narrow manifest | `app/plugins/withHealthConnectPermissions.js` (`READ_SLEEP`, `READ_HEART_RATE`, `READ_OXYGEN_SATURATION`, `READ_RESPIRATORY_RATE`, `READ_BODY_TEMPERATURE`); `HEALTH_CONNECT_DEFAULT_METRICS` in `app/src/lib/health/healthConnectService.ts` |
| Insights engine + rules JSON | `app/src/providers/InsightsProvider.tsx`, `app/src/data/insights.json` |
| Training module (session, setup, notifications) | `app/src/screens/TrainingScreen.tsx`, `TrainingSessionView`, `app/src/routing/*` |
| Meds, Mood, Sleep, Mindfulness, Meditation, Dashboard, Analytics, Settings | Screen files under `app/src/screens/` registered in navigators |
| Background sync task | `app/src/lib/backgroundSync.ts`, `TaskManager.defineTask` |
| EAS project wiring | `app/eas.json`, `app/app.config.ts` (`extra.eas.projectId`) |

---

## Ship after targeted fix (trust / policy / doc alignment)

| Item | Reasoning |
|------|-----------|
| Resolve **stale health coverage doc** vs code | **Conflict:** `app/Documentation/HEALTH_API_COVERAGE.md` table lists `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_RESTING_HEART_RATE`, `READ_HEART_RATE_VARIABILITY` as requested; **`withHealthConnectPermissions.js`** and **`HEALTH_CONNECT_DEFAULT_METRICS`** do **not** include those Android permissions/metrics. Risk: internal confusion → wrong Play declaration. **Action:** update `HEALTH_API_COVERAGE.md` to match code **or** change code if product requires those reads. |
| Phase 7 **Tier 1** UX audit — **confirm closed vs stale doc** | `PHASE_7_UI_AUDIT_BACKLOG.md` lists ship-blockers; **spot-check:** `SleepScreen.tsx` / `MeditationScreen.tsx` have **no** `Roadmap` / `Spotify` string matches (2026-04-16 grep). About “Test Sentry” remains **`__DEV__` only** (`AboutScreen.tsx` lines 61–74). Remaining T1 items (e.g. training history/footer) still need file-level verification. |
| Android **resting HR insights** expectation | `app/src/lib/health/fetchHeartRateContextSummary.ts` explicitly returns empty trend on Android (`summarizeRestingHeartRateTrend([])`). Rules using `vitals.restingHrTrendLabel` **Inference:** largely iOS-only value unless changed. Align product copy / rules / Play text. |

---

## Remove from release (or hide) — if still present

| Item | Reasoning |
|------|-----------|
| Any user-visible “coming soon” / placeholder cards called out in Phase 7 | `PHASE_7_UI_AUDIT_BACKLOG.md` Tier 1 — verify grep + screen review before Play **production** track. |
| Diagnostics drawer entry | `app/src/routing/AppNavigator.tsx` line464: `__DEV__ && <Drawer.Screen name="Diagnostics" …` — **not in release builds** if `__DEV__` is false. **No action** for production if Expo release strips dev flag (verify build). |

---

## Defer (documented intent, not blocking a minimal HC-aligned Android ship)

| Item | Reasoning |
|------|-----------|
| iOS **reactive** HR notification path | `app/Documentation/PHASE_6_GAP_AUDIT_BACKLOG.md` — “iOS native subscription not wired into `startHealthTriggers`”. |
| Google Fit | **REMOVED** from codebase (`grep` no `googleFit` in `app/`). Phase 0 doc describes historical removal direction; `HEALTH_API_COVERAGE.md` states Fit removed — aligns. |
| Automated **stress** push (Fit-era) | `app/Documentation/PHASE_0_HC_ANDROID_DECISIONS.md` Decision 2 — **suspended**; no HC stress replacement in Phase 0 lock. |
| Dashboard Skia/haptics/third tile row | `PHASE_6_GAP_AUDIT_BACKLOG.md` references `DASHBOARD_STRUCTURE_FOLLOWUPS.md` — polish, not verified blocking. |

---

## BLOCKED (external)

| Item | Reasoning |
|------|-----------|
| Play **approval** outcome | Requires Google review; not predictable from repo. **Raw history:** two **rejections** on Health Connect minimum scope are preserved in `docs/memory/raw/play-console/` (version code **7** named in second message). |
| **EAS secrets** / signing completeness | Documented in `app/Documentation/EAS_SECRETS_SETUP.md`; verification is on Expo account, not in git. |

---

## Raw memory — scope intent (not a new recommendation pass)

| Item | Reasoning |
|------|-----------|
| **Broad HC usage** for “historical tracking” was discussed (Mar 2026) | `raw/cursor/2026_03_06_12_14_29Z_health_connect_integration_an.md` — user direction; **superseded for Play** by rejection letters + Phase 0 narrow-scope decisions in `app/Documentation/`. |
| **Strangler / JSON phased plan** (notifications cutover, wearables projection) | `raw/codex/2026_02_02_Conduct_architecture_audit_and_propose_improvements.md` — planning artifact; **not** evidence the full phase stack shipped. |
| **Dashboard premium redesign** critique | `raw/codex/2026_02_02_*.md` (Codex opinion) — backlog input only. |
| **Release discipline** (avoid uploading policy-weak builds; blunt review preferred) | `raw/chatgpt/2026-04-19_*` — **reconstructed** process preference from ChatGPT-side memory; **not** a technical ship gate in this matrix. |
