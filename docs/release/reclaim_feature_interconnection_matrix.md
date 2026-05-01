# Reclaim — feature interconnection matrix

**Legend — strength:** **Strong** = shared data path or explicit coupling in code; **Medium** = partial or one-way; **Weak** = conceptual or fragile; **None** = isolated.

Domains: **sleep, recovery, mood, training, mindfulness, routines, meds, calendar, notifications, insights.**

---

## Pairwise / relationship summary

| Domain A | Domain B | Intended relationship (memory + product) | Current evidence | Strength | Notes | Launch importance |
|----------|----------|--------------------------------------------|------------------|----------|-------|-------------------|
| **Insights** | **Sleep** | Rules use sleep hours, midpoint, quality | `buildSleepInsightContext`, `contextBuilder` | **Strong** | Core to `InsightContext` | **High** |
| **Insights** | **Mood** | Rules use mood trends, tags | `moodContext` in `contextBuilder` | **Strong** | | **High** |
| **Insights** | **Training** | Cross-rules training+mood+sleep | `buildTrainingInsightContext`, `insights.json` | **Strong** | | **High** |
| **Insights** | **Meds** | Adherence in context | `medsContext` | **Medium** | | **High** |
| **Insights** | **Steps / activity** | Baseline + rules | `listDailyActivitySummaries`, `stepsContext` | **Weak** | Android may lack steps **Inference** | **Medium** |
| **Insights** | **Vitals (RHR)** | Trend labels | `fetchHeartRateContextSummary` | **Weak** on Android | Empty array Android | **Medium** |
| **Insights** | **Calendar** | Busy blocks, etc. | `buildCalendarInsightContext` | **Medium** | | **Medium** |
| **Recovery** | **Sleep** | Stage steps, rhythm | `recoveryCardMeta.ts`, sleep sessions | **Strong** | | **High** |
| **Recovery** | **Mood** | Streaks, blocker lines | `computeRecoveryBlockerLine`, stabilize steps | **Strong** | | **High** |
| **Recovery** | **Meds** | Foundation streak | `recoveryCardMeta` foundation | **Strong** | | **High** |
| **Recovery** | **Insights** | **Both** on dashboard | **No** shared engine | **Weak** | Parallel narratives | **High** identity gap |
| **Recovery** | **Training** | Journey “optimize” mentions habits | **Not** in foundation/stabilize steps | **Weak** | Stage `focus` in `recovery.ts` omits training | **Medium** |
| **Dashboard** | **Insights** | Shows `DashboardInsight`, refresh | `Dashboard.tsx` | **Strong** | | **High** |
| **Dashboard** | **Recovery** | `DashboardRecovery` | `Dashboard.tsx` | **Strong** | | **High** |
| **Dashboard** | **Routines** | Tiles, overlay, remote suggestions | `Dashboard.tsx`, `lib/routines` | **Medium** | Third planning layer | **Medium** |
| **Sync** | **Insights** | Post-sync refresh | `requestHealthSync` + `refreshInsight` | **Strong** | | **High** |
| **Notifications** | **Insights** | Daily signal = top insight | `scheduleDailySignalNotification` | **Strong** | | **High** |
| **Notifications** | **Mindfulness** | HR/calendar → mindfulness | `notificationTriggers.ts` | **Medium** | | **Medium** |
| **Notifications** | **Training** | Separate training scheduler | `trainingNotificationScheduler` / `useNotifications` | **Medium** | **Inference:** parallel to insight engine | **Medium** |
| **Mindfulness** | **Insights** | **Inference:** meditation may affect mood series | Indirect via DB | **Weak** | Not proven in same refresh path | **Low–Medium** |
| **Meds** | **Insights** | Adherence | `contextBuilder` | **Medium** | | **High** |
| **Calendar** | **Insights** | `calendar` slice | `buildCalendarInsightContext` | **Medium** | | **Medium** |
| **Calendar** | **Notifications** | Wellness nudges | `wellnessCalendarContextNudges.ts` | **Medium** | Android | **Medium** |

---

## Hub diagram (text)

```
                    ┌─────────────────────┐
                    │   fetchInsightContext │
                    │  (contextBuilder.ts)  │
                    └──────────┬────────────┘
         mood/sleep/steps/meds/training/vitals/calendar
                    ┌──────────▼────────────┐
                    │ InsightEngine + JSON │
                    └──────────┬────────────┘
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
   DashboardInsight    scheduleDailySignal     InsightCard screens
```

**Parallel (not merged into engine):** `getRecoveryProgress` → `DashboardRecovery` → `recoveryCardMeta.ts`.

---

*Companion: `reclaim_system_coherence_audit.md`.*
