# Reclaim — prelaunch risk control notes

**Audience:** Engineers implementing `reclaim_prelaunch_execution_plan.md`. **Purpose:** reduce regressions; scope **what not to touch**.

---

## 1. Regression risks by cluster

### A. `HEALTH_API_COVERAGE.md` (M2)

| Risk | Mitigation |
|------|------------|
| Team **still** uses old mental model | Add **bold** banner at top; link to `withHealthConnectPermissions.js` |
| **Accidental** manifest expansion | **Do not** change plugin **for doc-only** task; doc must follow **code** |

---

### B. Training history / M4 + T1-06

| Risk | Mitigation |
|------|------------|
| **Double-edit** on `TrainingHistoryView.tsx` | Single PR: M4 copy + T1-06 filter; **review** together |
| **Hiding** real sessions | T1-06 filter: **unit-test** or **manual** edge cases — `exercisesCompleted === 0 && totalSets === 0`, `durationMins` null/ huge |
| **Removing** calories **entirely** | Product may want **manual** or **merged** calories — **neutral** label without HC |

---

### C. Dashboard / M6 / S3

| Risk | Mitigation |
|------|------------|
| **Breaking** `useInsightForScreen` / queries | **Do not** change `InsightsProvider` contract; **layout** only |
| **Recovery** users **lose** journey prominence | **Product** sign-off; **A/B** not required — **document** decision |
| **Scroll** position / **PremiumStarfield** perf | Test on **low-end** Android |

---

### D. Onboarding copy (M7 / S4)

| Risk | Mitigation |
|------|------------|
| **Over-softening** destroys differentiation | Keep **one** strong claim; align Home to **support** it |
| **Legal** review of crisis / medical strings | **Do not** change `insights.json` crisis lines without review |

---

### E. Phase 7 Tier 1 (M9)

| Risk | Mitigation |
|------|------------|
| **Line number drift** vs `PHASE_7_UI_AUDIT_BACKLOG.md` | **Re-grep** before each edit |
| **TrainingSessionView** footer (T1-08) breaks **watch** flow | **Manual** test training session + notifications |
| **Meditation** remove Spotify **breaks** import | **Grep** `SpotifyPlaceholderCard` references |

---

### F. `ACTIVITY_RECOGNITION` (M10)

| Risk | Mitigation |
|------|------------|
| **Removing** permission **breaks** hidden feature | **Grep** `ActivityRecognition` / step counters in `app/src` |
| **Keeping** without listing justification | Update **listing** + Play **permissions** declaration |

---

### G. Telemetry / Data safety (M8)

| Risk | Mitigation |
|------|------------|
| **Over-declaring** | Match **actual** `app_logs` + Sentry |
| **Changing** `user_id` to null | **Breaks** support analytics — **do not** change without product |

---

### H. S1 post-sync helper

| Risk | Mitigation |
|------|------------|
| **Double** `refreshInsight` (startup + session + manual) | **Debounce** already in `InsightsProvider` **inference** — verify before adding calls |
| **Extra** network on every navigation | **Narrow** triggers to **after** successful sync only |

---

### I. `insights.json` (S6)

| Risk | Mitigation |
|------|------------|
| **Breaking** rule IDs | **Do not** rename IDs; only **conditions** / **message** |
| **iOS** regression | **Platform** guard in rule **if** needed |

---

## 2. What to test after each change cluster

| After cluster | Test focus |
|-----------------|------------|
| **M2** | N/A user-facing — **peer** review doc |
| **M4 + T1-06** | Training → History → weekly row; **no** ghost sessions; **no** false HC promise |
| **M6–M7 + S3–S4** | Onboarding → first Home load; **5s** hero recognition; **two** CTAs not contradictory |
| **M9 Tier 1** | **Each** screen: Sleep (no roadmap), Meditation (no Spotify/no dev text), About (no Sentry prod), Meds (no test), Mindfulness (labels), Training session footer |
| **M10** | Fresh install: permissions **dialog**; **feature** still works if permission removed |
| **M8** | **Data safety** questionnaire **spot-check** vs `telemetry.ts` |
| **S1** (if implemented) | Integrations connect → Home insight; Sleep onboarding step; **cold** start |
| **S6** | Android **without** steps: open Home; rules **no** crash; copy **ok** |

---

## 3. What **not** to touch (prelaunch)

| Area | Reason |
|------|--------|
| **`InsightEngine`** core algorithm | **Not** required for launch; **risk** regression |
| **`NotificationScheduler.ts`** large refactor | **reconcile** idempotency — **defer** `firedAt` etc. |
| **`lib/sync.ts`** full split | **Post-launch** |
| **`fetchInsightContext` / merge with RQ** | **Post-launch** |
| **Garmin/Huawei** OAuth **implementation** | **DEFER** |
| **`InsightsProvider`** scope expansion | **Violates** formalization |
| **Rename** `InsightContext` type | **Breaking** — **defer** |
| **Remove** `recovery.ts` **APIs** | **May** break future wiring — **copy-first** |

---

## 4. Rollback hints

| Change | Rollback |
|--------|----------|
| **`HEALTH_API_COVERAGE.md`** | Git revert single file |
| **Training copy** | Revert `TrainingHistoryView.tsx` |
| **Tier 1** | Revert per-file; **prefer** small commits per T1-ID |
| **Dashboard layout** | Feature flag **inference** — **not** unless already in codebase |

---

*Pair with `reclaim_prelaunch_execution_plan.md`.*
