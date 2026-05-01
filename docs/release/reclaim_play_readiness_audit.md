# Reclaim — Play readiness audit (formal pass 1)

**Scope:** Policy / Play / trust / permissions only. **Not** a full code quality or UX polish audit.  
**Baseline memory:** `docs/memory/derived/reclaim_canonical_memory_status.md` (v0.9 provisional).  
**Verbatim Play evidence:** `docs/memory/raw/play-console/2026_04_08_*.md`, `2026_04_16_*.md`.

**Current `versionCode` in repo:** **8** (`app/app.config.ts`). **Play evidence** references **version code 7** (second rejection). **Inference:** a newer binary may already differ from the rejected artifact; **Open:** whether that binary was submitted and what declaration it used (**OQ-1**, **OQ-2**).

---

## Executive verdict

**Credibility of a near-term resubmission:** **low to moderate** until **Console declaration + Data safety + store listing** are proven aligned with the **current** APK (`withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS`). **Code-side** HC scope is **narrower** than the types Google flagged in the **first** rejection and **does not include** the calorie/step/RHR/HRV cluster in the **second** rejection — **directionally favorable (code truth)**. **Remaining risk** is **reviewer perception**: HR + overnight vitals (SpO2, RR, temperature) were **explicitly challenged** in the **first** letter; the **second** letter **does not** repeat those types — **Open** whether that means they were justified in-app/listing or the message was incomplete.

**Pointless?** **No** — the project is **not** in the same “over-broad HC” posture as the **first** rejection excerpt, **if** the shipped APK matches the manifest and the **story** is coherent.

**Likely to fail again?** **Yes**, if: (1) Play forms still describe **steps/calories/RHR/HRV** reads; (2) `HEALTH_API_COVERAGE.md` or listing **over-claims** vs code; (3) **ACTIVITY_RECOGNITION** cannot be tied to a visible feature; (4) HR-driven notifications are **not** explained in listing / Health declaration.

---

## Currently defensible (code + UX alignment)

| Area | Evidence | Strength |
|------|----------|----------|
| **Narrow HC manifest** (sleep, HR, SpO2, RR, body temp only) | `app/plugins/withHealthConnectPermissions.js` | **Strong** vs second-rejection type list (those types **not** in manifest) |
| **Runtime request matches default bundle** | `HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts`; `connectHealthConnect` uses it in `integrations.ts` | **Strong** |
| **Sleep + overnight vitals surfaced** | SpO2, RR, skin/body temperature on `SleepScreen.tsx`; metadata from HC merge path in `healthConnectService.ts` | **Strong** for **read types** tied to sleep UI |
| **HR for mindfulness spike path (Android)** | `notificationTriggers.ts` + `MindfulnessScreen.tsx` (`useHealthTriggers`) | **Medium–strong** **if** declaration/listing describes optional HR-based nudges |
| **Health Connect rationale activity** | `withHealthConnectRationaleIntent.js` (policy-required hooks) | **Strong** (technical compliance helper) |
| **Medical disclaimer strings** | `storeCompliance.ts` + `HealthDisclaimerModal.tsx` | **Medium** (copy exists; **Open:** listing parity, legal sign-off **OQ-7**) |
| **Android resting HR not requested** | `fetchHeartRateContextSummary.ts` documents intentional empty Android path | **Strong** policy choice vs second-rejection RHR/HRV |

---

## Weakly justified or fragile

| Area | Issue | Evidence |
|------|--------|----------|
| **`ACTIVITY_RECOGNITION`** | Declared in `app.config.ts`; **no** HC `READ_STEPS` in plugin | **Inference:** reviewer may ask what sensor feature uses this |
| **HR spike without Android resting context** | `fetchHeartRateContextSummary` returns `[]` on Android; gate uses `liveSamplesMisalignedWithRestingContext: true` | `notificationTriggers.ts` | **Medium** — works by design but **harder** to explain as “personalized recovery” |
| **Training “Active calories (Health Connect…)”** | UI in `TrainingHistoryView.tsx`; merge in `healthConnectService.ts` uses `active_energy` **permission** | **`active_energy` not** in `HEALTH_CONNECT_DEFAULT_METRICS` or manifest | **Weak** — path is mostly **dead** for Play build; label is **misleading** if any non-HC value ever appears |
| **Integrations subtitle** | “Sync via Android Health Connect” | Does not enumerate vitals | **Medium** — acceptable if Console declaration is precise |
| **Telemetry `user_id` on `app_logs`** | `telemetry.ts` | **Medium** — needs Data safety honesty + `logSanitizer` coverage **Inference** not fully proven on all call sites |
| **Internal `HEALTH_API_COVERAGE.md`** | Document **conflicts** with manifest (per `reclaim_policy_audit.md`) | **Weak** for **process** — risks wrong Console fill |

