# Reclaim — implementation sequence (safest order)

**Purpose:** Ordered plan **after** launch-definition + prelaunch master **approved**. **Not** execution in this repo pass — **docs only**.

**Principle:** **Policy / truth alignment** first (lowest blast radius for **rejection**), then **misleading UX** copy, then **coherence** code, then **polish**.

**Dependencies:** Each phase assumes previous **complete** unless noted “parallel.”

---

## Phase 0 — Gate: decisions frozen

| Task | Dependencies | Affected artifacts | Launch-blocking |
|------|--------------|-------------------|-----------------|
| **Sign off** `reclaim_android_v1_launch_definition.md` + `reclaim_launch_decisions_master.md` | Stakeholder read | — | **Yes** |
| **Confirm** primary Home story (insight vs recovery) | Product | `reclaim_primary_next_action_decision.md` | **Yes** |

---

## Phase 1 — Documentation & internal single source of truth

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 1.1 | **Fix or quarantine** `HEALTH_API_COVERAGE.md` vs `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` | Phase 0 | `app/Documentation/HEALTH_API_COVERAGE.md`, `app/plugins/withHealthConnectPermissions.js`, `app/src/lib/health/healthConnectService.ts` | **Prevents** wrong Console fill from internal doc (**P0** process) |
| 1.2 | **Append** architecture formalization links to team onboarding **inference** | 1.1 | `docs/release/reclaim_authority_rules_v1.md` | **Reduces** “global brain” mistakes |

**Launch-blocking:** **1.1** is **MUST** for team process; **does not** ship user-visible code.

---

## Phase 2 — Play Console & listing (parallel with Phase 1.3+)

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 2.1 | **Export** or screenshot current Console HC declaration + Data safety **inference** | Phase 1.1 | Play Console → `docs/memory/raw/` (per `reclaim_canonical_memory_status.md` **OQ-1**) | **Evidence** for diff |
| 2.2 | **Reconcile** every HC line with APK manifest | 2.1 | Console + `withHealthConnectPermissions.js` | **P0** |
| 2.3 | **Update** listing: tie types to sleep UI, mindfulness HR nudge, etc. | 2.2 | Play listing | Reviewer narrative |
| 2.4 | **Verify** privacy policy URL + support contact | — | `storeCompliance.ts`, hosted pages | **OQ-4** |

**Launch-blocking:** **2.1–2.4** for **submission credibility** (`reclaim_play_readiness_audit.md`).

---

## Phase 3 — Trust-critical copy & code (small blast radius)

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 3.1 | **Remove/reword** Training HC active-calories line | Phase 0 | `app/src/components/training/TrainingHistoryView.tsx` (`reclaim_play_readiness_audit.md`) | **Immediate** trust + review perception |
| 3.2 | **Phase 7 Tier 1** grep + fix any remaining placeholders / “test” strings | — | Files listed in `PHASE_7_UI_AUDIT_BACKLOG.md`; **re-verify** `reclaim_release_scope.md` spot-checks | **Premium** trust |
| 3.3 | **Product copy** pass: primary Home hero + recovery vs insight alignment | Phase 0 | `Dashboard.tsx`, `components/dashboard/*`, optional onboarding | **User** confusion |
| 3.4 | **Recovery** copy alignment: journey **vs** `setRecoveryStage` evidence | Product decision | `WelcomeScreen`/`Capabilities` **inference**, `DashboardRecovery`, Settings | **Expectation** management |

**Launch-blocking:** **3.1** (MUST), **3.2** (non-negotiables), **3.3–3.4** (product-dependent).

---

## Phase 4 — Permissions & policy hardening

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 4.1 | **ACTIVITY_RECOGNITION** — justify with feature or remove | Product | `app.config.ts` / `app.config.ts` | **Avoid** unexplained sensor permission |
| 4.2 | **Data safety** rows for telemetry + Sentry **inference** | 2.4 | `telemetry.ts`, Sentry config; Console | **Trust** |

**Launch-blocking:** **4.1** if reviewer historically sensitive; **4.2** SHOULD.

---

## Phase 5 — Coherence code (medium blast radius)

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 5.1 | **Optional** `afterHealthSyncRefresh` helper (invalidate + `refreshInsight`) | Architecture sign-off | `IntegrationsScreen.tsx`, `SleepScreen.tsx`, `SleepStepScreen.tsx`, helper module | **Stale** insights off-home |
| 5.2 | **Optional** invalidation key alignment `Dashboard` vs `backgroundSync` | 5.1 **inference** | `Dashboard.tsx`, `backgroundSync.ts` | Cache consistency |

**Launch-blocking:** **No** — **SHOULD** (`reclaim_prelaunch_changes_master.md`).

---

## Phase 6 — Android insight fairness (optional before launch)

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 6.1 | Rule guards or copy for **steps** / **RHR**-dependent rules | — | `insights.json`; optional UI tooltips | **Fair** Android experience |
| 6.2 | Integrations subtitle / Garmin Huawei placement | — | `IntegrationsScreen.tsx`, `integrations.ts` | Clutter |

**Launch-blocking:** **No** — **SHOULD**.

---

## Phase 7 — Build, binary parity, submit

| Order | Task | Dependencies | Affected files/modules | Why this order |
|-------|------|--------------|------------------------|----------------|
| 7.1 | **EAS production** build; **versionCode** / **versionName** match docs | Phases 1–4 | `app/app.config.ts`, `eas.json` | **OQ-2**, **OQ-3** |
| 7.2 | **Binary** manifest diff vs last **rejected** artifact (version 7) | 7.1 | **manual** | **Narrative** for appeal |
| 7.3 | **Submit** + monitor | 2.x, 7.1 | Play Console | External |

---

## Dependency graph (summary)

```
Phase 0 (decisions)
    → Phase 1 (internal HC doc truth)
    → Phase 2 (Console)  ⟵ can overlap Phase 3 after 1.1
    → Phase 3 (Training copy, Tier1, Home copy)
    → Phase 4 (ACTIVITY_RECOGNITION, Data safety)
    → Phase 5 (coherence code) — optional pre-submit
    → Phase 6 (fairness) — optional pre-submit
    → Phase 7 (build + submit)
```

---

## What **not** to do pre-submit (defer)

- `AppWellbeingSnapshot`, merged rankers, **large** `Dashboard` extract, repository strangler — **post-launch** (`reclaim_architecture_changes_cutline.md`).

---

*Companion: `reclaim_prelaunch_changes_master.md`, `reclaim_manual_release_work.md`.*
