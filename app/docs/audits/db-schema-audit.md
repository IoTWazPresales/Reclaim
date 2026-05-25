# DB Schema Audit — Training State Layer
**Date:** 2026-05-25  
**Scope:** Supabase migrations, table schemas, React Query hooks, merge logic, file size

---

## 1. Supabase Migrations

**No local migration files exist.** The `supabase/` directory contains only:
- `supabase/.temp/` — CLI metadata (project-ref, postgres-version, etc.)
- `supabase/functions/verify-play-integrity/index.ts` — edge function

No `supabase/migrations/` directory. Schema is managed outside this repo (likely Supabase dashboard or a separate infra repo).

---

## 2. training_sessions — All Columns

Source: `TrainingSessionRow` at `src/lib/api.ts:1922-1932`

| Column | TypeScript Type | Nullable | Notes |
|---|---|---|---|
| `id` | `string` | NO | PK (UUID) |
| `user_id` | `string` | NO | FK to auth.users |
| `started_at` | `string \| null` | YES | ISO timestamp |
| `ended_at` | `string \| null` | YES | ISO; null = in-progress |
| `mode` | `'timed' \| 'manual'` | NO | Session mode |
| `goals` | `Record<string, number>` | NO | JSONB |
| `summary` | `Record<string, any> \| null` | YES | JSONB; written at session end |
| `decision_trace` | `Record<string, any> \| null` | YES | JSONB; contains `notificationMode` |
| `created_at` | `string` | NO | Server-generated |

**9 columns total.** No `status`, `current_exercise_index`, `elapsed_seconds`, or `phase` column.

---

## 3. training_session_items — All Columns

Source: `TrainingSessionItemRow` at `src/lib/api.ts:1934-1961`

| Column | TypeScript Type | Nullable | Notes |
|---|---|---|---|
| `id` | `string` | NO | PK (UUID) |
| `session_id` | `string` | NO | FK to training_sessions |
| `exercise_id` | `string` | NO | FK to exercise catalog |
| `order_index` | `number` | NO | Display/execution order |
| `planned` | JSONB object | NO | `{ sets: [{ setIndex, targetReps, suggestedWeight, restSeconds }], priority, intents, decisionTrace }` |
| `performed` | JSONB object \| null | YES | `{ sets: [{ setIndex, weight, reps, rpe?, completedAt }] }` |
| `skipped` | `boolean` | NO | |
| `created_at` | `string` | NO | Server-generated |

**8 columns total.** `performed` is the closest existing field to a set-level source of truth — it aggregates completed sets as a JSONB blob on the item row.

---

## 4. training_set_logs — All Columns

Source: `TrainingSetLogRow` at `src/lib/api.ts:1963-1972`

| Column | TypeScript Type | Nullable | Notes |
|---|---|---|---|
| `id` | `string` | NO | PK (deterministic: `${itemId}_set_${setIndex}_${timestamp}`) |
| `session_item_id` | `string` | NO | FK to training_session_items |
| `set_index` | `number` | NO | |
| `weight` | `number \| null` | YES | |
| `reps` | `number` | NO | |
| `rpe` | `number \| null` | YES | |
| `completed_at` | `string` | NO | ISO timestamp |
| `created_at` | `string` | NO | Server-generated |

**8 columns total.** No `exercise_id` column (must join through `training_session_items`). No `session_id` direct FK.

---

## 5. React Query Hook for Active Session

**Yes, it exists.** Located in `TrainingScreen.tsx:375-380`:

```typescript
const activeSessionQ = useQuery({
  queryKey: ['training:session', activeSessionId],
  queryFn: () => (activeSessionId ? getTrainingSession(activeSessionId) : null),
  enabled: !!activeSessionId,
  retry: false,
});
```

**What it queries:** Calls `getTrainingSession(id)` at `src/lib/api.ts:2129-2156`, which:
1. `SELECT *` from `training_sessions` WHERE `id` = id AND `user_id` = current user
2. `SELECT *` from `training_session_items` WHERE `session_id` = id, ORDER BY `order_index` ASC

**What it returns:** `{ session: TrainingSessionRow, items: TrainingSessionItemRow[] }`

**How it's consumed:** Passed as `sessionData` prop to `TrainingSessionView` at `TrainingScreen.tsx:1002-1004`:
```typescript
<TrainingSessionView
  sessionId={activeSessionId}
  sessionData={activeSessionQ.data}
  ...
/>
```

**No `staleTime` or `refetchInterval` configured** — defaults apply (staleTime: 0, no polling). Data is only refreshed via manual `queryClient.invalidateQueries()` calls after DB writes.

**Other query keys invalidated during session:**
- `training` (broad)
- `training:sessions`
- `training:sessions:analytics`
- `training:session:${sessionId}`
- `training:set_logs`

---

## 6. mergePerformedSetsIntoSessionItemFromDb

Source: `src/lib/training/trainingSetCompletionPersistence.ts:29-43`

**What it does:**
1. Reads current item from DB: `getTrainingSessionItemById(sessionItemId)`
2. Extracts `item.performed?.sets ?? []`
3. Merges with incoming sets via `mergePerformedSetSlices(existing, incoming)` — by `setIndex`, incoming wins
4. Writes back: `updateTrainingSessionItem(sessionItemId, { performed: { sets: merged } })`

**Target table:** `training_session_items`  
**Target column:** `performed` (JSONB)  
**Format written:** `{ sets: [{ setIndex, weight, reps, rpe?, completedAt }] }`

**Called from 2 sites:**
1. `handleGuidedTrainingNotificationAction` — after notification SET_DONE DB write
2. `replacePerformedSetsForSessionItem` — during exercise replacement

---

## 7. TrainingSessionView.tsx Line Count

**2,837 lines** as of this audit.

---

## Summary of Key Gaps

- No Supabase migrations in-repo — schema changes are not version-controlled here
- `training_sessions` has no cursor columns (`current_exercise_index`, `phase`, `status`, `elapsed_seconds`)
- `training_set_logs` has no direct `exercise_id` or `session_id` — requires join
- The active session React Query hook has no `staleTime` or polling — only refreshes on manual invalidation
- `performed` on `training_session_items` is the de facto set-level source of truth in the DB, but the active UI reads from `runtimeState` instead
