# Reclaim — shared state map

## What shared context exists

| Artifact | Contents | Built where |
|----------|----------|-------------|
| **`InsightContext`** | mood, sleep, steps, meds, training, baseline, vitals?, calendar?, flags | `fetchInsightContext` in `contextBuilder.ts` |
| **`InsightContextSourceData`** | Raw rows for debugging / feedback | Same function return |
| **Recovery progress** | `currentStageId`, week, completed stages | `lib/recovery.ts` |
| **Notification intents** | logicalKey → payload | `NotificationIntentStore` |
| **React Query caches** | Per-domain keys (`mood:checkins:7d`, `sleep:sessions:30d`, `training:sessions`, …) | Populated by screens/hooks |
| **Integration prefs** | `integrationStore` | Connection state |

---

## Where it is built

| Builder | Output |
|---------|--------|
| `fetchInsightContext` | `InsightContext` + `source` |
| `moodContext`, `stepsContext`, `medsContext`, `baselineContext` | Slices inside `contextBuilder.ts` |
| `buildSleepInsightContext`, `buildTrainingInsightContext`, `buildCalendarInsightContext` | Slices |
| `fetchHeartRateContextSummary` | Vitals slice input |

---

## Who consumes it

| Consumer | Reads |
|----------|-------|
| **`InsightsProvider`** | Full `fetchInsightContext` on refresh |
| **`useInsightForScreen` / `InsightCard`** | Filtered matches |
| **Screens** | **Not** `InsightContext` directly — **Inference** most use queries + props |

**Recovery** does **not** consume `InsightContext` — **parallel** assembly on `Dashboard` from **same** underlying queries **Inference**.

---

## Duplicated computation

| Duplication | Evidence | Severity |
|-------------|----------|----------|
| **Mood/sleep metrics** | Insight context + recovery card both derive from **queries** on `Dashboard` | **Medium** — same APIs, **two** derivations |
| **Baseline** | `baselineContext` in insights vs recovery **streak** logic | **Low–Medium** |
| **“Refresh everything”** | `Dashboard` invalidates many keys + `refreshInsight` + `runHealthSync` — **orchestration** repeated **Inference** | **Medium** |

---

## Fragmented or missing state

| Gap | Note |
|-----|------|
| **No unified “AppWellbeingSnapshot”** | **Inference** — would merge recovery + top insight + routine — **does not exist** |
| **Notification state vs insight state** | Intents + scheduled IDs — **not** merged into `InsightContext` |
| **Training session** | **Not** in `InsightContext` as live stream — **only** session summaries from API |

---

*See `reclaim_shared_state_and_interpretation_gaps.md` (prior doc).*
