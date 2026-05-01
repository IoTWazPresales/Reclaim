# Reclaim — system coherence audit

**Question:** Does Reclaim behave like **one connected recovery intelligence** or **loosely coupled wellness modules**?

**Scope:** Evidence from canonical memory, prior vision docs, and **code paths** that join domains. **Not** launch scope; **not** Play compliance detail.

---

## Core integrated-product thesis (evidence-backed)

1. **Unified interpretation layer** — `fetchInsightContext()` in `contextBuilder.ts` loads **mood, sleep, activity, meds, training sessions, resting HR summary, calendar** in parallel and builds a single `InsightContext` consumed by `InsightsProvider` + `InsightEngine` (`insights.json`). This is the closest thing to a **single product brain** in code.

2. **Cross-domain rules** — `insights.json` includes explicit **training × mood × sleep** rules (e.g. `training-mood-lift-today`, `training-movement-resets`, `training-sleep-deload`, `training-high-volume-fatigue`) — **logical** interconnection in the **engine**.

3. **Recovery journey** — `lib/recovery.ts` defines stages; `recoveryCardMeta.ts` computes **steps** from **sleep settings, med logs, sleep sessions, mood streaks, rhythm** — **interconnects** mood/sleep/meds on the **home card**, but **not** via `InsightEngine`.

4. **Sync → insights** — `Dashboard.tsx` calls `requestHealthSync` then `refreshInsight('health-sync')`; mood logging triggers `refreshInsight('dashboard-mood-log')` — **feedbacks** data into the interpretation layer.

5. **Notifications → interpretation** — `scheduleDailySignalNotification` (`dailySignalNotification.ts`) schedules **next-day** notification from **top insight** content — pushes the **same** ranked insight engine output off-device.

6. **Health + calendar → nudges** — `notificationTriggers.ts` combines HR samples + `startWellnessCalendarContextNudges` — **Android** context-aware nudges.

---

## What is interconnected today (strong)

| Mechanism | Domains joined | Evidence |
|-------------|----------------|----------|
| **InsightContext pipeline** | Mood, sleep, steps, meds, training, vitals, calendar | `contextBuilder.ts` `fetchInsightContext` |
| **Rule engine** | Cross-domain conditions in JSON | `insights.json` + `InsightEngine.ts` |
| **Dashboard refresh loop** | Sync → insights; mood modal → insights | `Dashboard.tsx` (`refreshInsight`, `requestHealthSync`) |
| **Recovery card (foundation/stabilize)** | Sleep integration, meds streak, mood streak, sleep rhythm | `recoveryCardMeta.ts`, `DashboardRecovery` |
| **Daily signal notification** | Insights → scheduled push | `dailySignalNotification.ts`, invoked from `Dashboard.tsx` |
| **HR spike → mindfulness** | Health → notification → deep link | `notificationTriggers.ts` (`reclaim://mindfulness?...`) |

---

## Partially connected

| Area | Evidence | Gap |
|------|----------|-----|
| **Recovery journey vs insights** | Both on home; overlap mood/sleep/meds | **Different** state machines: `recovery.ts` AsyncStorage vs **InsightEngine** matches — **no shared “one score”** |
| **Training vs recovery stages** | Training in `InsightContext`; recovery **stage focus** lists do **not** mention training (`recovery.ts` `RECOVERY_STAGES`) | **Journey** under-emphasizes training vs onboarding/capabilities copy |
| **Mindfulness completion → insights** | **Inference:** session may feed mood/meditation data; **not** verified as explicit feedback into same refresh path in this audit | **Open** |
| **Routines / schedule overlay** | `Dashboard.tsx` routines + `fetchRoutineSuggestionsRemote` | **Parallel** structure to recovery + insights — **three** “planning” surfaces **Inference** |
| **Analytics tab** | Mood + meditation aggregates | **Read-only**; **not** feeding back into engine on screen **Inference** — same DB as source |

---

## Siloed or weakly wired

| Area | Evidence |
|------|----------|
| **Garmin / Huawei** | `integrations.ts` — setup walls; **no** data path into `fetchInsightContext` |
| **Samsung** | Partial import path (`sync.ts` / inventory) — **not** same as unified insight context depth **Inference** |
| **Evidence notes / Moments** | Separate screens — **engagement** depth, not core loop in `contextBuilder` |
| **iOS vs Android health triggers** | `notificationTriggers.ts` — Android-primary; **different** “peripheral brain” per OS |

---

## Where coherence is strong

- **Single `InsightContext`** for scientific rules.
- **Explicit cross-domain rules** in `insights.json` for training + mood + sleep.
- **Dashboard** ties sync and user actions to **insight refresh**.
- **Daily signal** extends the **same** top insight to notifications.

---

## Where it breaks down

1. **Two “brains” on home** — **Insight** (`InsightEngine`) vs **Recovery** (`recoveryCardMeta` / `recovery.ts`) — both interpret wellbeing; **not** unified ranking or single source of truth for “what matters next.”
2. **Training in rules but not in recovery journey** — capabilities promise training + recovery; **stabilize/foundation** steps are mood/sleep/meds-heavy.
3. **Steps baseline** — `contextBuilder` / `insights.json` use `steps.lastDay`; **Android HC** may not populate steps — **weak link** for activity-based rules.
4. **Vitals on Android** — resting HR trend empty → **InsightContext** `vitals` thin — **weak** cross-link for HR-adjacent rules vs iOS.
5. **Notification families** — training, meds, daily signal, weekly narrative, mood trend, health triggers — **multiple** schedulers; **coherence** depends on user perception, not one orchestrator **Inference**.

---

## Verdict: one connected system or a bundle?

**Hybrid.** The **interpretation engine** (context + rules + dashboard refresh + daily signal) **does** behave like a **connected intelligence** for domains that feed `fetchInsightContext`. The **recovery journey** and **routines** layers add **parallel** structure that **reuses** some signals but **does not** merge into the engine. **Peripheral** integrations (Garmin/Huawei) and **OS-split** health triggers add **modular** edges.

**One-line:** Reclaim is **meaningfully integrated at the insights layer**, but **not** fully unified as a **single** orchestrated “brain” across journey + routines + all notifications.

---

*See `reclaim_feature_interconnection_matrix.md`, `reclaim_orphaned_and_siloed_systems.md`, `reclaim_shared_state_and_interpretation_gaps.md`.*
