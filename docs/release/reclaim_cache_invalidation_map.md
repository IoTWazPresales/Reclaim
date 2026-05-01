# Reclaim — cache invalidation & insight refresh map (Phase E / S2)

**Purpose:** Single place to see **React Query** keys cleared after sync and **when** `InsightsProvider.refresh(reason)` runs. Update when `backgroundSync.ts`, `Dashboard.tsx`, or coordinator flows change.

**Rules:** Background sync does **not** call `refreshInsight`; screens and Dashboard do. After health connect/import, prefer **invalidate sleep-related keys + `refreshInsight`** together so Home/Sleep insights are not stale.

---

## 1. Background health task (`app/src/lib/backgroundSync.ts`)

Runs after `runOncePush` / `runOncePull` succeed, then `reconcileNotifications()`, then:

| Query key prefix | Notes |
|------------------|--------|
| `dashboard:lastSleep` | Home sleep tile |
| `sleep:last` | Latest sleep row |
| `sleep:sessions:30d` | Sleep history window |
| `sleep:sessions:ring` | Ring / chart data |
| `meds` | Medication list |
| `meds:logs:7d` | Adherence window |
| `mood:checkins:7d` | Mood series |
| `mood:daily:supabase` | Aggregated mood |
| `mood:local` | Local mood cache |
| `training:sessions` | Session list |
| `training:sessions:analytics` | Training analytics |

**Insights:** not refreshed here; next foreground or explicit screen refresh rebuilds context.

---

## 2. Dashboard (`app/src/screens/Dashboard.tsx`)

| Event | Invalidation / action |
|-------|------------------------|
| `runHealthSync` success (default) | `dashboard:lastSleep`, `sleep:last`, `sleep:sessions:30d`, `sleep:sessions:ring`, `sleep:settings` + `refreshInsight('health-sync')` |
| Pull-to-refresh / manual refresh | Broad invalidation (meds, calendar, training keys — see file ~1167+) + `refreshInsight('dashboard-refresh-gesture')` |
| After mood log | Mood keys, streaks + `refreshInsight('dashboard-mood-log')` |
| Primary action completion | `refreshInsight('dashboard-action')` |
| Manual insight retry | `refreshInsight('dashboard-manual')` |

---

## 3. Integrations (`app/src/screens/IntegrationsScreen.tsx`)

After connect or import: `requestHealthSync` + `refreshInsights('integrations-connect' \| 'integrations-import')` (see file).

---

## 4. Sleep (`app/src/screens/SleepScreen.tsx`)

Multiple paths call `refreshInsight('sleep-*')` after sync or retry (connect, import, manual). Cross-check with SleepScreen when adding new sync entry points.

---

## 5. Onboarding sleep step (`app/src/screens/onboarding/SleepStepScreen.tsx`)

After successful connect + `requestHealthSync` + sleep query invalidation: `refreshInsights('onboarding-sleep-connect')` so post-onboarding Home has current insight context.

---

## 6. Other explicit `refreshInsight` call sites (non-exhaustive)

| Screen | Typical reasons |
|--------|-----------------|
| `MedsScreen.tsx` | `meds-retry`, `meds-manual`, `meds-action` |
| `MoodScreen.tsx` | `mood-action`, `mood-manual`, `mood-log-success` |
| `FinishScreen.tsx` (onboarding) | `finish_retry` |

Grep: `refreshInsight\(` and `refreshInsights\(` for the full list.

---

**When to update this file:** Any new health sync exit point that should refresh insights; any new `queryKey` used for sleep/mood/training dashboard truth.
