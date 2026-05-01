# Reclaim — code-first discovery vs prior audits

**Method:** Phase 1 built `reclaim_code_first_architecture_discovery.md` and related maps **from grep/file reads of `app/`** only. Phase 2 compares this **code-derived** picture to:

- `docs/release/reclaim_architecture_authority_audit.md`
- `docs/release/reclaim_authority_graph.md`
- `docs/release/reclaim_shared_state_map.md`
- `docs/release/reclaim_orchestration_overlap_matrix.md`
- `docs/release/reclaim_existing_orchestrator_candidates.md`
- `docs/release/reclaim_launch_critical_architecture_decisions.md`
- `docs/memory/derived/reclaim_architecture_recon.md`

---

## Prior claims **confirmed** by code

| Prior claim | Code evidence |
|-------------|---------------|
| **`fetchInsightContext`** is the single assembly for **insights** domain | `contextBuilder.ts`; **only** `InsightsProvider.refresh()` calls it (grep `fetchInsightContext` in `app/`) |
| **`InsightsProvider`** owns engine + refresh + debounced `session-ready` | `InsightsProvider.tsx` |
| **`SyncCoordinator`** → `syncHealthData` → **`reconcileNotifications`** post-success | `SyncCoordinator.ts` |
| **`reconcileNotifications`** is a **central sink** with many producers | Grep `reconcileNotifications` across `app/` |
| **`Dashboard.tsx`** is a heavy foreground **script** (invalidate + sync + `refreshInsight`) | `Dashboard.tsx` |
| **`NotificationIntentStore`** backs intents for scheduler | Imports from scheduler + triggers |
| **`backgroundSync`** runs sync + reconcile + **some** query invalidation | `backgroundSync.ts` |
| **Dual “prioritizers”** — **InsightEngine** vs **recovery card** (`recoveryCardMeta`) | Both exist; **no** `InsightEngine` in recovery card |
| **No single global “global brain” module** in code | No `AppWellbeingSnapshot` or equivalent |
| **Overlap matrix** — reconcile idempotency as intentional pattern | **Inference** (product); code shows many **call sites** |

---

## Prior claims **expanded** by new code findings

| Finding | Evidence |
|---------|----------|
| **`fetchInsightContext` has zero callers** outside `InsightsProvider` | Grep: no other call sites — **tighter** than “shared state” language might imply |
| **Daily / weekly / mood trend schedulers** are **Dashboard-only** imports | Grep `scheduleDailySignalNotification` / `scheduleWeeklyNarrativeNotification` / `scheduleMoodTrendAlerts` |
| **`RootNavigator`** triggers **`requestHealthSync`** with **`HEALTH_SYNC_REASON.STARTUP_GATE`** after onboarding | `RootNavigator.tsx` |
| **`AppShell`** persists **routine intent** from notification tap (`@reclaim/routine_intent`) | `App.tsx` `AppShell` `useEffect` |
| **`SyncCoordinator` does not** call **`refreshInsight`** | **No** matches in `SyncCoordinator.ts` |
| **`backgroundSync`** does **not** refresh insights on success | **No** `refreshInsight` in `backgroundSync.ts` (grep) |
| **Recovery progression APIs** (`setRecoveryStage`, `markStageCompleted`) exist **only** as definitions | Grep: **only** `recovery.ts` |

---

## Prior claims **weakened / downgraded** by code

| Prior / implied claim | Code reality |
|------------------------|--------------|
| `reclaim_launch_critical_architecture_decisions.md`: **“Recovery stage advancement rules — authority in `recovery.ts`”** | **`setRecoveryStage` / `markStageCompleted`** have **no** call sites outside `recovery.ts` — **automated stage progression via these APIs is not wired** in the traced codebase. **Downgrade:** authority is **storage + exports**; **advancement** may be **elsewhere** (e.g. inline writes, or **not** implemented). **Open:** manual trace of `getRecoveryProgress` consumers and any **direct** `AsyncStorage` writes. |
| **`lib/recovery.ts`** as **primary** “journey” **progression** | **Reset** path (`resetRecoveryProgress`) is used from **`SettingsScreen.tsx`**; **`getRecoveryProgress`** from **`Dashboard.tsx`** / **`SettingsScreen.tsx`**. **Stage mutation** (`setRecoveryStage` / `markStageCompleted`) **unused** outside definitions — **weaker** “journey engine” for **advancement** until callers exist. |
| **`docs/memory/derived/reclaim_architecture_recon.md`** — **`App.tsx`** order “`AuthProvider`, `InsightsProvider`, … `useNotifications`” | **Actual:** `QueryClientProvider` → `AppShell` → `useNotifications()` inside **`AppShell`**, then **`PaperProvider` → `AuthProvider` → `InsightsProvider`**. Prior recon **flattened** order; **not** wrong on **presence** of providers. |
| **“Refresh everything”** after sync is **uniform** | **Foreground** Dashboard sequences sync + invalidate + insight; **background** path **reconciles + invalidates subset**; **SyncCoordinator** does **not** refresh insights — **asymmetric** by design. |

