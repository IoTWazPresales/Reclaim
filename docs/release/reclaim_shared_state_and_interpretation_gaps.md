# Reclaim — shared state & interpretation gaps

**Focus:** Where **STATE → MEANING → ACTION** (discussion principle) **breaks** because systems **don’t share enough** or **don’t hand off**.

---

## Shared state — what exists

| State | Location | Consumers |
|-------|----------|-----------|
| **InsightContext** | Built in `fetchInsightContext` | `InsightsProvider`, `InsightEngine`, per-screen `useInsightForScreen` |
| **React Query caches** | `listMoodCheckins`, `listSleepSessions`, etc. | Dashboard, screens, **invalidated** on sync **Inference** |
| **Recovery progress** | AsyncStorage via `lib/recovery.ts` | `DashboardRecovery`, `SettingsScreen` |
| **Integration prefs** | `integrationStore` | Sleep dedup, sync |
| **Notification intents** | `NotificationIntentStore` | Schedulers, `reconcileNotifications` |

**Gap:** **No** single **store** unifies “recovery stage” with “top insight id” — **two** progress concepts.

---

## Shared reasoning — what exists

| Mechanism | Role |
|------------|------|
| **InsightEngine** | Evaluates `insights.json` against `InsightContext` |
| **recoveryCardMeta** | Computes blocker line + steps from **local** metrics **not** imported from `InsightContext` object — **recomputed** on `Dashboard` from **same API queries** **Inference** |

**Gap:** **Duplicate reasoning** — recovery blockers and insight rules **both** read mood/sleep/meds from **parallel** `useQuery`/`useMemo` paths on `Dashboard.tsx` instead of **one** derived “wellbeing state” object.

---

## Missing feature handoffs

| From | To | Gap |
|------|-----|-----|
| **Top insight action** | **Recovery CTA** | No automatic alignment — user may complete insight action while recovery still shows incomplete step **Inference** |
| **Training session end** | **Guaranteed insight refresh** | **Open** — depends on query invalidation / navigation |
| **Mindfulness session** | **Mood / insight update** | **Inference** — if user doesn’t log mood, **loop** may be incomplete |
| **Health spike notification** | **Insight history** | Telemetry `health_trigger_notification_scheduled` — **not** same as insight rule fire |

---

## Missing feedback loops

| Loop | Status |
|------|--------|
| **Log data → sync → insight refresh** | **Present** on Dashboard |
| **Insight feedback → rule suppression** | `feedback` in `fetchInsightContext` — **present** (`listLatestInsightFeedback`) |
| **Recovery stage advance → insight copy** | **Weak** — stage changes **not** obviously reflected in insight **message** set **Inference** |
| **Notification tap → completed action → insight** | **Partial** — depends on screen |

---

## Where STATE → MEANING → ACTION breaks

1. **State thin** — Android **vitals** / **steps** may be missing → **meaning** rules skip or misfire → **action** from engine **less** personalized.
2. **Meaning split** — **Insight** “meaning” vs **Recovery** “meaning” can **diverge** (two rankers).
3. **Action overload** — multiple CTAs (insight, recovery, routine, tiles) → user may not perceive **one** coherent **action**.

---

## Open questions

- Should **recovery progression** **gate** or **weight** which insight surfaces? **Currently:** **no** code link found in this audit.
- Should **training** advance **recovery** stage? **Currently:** **not** in `recovery.ts` mechanics.

---

*See `reclaim_system_coherence_audit.md`.*
