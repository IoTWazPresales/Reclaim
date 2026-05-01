# Reclaim — Android v1 launch definition

**Sources:** `docs/memory/derived/reclaim_release_scope.md`, `reclaim_master_inventory.md`, `reclaim_discussion_recon.md`, `reclaim_canonical_memory_status.md`, `reclaim_vision_alignment_audit.md`, `reclaim_vision_gap_matrix.md`, `reclaim_launch_non_negotiables.md`, `reclaim_system_coherence_audit.md`, `reclaim_launch_critical_integrations.md`, architecture formalization (`reclaim_architecture_formalization_decisions.md`, `reclaim_primary_next_action_decision.md`), Play/trust docs (`reclaim_play_readiness_audit.md`, `reclaim_play_blocker_matrix.md`).

**Scope:** **Android** primary; **Expo/EAS** build per `app/app.config.ts` / `app/eas.json`. **Inference** labeled.

---

## One-sentence launch promise

**Reclaim Android v1 is a mood–sleep–habits wellbeing app that turns connected health data and your logs into interpretable daily insights, with sleep-forward Health Connect scope, optional HR-informed mindfulness nudges on Android, and a structured home experience—not a full clinical or parity-equal “recovery science” stack on every platform.**

*(Tighter marketing variant, onboarding-aligned:)* **“Connect your day, see one clear daily insight, and take the next step—personalised to what you log and what Health Connect can share.”** — **only** honest if Home hierarchy and copy are aligned (`reclaim_vision_gap_matrix.md`, `WelcomeScreen.tsx`).

---

## Core experience definition (what v1 **is**)

| Pillar | Definition | Evidence |
|--------|------------|----------|
| **Account & shell** | Supabase auth; onboarding stack; drawer + tabs; deep links `reclaim://` | `RootNavigator.tsx`, `AppNavigator.tsx`, `TabsNavigator.tsx` (`reclaim_release_scope.md`) |
| **Scientific insights** | `fetchInsightContext` → `InsightEngine` + `insights.json`; `InsightsProvider` sole pipeline | `reclaim_code_first_architecture_discovery.md` |
| **Home** | `Dashboard.tsx`: insight card, recovery card, tiles, routines/overlay, sync + `refreshInsight`, daily/weekly/mood notification scheduling from home | Discovery + `reclaim_dashboard_orchestration_decision.md` |
| **Domains** | Sleep, Mood, Meds, Training, Mindfulness, Meditation, Analytics, Settings, Integrations, Notifications (screens under `app/src/screens/`) | `reclaim_master_inventory.md` §B |
| **Android health** | **Narrow** Health Connect: sleep + HR + overnight vitals (SpO2, RR, body temp) per `app/plugins/withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts` | `reclaim_release_scope.md`, `reclaim_play_readiness_audit.md` |
| **Sync & background** | `SyncCoordinator`, `lib/sync.ts`, `backgroundSync.ts`, `SyncEngine.ts` | Architecture docs |
| **Notifications** | `reconcileNotifications` sink + `NotificationIntentStore`; training `TaskManager` in `useNotifications.ts`; health triggers `notificationTriggers.ts` | Discovery |

---

## First-week experience (committed narrative)

**Goal:** Onboarding promise defensible on **first week** (`reclaim_launch_non_negotiables.md`).

| Day band | Intended experience | Depends on |
|----------|---------------------|------------|
| **Day 0** | Complete onboarding (`OnboardingNavigator.tsx`); land in app; optional HC connect | Permissions, Integrations |
| **Day 0–1** | **Coherent loop:** log mood (or key action) → see reflection in **insights** → at least **one** clear suggested action from rules (`insights.json` `action` where present) | `InsightsProvider.refresh`, queries |
| **First week** | Sleep story matches **Android HC reality** (narrow reads; rich `SleepScreen.tsx` when data exists) | `reclaim_launch_non_negotiables.md` |
| **Ongoing** | Daily signal / weekly / mood trend notifications **if** enabled — tied to engine or prefs (`scheduleDailySignalNotification` from `Dashboard.tsx` only — discovery) | Settings + schedulers |

**Inference:** Exact day-by-day **engagement** curves are **not** specified in repo; **first-week** = **product commitment** above, not analytics proof.

---

## What Reclaim does **best** at launch

1. **Interpretable cross-domain rules** — `insights.json` + `why` / `action` where present (`reclaim_system_coherence_audit.md`, `reclaim_vision_alignment_audit.md`).
2. **Sleep + overnight vitals depth** when HC provides data — `SleepScreen.tsx` + merge path (`reclaim_play_readiness_audit.md` “defensible”).
3. **Single insights pipeline** — `InsightsProvider` + sole `fetchInsightContext` caller (`reclaim_architecture_formalization_decisions.md`).
4. **Notification materialization** — reconcile as sink + multiple **intentional** producers (`reclaim_runtime_authority_map.md`).
5. **Crisis-adjacent guardrails** in mood rules (e.g. sustained low → crisis line in `insights.json`) — `reclaim_launch_non_negotiables.md`.

---

## What Reclaim **does not** claim at launch

| Claim to **avoid** or **scope** | Why |
|----------------------------------|-----|
| **Full Health Connect “all metrics”** | Rejected historically; narrow manifest (`reclaim_discussion_recon.md` §4). |
| **Steps / active calories / RHR / HRV from HC on Android** | **Not** in current plugin / default metrics; second rejection cluster (`reclaim_play_readiness_audit.md`). |
| **Identical “recovery science” on iOS vs Android** | Resting HR insight path thin/empty on Android HC (`fetchHeartRateContextSummary.ts`); reactive HR triggers **Android-primary** (`reclaim_vision_gap_matrix.md`). |
| **Garmin / Huawei as shipped connectors** | Placeholder / setup walls (`reclaim_feature_drift_and_clutter.md`). |
| **Single global “brain” ranker** | **Not** in code — parallel insight + recovery (`reclaim_primary_next_action_decision.md`). |
| **Automated recovery **stage** progression as a proven engine** | `setRecoveryStage` / `markStageCompleted` **uncalled** outside `recovery.ts` (`reclaim_architecture_discovery_vs_prior_audits.md`). |
| **Play approval** | External (**BLOCKED** in `reclaim_release_scope.md`). |

---

## What makes it **differentiated** (honest)

- **Integrated interpretation layer** for mood, sleep, training, meds, calendar slices in **one** `InsightContext` pipeline — not siloed trackers only (`reclaim_system_coherence_audit.md`).
- **Recovery card** that **reuses** sleep/meds/mood signals via **`recoveryCardMeta.ts`** — parallel to insights, **same** rough data plane, **different** UX ranker (`reclaim_feature_interconnection_matrix.md`).
- **Daily signal** notification extending **top insight** off-device (`reclaim_launch_critical_integrations.md`).
- **Premium** visual investment on Home (`PremiumStarfield`, lifecycle hero — `reclaim_premium_experience_gaps.md`) — differentiation is **feel + depth**, not **minimal** single-card app.

---

## Version / build note

**Repo `versionCode`:** **8** per `reclaim_play_readiness_audit.md` (`app/app.config.ts`). **Play** evidence references **version code 7** rejection — treat **binary + Console** alignment as **manual** verification (`reclaim_manual_release_work.md`).

---

*Companion: `reclaim_launch_decisions_master.md`, `reclaim_launch_narrative_and_claims.md`.*
