# Reclaim — prelaunch changes master

**Groups:** **MUST CHANGE BEFORE LAUNCH** · **SHOULD CHANGE BEFORE LAUNCH** · **CAN WAIT UNTIL POST-LAUNCH**

**Types:** code · UX · copy · docs · Play Console · policy · manual verification

**Blast radius:** **Low** = localized; **Medium** = several modules / listing; **High** = architecture or broad UX.

---

## MUST CHANGE BEFORE LAUNCH

| # | Item | Files / surfaces | Type | Why it matters | Blast radius |
|---|------|------------------|------|----------------|--------------|
| M1 | **Play Console Health Connect declaration + Data safety** match **current APK** manifest + `HEALTH_CONNECT_DEFAULT_METRICS` | Play Console (not in repo); code: `app/plugins/withHealthConnectPermissions.js`, `app/src/lib/health/healthConnectService.ts` | **Play Console** + **manual verification** | **P0** rejection risk if stale (`reclaim_play_blocker_matrix.md` **OQ-1**) | **High** |
| M2 | **Reconcile `app/Documentation/HEALTH_API_COVERAGE.md`** with manifest + default metrics OR quarantine with banner | `app/Documentation/HEALTH_API_COVERAGE.md`; cross-check `withHealthConnectPermissions.js` | **docs** (+ **policy**) | Wrong doc → wrong Console if copied (`reclaim_play_readiness_audit.md` must-fix) | **Medium** |
| M3 | **Store listing** copy: each **declared** HC type tied to **visible** feature (sleep detail, optional HR nudge, etc.) | Play Console listing; **inference:** mirror `reclaim_permission_justification_matrix.md` | **Play Console** + **copy** | Reviewer perception; first-letter HR/vitals story (`reclaim_play_readiness_audit.md`) | **High** |
| M4 | **Training weekly / history** — remove or reword **“Active calories (Health Connect…)”** when `active_energy` **not** in default connect bundle | `app/src/components/training/TrainingHistoryView.tsx`; `app/src/lib/health/healthConnectService.ts` | **code** + **copy** | **Misleading** user + reviewer (`reclaim_launch_non_negotiables.md`, `reclaim_play_readiness_audit.md`) | **Low**–**Medium** |
| M5 | **Privacy policy URL** live + matches `storeCompliance.ts` / `EXPO_PUBLIC_PRIVACY_POLICY_URL` | `app/src/lib/storeCompliance.ts` (or equivalent); hosted policy | **manual verification** + **policy** | **OQ-4** (`reclaim_trust_risk_notes.md`) | **Medium** |
| M6 | **Product lock** — primary Home story (insight **vs** recovery **vs** routine) | `Dashboard.tsx` order/copy; `reclaim_primary_next_action_decision.md` | **UX** + **copy** + **ownership** | Two CTAs / trust (`reclaim_launch_critical_integrations.md`) | **Medium** |
| M7 | **Align recovery journey marketing** with progression evidence — or wire stage APIs | `app/src/lib/recovery.ts` consumers; onboarding/Home copy; optional `setRecoveryStage` callers | **copy** ± **code** | Broken expectation (`reclaim_architecture_discovery_vs_prior_audits.md`) | **Medium** |
| M8 | **Telemetry / Data safety** — `user_id` on `app_logs` declared; `sanitizeLogPayload` coverage understood | `app/src/lib/telemetry.ts`; Play Data safety form | **Play Console** + **manual verification** | Under-declaration risk (`reclaim_trust_risk_notes.md`) | **Medium** |
| M9 | **Phase 7 Tier 1** — close **placeholder / test** / misleading production paths | `PHASE_7_UI_AUDIT_BACKLOG.md` targets; **re-verify** spot-checks in `reclaim_release_scope.md` | **code** + **UX** | Premium trust (`reclaim_launch_non_negotiables.md`) | **Low**–**Medium** |
| M10 | **ACTIVITY_RECOGNITION** — justify with visible step/activity feature **or** remove | `app/app.config.ts` / `app.config.ts`; product | **code** + **policy** | Reviewer question (`reclaim_play_readiness_audit.md`, `reclaim_permission_justification_matrix.md`) | **Medium** |

---

## SHOULD CHANGE BEFORE LAUNCH

