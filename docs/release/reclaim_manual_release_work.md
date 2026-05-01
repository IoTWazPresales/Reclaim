# Reclaim — manual release work (non-code checklist)

**Purpose:** Tasks **outside** the git codebase that **must** or **should** happen before **production** Play submission. **Pair** with `reclaim_prelaunch_changes_master.md` MUST items.

**Evidence gaps:** `reclaim_canonical_memory_status.md` — **OQ-1** (Console forms not in repo), **OQ-2** (approval after rejections), **OQ-3** (EAS production validation), **OQ-4** (privacy URL live).

---

## Critical / launch-blocking

| # | Task | Owner **inference** | Evidence / why |
|---|------|---------------------|----------------|
| C1 | **Play Console — Health Connect declaration** aligned to **`withHealthConnectPermissions.js`** + runtime `HEALTH_CONNECT_DEFAULT_METRICS` | Release manager | **P0** `reclaim_play_blocker_matrix.md`; **OQ-1** |
| C2 | **Play Console — Data safety** questionnaire matches **actual** collection: `telemetry.ts` (`app_logs`, `user_id`), Sentry **inference**, auth | Release + eng | `reclaim_trust_risk_notes.md`, `reclaim_play_readiness_audit.md` |
| C3 | **Privacy policy URL** — live, reachable, matches app (`EXPO_PUBLIC_PRIVACY_POLICY_URL` / `storeCompliance.ts`) | Legal / ops | **OQ-4** |
| C4 | **Support email / contact** in listing matches **working** channel | Ops | Play requirement **inference** |
| C5 | **Store listing** short + full description — no **steps/calories/RHR/HRV from HC** on Android unless true | Product | Second rejection letter; `reclaim_launch_narrative_and_claims.md` |
| C6 | **Screenshots / feature graphic** — reflect **actual** UI (no deprecated Fit, no **claimed** metrics not in app) | Design / PM | Trust + policy |
| C7 | **Version code / version name** — **production** track binary matches **documented** intent (`versionCode` **8** in repo per `reclaim_play_readiness_audit.md`) | Eng | **OQ-2**, **OQ-3** |
| C8 | **Export** Console declaration + Data safety screenshots or PDF to `docs/memory/raw/` **when available** | Release | **OQ-1** closure (`reclaim_canonical_memory_status.md`) |

---

## Important (should complete pre-submit)

| # | Task | Notes |
|---|------|-------|
| I1 | **Internal audit:** `HEALTH_API_COVERAGE.md` **cannot** be pasted into Console until fixed | `reclaim_play_readiness_audit.md` |
| I2 | **ACTIVITY_RECOGNITION** narrative in **listing** or internal appeal doc if challenged | `reclaim_permission_justification_matrix.md` |
| I3 | **Background sync** / battery — disclosure in listing if Play expects it | `reclaim_trust_risk_notes.md` |
| I4 | **Medical / peer-review** wording review for **Evidence** screens | **OQ-7** `reclaim_trust_risk_notes.md` |
| I5 | **Play Integrity** edge function deployed + env for production | **OQ-5** `reclaim_play_blocker_matrix.md` |
| I6 | **EAS secrets** / signing — account verification | `reclaim_release_scope.md` BLOCKED external |
| I7 | **Second rejection** vs **current** binary — written summary for team (version **7** vs **8**) | `reclaim_play_readiness_audit.md` |

---

## Secondary

| # | Task |
|---|------|
| S1 | **Beta** track dry-run upload before production |
| S2 | **Crashlytics/Sentry** project mapping for release build |
| S3 | **Internal** changelog for reviewers (HC scope, insight engine, training) |
| S4 | **Screenshot** refresh after Phase 7 Tier 1 UI fixes |

---

## Minor / housekeeping

| # | Task |
|---|------|
| M1 | Confirm **diagnostics** screen **absent** in production (`__DEV__`) |
| M2 | **Store** “What’s new” text for first public Android |
| M3 | **Align** website or landing page **if** linked from listing — same HC claims |

---

## Open external dependencies (cannot close in repo)

| ID | Item |
|----|------|
| **OQ-2** | Google **approval** outcome after resubmit — **unpredictable** |
| **OQ-1** | Until Console export lands, **full** declaration audit is **provisional** |

---

## Version / build clarification

| Fact | Source |
|------|--------|
| **versionCode 8** in repo | `reclaim_play_readiness_audit.md` |
| **Rejection** referenced **versionCode 7** | Second Play letter (`reclaim_master_inventory.md` §A) |
| **Action** | Confirm **Play Console** shows intended **AAB** before **production** promote |

---

*After completion, update `reclaim_source_provenance_matrix.md` **inference** when Console evidence is archived.*