---

## Code ↔ UX ↔ Play story mismatches

| Mismatch | Code | UX / docs | Play risk |
|----------|------|-----------|-----------|
| **Steps / calories / RHR / HRV** | **Not** in HC manifest or default metrics | `HEALTH_API_COVERAGE.md` still suggests broader HC (**conflict**) | **High** if Console not updated |
| **Active calories merge** | Code supports HC active energy **if** granted | Not granted in default connect | **Medium** — stale UX string |
| **ACTIVITY_RECOGNITION** | Present | No HC step read | **Medium** |
| **iOS vs Android insights** | Resting HR insights iOS-only | **Inference:** rules/copy may imply parity | **Medium** perception |

---

## Trust / privacy concerns (summary)

- **Remote logging** with optional `user_id` → must match Data safety and privacy policy URL (**OQ-4**).
- **Play Integrity** → backend deployment **Open** (**OQ-5**).
- **Calendar** reads for nudges → local-first narrative; verify no unexpected upload (**Inference** — not deep-audited here).
- **Evidence / medical-adjacent** screens → **OQ-7**.

Detail: `reclaim_trust_risk_notes.md`.

---

## Must-fix before resubmission (submission credibility)

1. **Prove** Play Console **Health Connect declaration** and **Data safety** match **`withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS`** (and **do not** list rejected types unless truly requested). **Open:** **OQ-1**.
2. **Reconcile or quarantine** `app/Documentation/HEALTH_API_COVERAGE.md` vs code so **no** internal or external actor copies stale rows into Console.
3. **Store listing** copy: explicitly tie **each** remaining HC type to a **visible** feature (sleep detail, optional HR-based mindfulness nudge, etc.).
4. **ACTIVITY_RECOGNITION:** either justify with a **real** user-visible step/activity feature or remove permission (**product/code decision** — documented here as audit finding only).
5. **Training HC calories** line: **tighten or remove** unless `active_energy` is intentionally in scope for Play (**currently not requested**).

---

## Should-fix (approval odds + trust)

1. Align any **dashboard/insights** copy with Android resting-HR **limitation**.
2. Close **Phase 7 Tier 1** trust items if still present (reviewer “vibe”).
3. Verify **privacy policy URL** live and matches `EXPO_PUBLIC_PRIVACY_POLICY_URL` / `storeCompliance.ts` (**OQ-4**).
4. Confirm **EAS production** binary matches `versionCode` **8** story and prior rejection **7** is understood (**OQ-2**, **OQ-3**).

---

## Defer / remove recommendations

| Item | Recommendation | Rationale |
|------|----------------|-----------|
| **HC active energy for training** | **Remove** from user-visible copy **or** **defer** until Play story accepts calories | Second rejection flagged calories; manifest intentionally omits |
| **Broad HC “historical analytics”** | **Defer** | Cursor export intent superseded by policy (`reclaim_discussion_recon.md`) |
| **Listing claims on steps/HRV/RHR** from HC | **Remove** unless code requests | Matches second-rejection list |

---

## Audit questions — answers (concise)

1. **Strongly defensible:** `READ_SLEEP` (+ stages), overnight **SpO2/RR/temp** when shown on Sleep; **narrow** manifest vs second letter; rationale plugins; explicit non-request of RHR/HRV on Android HC.
2. **Weakly justified:** `ACTIVITY_RECOGNITION`; HR spike without resting context narrative; training HC calorie label; any reliance on stale coverage doc.
3. **Story mismatches:** `HEALTH_API_COVERAGE.md` vs code; optional training calories vs no `active_energy` grant.
4. **Play text → present risk:** First letter maps to **HR/SpO2/RR/temp** if reviewer still believes features don’t justify them; second letter maps to **calories/steps/RHR/HRV** — **mitigated in manifest** but **not** in **unknown** Console state.
5. **Must be true:** Console + listing aligned; no stale docs; coherent ACTIVITY_RECOGNITION story.
6. **Cut/defer:** HC calorie UX string unless scope expands with policy strategy; over-broad listing claims.
7. **Trust:** telemetry + user_id; background sync disclosure; medical wording (**see** trust notes).

---

*Next update: after Console export/screenshots land in `docs/memory/raw/` or **OQ-1** closed with evidence.*
