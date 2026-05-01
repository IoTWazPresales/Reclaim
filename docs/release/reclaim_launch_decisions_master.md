# Reclaim — launch decisions master ledger

**Method:** Consolidates `reclaim_master_inventory.md`, `reclaim_release_scope.md`, `reclaim_vision_gap_matrix.md`, `reclaim_launch_non_negotiables.md`, `reclaim_feature_drift_and_clutter.md`, `reclaim_system_coherence_audit.md`, `reclaim_feature_interconnection_matrix.md`, `reclaim_shared_state_and_interpretation_gaps.md`, Play blockers, architecture formalization.

**Legend — launch status:**

| Status | Meaning |
|--------|---------|
| **KEEP** | Ship as core v1 |
| **NARROW** | Ship but reduce claims, prominence, or scope |
| **MERGE** | Combine overlapping UX/surfaces where redundant |
| **DEFER** | Post-launch; not v1 promise |
| **REMOVE** | Remove, hide in prod, or quarantine misleading paths |

---

## Core shell & account

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Auth (Supabase) | **KEEP** | Core | `RootNavigator.tsx` | Standard | Low |
| Onboarding stack | **KEEP** | First-run promise | `OnboardingNavigator.tsx`, `WelcomeScreen.tsx` | Identity | **High** if copy ≠ Home |
| Drawer + tabs + stacks | **KEEP** | Navigation model | `AppNavigator.tsx`, `TabsNavigator.tsx` | Discovery | Low |
| Deep linking `reclaim://` | **KEEP** | Notifications + UX | `RootNavigator.tsx` | Flow | Low |

---

## Insights & interpretation

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| `InsightsProvider` + `InsightEngine` + `insights.json` | **KEEP** | Core brain | Code + `reclaim_system_coherence_audit.md` | Daily value | Low if data present |
| `fetchInsightContext` / `contextBuilder.ts` | **KEEP** | Single assembly | Discovery: sole caller `InsightsProvider` | Coherence | Low |
| Per-screen `useInsightForScreen` | **KEEP** | Scoped insight | Dashboard, Sleep, Mood, Meds | Clarity | Low |
| Broad rule catalog | **NARROW** | Some rules need steps/RHR Android may lack | `reclaim_feature_drift_and_clutter.md`, `reclaim_vision_gap_matrix.md` | **Silent** or rare fires | **Medium** — feels “dead” |
| Cross-domain training+mood+sleep rules | **KEEP** | Differentiation | `insights.json` | Strength | Low |

---

## Home & hierarchy

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| `Dashboard.tsx` as Home | **KEEP** | Central hub | Inventory | Primary | Low |
| Insight + Recovery cards together | **KEEP** + **NARROW** | Two rankers — **product** must clarify primary | `reclaim_primary_next_action_decision.md` | **Two CTAs** | **High** trust if contradictory |
| `DashboardPrimaryAction` / visual order | **NARROW** | “One hero” test (`reclaim_launch_non_negotiables.md` SHOULD) | `reclaim_premium_experience_gaps.md` | Scan time | Medium |
| Premium starfield + lifecycle hero + tiles | **KEEP** + **NARROW** | Density vs “one insight” (`reclaim_vision_gap_matrix.md` **High**) | `Dashboard.tsx` | Overwhelm | Medium |
| Routines + schedule overlay | **KEEP** + **MERGE** *inference* | Third planning layer (`reclaim_system_coherence_audit.md`) | `Dashboard.tsx`, `lib/routines` | Cognitive load | Medium — **design** optional v1 |

---

## Recovery journey

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| `getRecoveryProgress` + `DashboardRecovery` + `recoveryCardMeta.ts` | **KEEP** | Home differentiation | `reclaim_feature_interconnection_matrix.md` | Journey metaphor | Low |
| AsyncStorage `recovery.ts` | **KEEP** | State | Discovery | Persistence | Low |
| `resetRecoveryProgress` (Settings) | **KEEP** | User control | `SettingsScreen.tsx` | Reset | Low |
| Automated stage via `setRecoveryStage` / `markStageCompleted` | **NARROW** / **DEFER** | **No** external call sites | Discovery grep | **Expectation** of automation | **High** if marketing says “journey advances” without code proof |
| Training tied to recovery stages | **DEFER** | Weak link (`reclaim_shared_state_and_interpretation_gaps.md`) | `recovery.ts` stages vs training | — | Low for v1 if copy scoped |

**Formal stance:** Recovery is **launch-core** as **guided surface + storage**; **launch-support** (not expansion) for **automated progression** until wired (`reclaim_architecture_formalization_decisions.md`).

---