---

## **New** findings **not** clearly stated in prior release docs

1. **Exclusive caller** of `fetchInsightContext` — **only** `InsightsProvider`.
2. **`setRecoveryStage` / `markStageCompleted`** — **no** external usage (possible **dead API**).
3. **`scheduleDailySignalNotification` (and related)** — **only** `Dashboard.tsx`.
4. **Post-sync insight refresh** is **not** in `SyncCoordinator` or `backgroundSync` — callers must **explicitly** `refreshInsight`.
5. **`AppShell`** — routine **intent** from notifications written to **`AsyncStorage`** (`@reclaim/routine_intent`).
6. **`useNotifications`** hook runs in **`AppShell`** **above** `InsightsProvider` in the tree (not nested under insights).
7. **`TaskManager.defineTask`** for training — in **`useNotifications.ts`** (grep `TRAINING_NOTIFICATION_ACTION_TASK`).
8. **Overlap** between **Dashboard** and **backgroundSync** on **invalidation keys** — **partial** duplication (both touch cache after sync).
9. **Recovery card** derives from **`recoveryCardMeta`** + queries — **parallel** to insights, **confirmed** in code paths.
10. **`FinishScreen`** calls **`insightsCtx.refresh('finish_retry')`** — explicit bridge to insights pipeline after onboarding.
11. **`useInsightForScreen`** used on **`Dashboard`**, **`SleepScreen`**, **`MoodScreen`**, **`MedsScreen`** only (grep).
12. **`MoodScreen`** uses **`forceRescheduleNotifications`** in addition to reconcile — second notification policy path.
13. **`IntegrationsScreen`**, **`SleepScreen`**, **`SleepStepScreen`** call **`requestHealthSync`** — **non-Dashboard** sync entry points that must **own** their own **`refreshInsight`** if insights must stay fresh (see launch decisions doc).
14. **`guidedTrainingNotificationActions`** + **`useNotifications`** tie **notification response** to **reconcile** / **invalidateQueries** — app-level **tap orchestration**.
15. **`notificationTriggers`** (HR spike, etc.) → **`setIntent`** → **`reconcileNotifications`** — **health samples** do **not** flow through **`InsightContext`** on that path (**direct evidence** for trigger file imports).

---

## Still-open architecture questions (need manual trace / product)

| Question | Why open |
|----------|----------|
| **How** does recovery **stage** change if **not** via `setRecoveryStage`? | **No** grep hits to those functions |
| **Full** `useNotifications` branch coverage | Large file; **partial** read in discovery pass |
| **Exact** invalidation parity **Dashboard** vs **backgroundSync** | Key lists need **diff** |
| **Calendar nudges** → **insight** pipeline? | Triggers **notification** path; **not** merged into `InsightContext` **Inference** |
| **Training completion** → recovery | **No** direct link found in grep pass |

---

## Verdict: were prior audits **directionally** right?

**Yes** on: **sync → reconcile**, **insights pipeline** as **domain-specific** brain, **Dashboard** as **foreground glue**, **fragmented** invalidation, **two** “what matters” layers (insight + recovery card).

**Adjust** on: **recovery** — treat **stage advancement** as **unverified in code** until callers are found; **insight refresh** after sync is **not** automatic from coordinator/background.

---

## Should the next decision pass use **this** map?

**Yes.** Prior docs were **aligned** with code on **major** modules; **code-first** discovery adds **caller exclusivity** (`fetchInsightContext`), **absence** of recovery mutations, and **explicit** split between **sync/reconcile** and **insight refresh**. **Base** launch architecture decisions on **this** map plus **product** answers for open questions — **not** on doc-only audits alone.

---

*Companion: `reclaim_code_first_architecture_discovery.md`, `reclaim_runtime_authority_map.md`, `reclaim_cross_module_call_paths.md`, `reclaim_orchestration_candidates_from_code.md`.*