| # | Item | Files / surfaces | Type | Why it matters | Blast radius |
|---|------|------------------|------|----------------|--------------|
| S1 | **Shared post-sync helper** — `invalidateQueries` + `refreshInsight` after `requestHealthSync` where non-Dashboard flows need parity | `IntegrationsScreen.tsx`, `SleepScreen.tsx`, `SleepStepScreen.tsx`, optionally `RootNavigator.tsx`; new helper under `app/src/` **inference** | **code** | Stale insights after sync (`reclaim_cross_module_call_paths.md`, formalization) | **Medium** |
| S2 | **Invalidation map** — document or align `Dashboard.tsx` vs `backgroundSync.ts` keys | `Dashboard.tsx`, `backgroundSync.ts` | **docs** + optional **code** | Stale cache (`reclaim_architecture_changes_cutline.md`) | **Medium** |
| S3 | **Dashboard hierarchy** — pass “one hero insight” test (**~5s** scan) | `Dashboard.tsx`, `components/dashboard/*` | **UX** | Vision gap (`reclaim_vision_gap_matrix.md`, `reclaim_launch_non_negotiables.md` SHOULD) | **Medium** |
| S4 | **Onboarding vs Home** — tighten **Welcome** / **Capabilities** copy **or** dashboard density to match “one clear daily insight” | `WelcomeScreen.tsx`, `CapabilitiesScreen.tsx`, `Dashboard.tsx` | **copy** + **UX** | Identity (`reclaim_vision_alignment_audit.md`) | **Medium** |
| S5 | **Integrations** — honest Garmin/Huawei framing | `integrations.ts`, `IntegrationsScreen.tsx` | **copy** | Noise (`reclaim_launch_non_negotiables.md` SHOULD) | **Low** |
| S6 | **Android resting HR / steps** — user-facing calibration or rule guards for `insights.json` rules that depend on thin context | `insights.json`, optional tooltips, `fetchHeartRateContextSummary.ts` comments surfaced | **copy** + optional **code** | Fairness (`reclaim_vision_gap_matrix.md`) | **Medium** |
| S7 | **Internal `HEALTH_API_COVERAGE.md`** — if not fully fixed in MUST, **block** copy-paste to Console | Same as M2 | **process** | Team error | **Low** |
| S8 | **Mindfulness / HR** — in-app line on **why** HR helps (Android) | `MindfulnessScreen.tsx`, settings/notifications | **copy** | Permissions narrative (`reclaim_launch_non_negotiables.md` SHOULD) | **Low** |
| S9 | **`MoodScreen` `forceRescheduleNotifications`** — document dual path vs reconcile-only | `MoodScreen.tsx`; architecture doc | **docs** | Maintenance (`reclaim_architecture_changes_cutline.md`) | **Low** |
| S10 | **Measure** `reconcileNotifications` cost at boot + sync | Instrumentation **inference** | **manual verification** | Battery (`reclaim_architecture_changes_cutline.md`) | **Low** |

---

## CAN WAIT UNTIL POST-LAUNCH

| # | Item | Files / surfaces | Type | Why deferrable | Risk of deferring |
|---|------|------------------|------|----------------|-------------------|
| P1 | Extract `Dashboard` orchestration to helpers | `Dashboard.tsx` | **code** | Works today (`reclaim_launch_critical_architecture_decisions.md`) | **Harder** refactor later |
| P2 | Unified `AppWellbeingSnapshot` | N/A | **code** | Not in codebase | Dual rankers remain |
| P3 | Merge insight + recovery rankers | Engine + UI | **code** + **product** | Large | **Ongoing** CTA tension |
| P4 | Merge RQ + `fetchInsightContext` fetches | `contextBuilder.ts`, queries | **code** | Duplicate network acceptable short-term | **Perf** debt |
| P5 | Repository strangler / `sync.ts` split | `lib/sync.ts` | **code** | Stability first | **Maintainability** |
| P6 | Wire `setRecoveryStage` / `markStageCompleted` | Call sites + UI | **code** | No callers today | **Journey** stays implicit |
| P7 | iOS reactive HR parity with Android triggers | `notificationTriggers.ts` | **code** | Android-first launch | **Platform** gap |
| P8 | Garmin/Huawei real connectors | `integrations.ts` | **code** | Placeholders OK | **Roadmap** |
| P9 | Full `STATE→MEANING→ACTION` branded system | Many surfaces | **UX** | Rules already strong | **Brand** only |
| P10 | Codex dashboard premium hero / readiness score | `Dashboard.tsx` | **UX** | WANTED not shipped | **Polish** |
| P11 | Splash orb / `ReclaimLogo` analytic ellipses | `ReclaimLogo.tsx` | **UX** | Inventory conflict | **Minor** brand |
| P12 | Full Maestro coverage | `app/.maestro/` | **QA** | Smoke may suffice | **Regression** risk |
| P13 | `firedAt` / fingerprint training notif hardening | `NotificationScheduler.ts` | **code** | Partial | **Edge** duplicate notifs |

---

## Cross-reference: launch-blocking vs quality

| Bucket | Typical mix |
|--------|-------------|
| **MUST** | Play alignment, trust copy, **critical** misleading UX, **policy** verification |
| **SHOULD** | Coherence, freshness, hierarchy, **fair** Android insights |
| **DEFER** | Large architecture, **nice** polish, **parity** features |

---

*Pair with `reclaim_implementation_sequence.md` and `reclaim_manual_release_work.md`.*