## Health & integrations (Android)

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Health Connect narrow manifest | **KEEP** | Play strategy | `withHealthConnectPermissions.js` | Trust | **Low** if Console matches |
| `HEALTH_CONNECT_DEFAULT_METRICS` connect flow | **KEEP** | Runtime alignment | `healthConnectService.ts`, `integrations.ts` | Connect | Low |
| Sleep + vitals on `SleepScreen.tsx` | **KEEP** | Justifies reads | `reclaim_play_readiness_audit.md` | Value | Low |
| HR samples → mindfulness nudges | **KEEP** + **NARROW** | Listing must explain | `notificationTriggers.ts`, `useHealthTriggers` | Optional value | **Medium** Play if unexplained |
| Samsung / Apple paths | **KEEP** | iOS / partial Android | `integrations.ts` | Platform | Low |
| Garmin / Huawei | **DEFER** + **NARROW** prominence | Placeholders (`reclaim_feature_drift_and_clutter.md`) | `integrations.ts` | Noise | Low if collapsed |
| Google Fit | **REMOVE** | Gone from TS | Grep + inventory | — | N/A |
| `HEALTH_API_COVERAGE.md` (internal) | **NARROW** / **fix** | **Conflicts** manifest | `reclaim_play_blocker_matrix.md` **P0** | **Console** wrong fill | **P0** process |

---

## Training

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Training session UI + notifications | **KEEP** | Core capability | `TrainingScreen.tsx`, `TrainingSessionView`, schedulers | Engagement | Medium inventory gaps |
| Training history “Active calories (Health Connect…)” | **REMOVE** or **NARROW** | `active_energy` not in default HC metrics | `reclaim_play_readiness_audit.md`, `TrainingHistoryView.tsx` | **Misleading** | **P1** trust + review |
| Watch / notification-mirrored flow | **KEEP** | Codex narrative | `useNotifications.ts` | UX | Partial hardening **DEFER** (`reclaim_master_inventory.md` §C) |

---

## Mood, meds, sleep screens

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Mood / Meds / Sleep stacks | **KEEP** | Core | Navigators | Loop | Low |
| Mood sustained low → crisis routing in rules | **KEEP** | Non-negotiable | `insights.json` | Safety | Low |
| `MoodScreen` `forceRescheduleNotifications` | **KEEP** + doc | Second policy path | Discovery | prefs | Low — **clarify** architecture |

---

## Mindfulness & meditation

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Mindfulness + Meditation screens | **KEEP** | Capabilities promise | Screens | Value | Low |
| iOS reactive HR parity | **DEFER** | PARTIAL | `reclaim_launch_non_negotiables.md` | — | Low Android-first |

---

## Notifications

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| `reconcileNotifications` + intents | **KEEP** | Canonical sink | Architecture docs | Reliability | Low |
| Daily / weekly / mood trend from `Dashboard` | **KEEP** | Home-owned | Discovery | Habit | Medium noise — **audit** opt-outs |
| Training categories + `TaskManager` | **KEEP** | Core | `useNotifications.ts` | Training | Medium — **defer** Claude wishlist |
| Calendar wellness nudges | **KEEP** | Android | `wellnessCalendarContextNudges.ts` | Nudges | Low |

---

## Analytics, evidence, moments

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Analytics tab | **KEEP** | Secondary | `reclaim_feature_drift_and_clutter.md` | Retrospective | Low |
| Evidence notes / Moments | **KEEP** + **NARROW** prominence | Not first-week core | `reclaim_feature_drift_and_clutter.md` | Depth | Low |

---

## Diagnostics & dev

| Feature / surface | Status | Why | Evidence | User impact | Launch risk |
|-------------------|--------|-----|----------|-------------|-------------|
| Diagnostics drawer | **REMOVE** from prod | `__DEV__` only | `AppNavigator.tsx` (`reclaim_release_scope.md`) | — | N/A if release strips |

---

## Architecture / engineering backlog (not features)

| Topic | Status | Why |
|-------|--------|-----|
| Unified `AppWellbeingSnapshot` | **DEFER** | `reclaim_architecture_changes_cutline.md` |
| Repository strangler | **DEFER** | `reclaim_master_inventory.md` |
| Merge insight + recovery rankers | **DEFER** | Product only |
| Post-sync `refreshInsight` helper | **SHOULD** code | `reclaim_prelaunch_changes_master.md` |

---

## Answers to planning questions (cross-reference)

| # | Question | Answer (this ledger) |
|---|----------|----------------------|
| 1 | **Android v1 product definition** | See `reclaim_android_v1_launch_definition.md` |
| 2 | **First-week experience** | Onboard → connect (optional) → log → insight reflection → scoped actions; sleep honest on HC |
| 3 | **Primary “next action”** | **Product-owned**; insight vs recovery **parallel** until merged by spec |
| 4 | **What Home prioritizes** | **Component order** in `Dashboard.tsx` — **must** align with product “one hero” (`reclaim_primary_next_action_decision.md`) |
| 5 | **Recovery** | **Launch-core** as **card + storage + meta**; **launch-support** for **auto progression** (unverified APIs) |
| 6 | **Features** | Table above |
| 7–9 | Code / Play / order | `reclaim_prelaunch_changes_master.md`, `reclaim_implementation_sequence.md`, `reclaim_manual_release_work.md` |

---

*Update when manifest, Play outcome, or recovery wiring changes.*
