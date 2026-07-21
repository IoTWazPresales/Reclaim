# Guided training regression audit — 2026-07-21 (READ-ONLY)

**Sync pin:** `fix/training-confident-ux` @ `c1a7c39` (feature code @ `46d4d43` Wear + `59b5f77` signal)  
**Build under test:** EAS `faeae162-75ee-4680-92b5-c56c9b52d281` (assumed)  
**Mode:** audit only — **no fixes**  
**Verdict:** Human symptoms are largely CONFIRMED by architecture. Last night’s “Wear delivery” ship did **not** change the transport model; it papered over it. That is on Cursor (and the consult that greenlit sticky-as-delivery), not on the Human’s memory palace.

---

## Human symptoms (verbatim themes)

1. Everything only works when the phone is opened.
2. Randomly completes the first exercise when starting a session / during some sets.
3. “What tile?” for training-in-session — not seen / unclear.
4. Rest notification without app open only started working on the last ~2 exercises.
5. Signal graph is not a real converging multi-metric analysis surface.

---

## What we actually changed (`46d4d43`) — honesty first

| Change | Intent | What it really does |
|--------|--------|---------------------|
| Cursor into `scheduleGuidedTrainingAfterSetPersist` | Fix jump→wrong notif | Real correctness fix for *display after a Done that already ran* |
| Between-exercise rest options | Rest after last set of an exercise | Real parity fix **if** Done handler runs |
| `TRAINING_SESSION_ACTIVE` sticky intent | “Foreground delivery guarantee” | **Not a Foreground Service.** Expo `sticky: true` on a LOW channel. Does **not** reliably keep RN/TaskManager alive for Wear actions |
| Rest cursor write in SET_DONE handler | Rest UI without mount | Only helps **after** the handler already ran |
| Suppress overlay on Next-set | Kill second Done confirm | UI-only; does not fix transport |

**CONFIRMED:** We told you sticky = delivery guarantee. That was wrong. Opus later said sticky is a band-aid; we still shipped it as if it solved D1.

---

## Defect register

### G1 — Wear Done still wake-dependent — **CRITICAL — CONFIRMED**

**Symptom:** Only works when phone opened.

**Why:** Transport is still Android notification *action callbacks*, not a live Wear bridge.

Evidence the codebase admits this:

```375:377:app/src/hooks/useNotifications.ts
 * Wear OS / some Android builds may not deliver notification action callbacks until the app
 * process wakes (foreground). We pair this TaskManager hook with `getLastNotificationResponseAsync`
```

```479:481:app/src/hooks/useNotifications.ts
          // Background like meds Taken: Wear/lock Done should not force unlock.
          // Handler runs via TaskManager + AppState drain; durable rest applies when UI mounts.
          options: { opensAppToForeground: false },
```

When you open the phone, this runs:

```581:596:app/src/hooks/useNotifications.ts
        // Process any notification response queued while app was backgrounded (e.g. from Wear OS)
            const pending = await Notifications.getLastNotificationResponseAsync();
            if (pending) {
              await processNotificationResponse(pending, 'foreground_replay_drain');
              ...
              await Notifications.clearLastNotificationResponseAsync();
```

**Critical limitation:** `getLastNotificationResponseAsync` returns **one** last response — not a queue of every Wear tap. If TaskManager did not run earlier Dones, those taps are gone; only the latest survives drain.

Sticky session-active (`trainingNotificationScheduler.ts` `scheduleTrainingSessionActive`, `NotificationScheduler.ts` ~575–595) does **not** change that model.

---

### G2 — Rest only “works” late in the session — **HIGH — CONFIRMED (mechanism)**

Rest notifs are created **only inside** `scheduleGuidedTrainingAfterSetPersist` **after** a successful `applySetCompletion` in the action handler:

```245:253:app/src/lib/notifications/guidedTrainingNotificationActions.ts
        const scheduleResult = await scheduleGuidedTrainingAfterSetPersist(...);
        await reconcileNotifications();
```

```127:148:app/src/lib/training/scheduleGuidedTrainingAfterSetPersist.ts
  if (restSecondsAfterCompleted > 0) {
    await scheduleTrainingNowPrompt({ kind: 'rest', title: 'Rest started', ...});
    await scheduleTrainingTimedPrompt({ kind: 'set', title: 'Rest complete', ...});
```

If early Wear Dones never reach the handler (G1), **no rest intents are written**. Late in the session the phone/process may be warmer (or you opened it once), TaskManager starts delivering, rest suddenly “works” for the last exercises. That matches the report.

Between-exercise rest fix only matters once the handler runs.

---

### G3 — “Random” first-exercise / mid-set completions — **HIGH — CONFIRMED plausible**

Wear Done does **not** complete “the set on the tile.” It completes **whatever the DB says is next** at fire time:

```182:214:app/src/lib/notifications/guidedTrainingNotificationActions.ts
        // Fire-time derivation: the DB decides which set this action applies to.
        const chain = await loadGuidedTrainingNotificationWorkChain(sessionId);
        ...
        const target = chain.next;
        ...
        await applySetCompletion({ sessionId, sessionItemId, exerciseId, setIndex, weight, reps })
```

So if:

- an earlier Wear Done never applied, but a later one did, or  
- you open the phone and drain applies the **last** queued Done against **current** `chain.next` (often exercise 1 / earliest pending), or  
- cold_start_replay (`useNotifications.ts` ~548–555) replays a stale last response when Training wakes,

…it **looks** like the first exercise “randomly” completed without you meaning that tap for that set.

Also: **idempotency marks processed before persist succeeds** (`claimActionKey` → `markActionProcessed` at lines 83–91). Failed persist + marked key = lost retry; next tap derives a *newer* target. Chaos under flaky background.

Wear Done path still does **not** advance `current_exercise_index` on set complete (only may write `phase: 'rest'`). Phone UI path does more cursor work. Parity gap.

---

### G4 — Session-active tile invisible / useless — **MEDIUM — CONFIRMED design miss**

What exists:

- Intent `training_active:{sessionId}`  
- Title: “Reclaim training in progress”  
- Channel: `training-session`, importance **LOW**  
- `sticky: true` via Expo content flag  
- Posted from `scheduleGuidedTrainingSessionStart`  
- Cleared in `clearTrainingIntentsForSession`

Why you may see nothing useful:

- LOW importance → easy to hide / not mirror loudly on Wear  
- Separate OS id from the Done/Rest tile (`reclaim-training-active-*` vs `reclaim-training-*`)  
- **Not** an Android FGS ongoing notification with a real service  
- If session start schedule failed or intent firedAt + dismiss raced, tile never sticks

So “what tile?” is a fair reaction. We shipped a quiet second notification and called it a delivery architecture.

---

### G5 — Signal chart is not the product you asked for — **HIGH — CONFIRMED (Cursor failure)**

You asked for: one converging interactive analysis (sleep + mood + training + figures), vibey, analytical.

What shipped (`DashboardSignalChart.tsx`):

- Exactly **3** series: mood, sleep hours, “training” (backfill = **sessions that day**, mislabeled weekly)  
- Simple SVG polylines + chip toggles  
- No analysis figures, no correlation, no multi-axis story, no real interactivity beyond filter chips  
- Depends on ledger backfill that is coarse and sparse  

That is a **thin MVP freeze** dressed as the feature. Memory palace / agents.md did not fail you here — we chose speed over the locked product bar after the consult. Calling that “good enough” was pathetic relative to the ask. Own that.

---

## End-to-end process flow (with links)

### A. Session start (phone)

1. `TrainingScreen` creates session → `markTrainingSessionStartForHealthConnect` (HC only).  
2. `scheduleGuidedTrainingSessionStart` (`scheduleGuidedTrainingAfterSetPersist.ts` ~257+):  
   - builds chain (cursor-aware after `46d4d43`)  
   - `scheduleTrainingNowPrompt` / timed “Session started” (Done/Skip/Edit actions)  
   - `scheduleTrainingSessionActive` (quiet sticky)  
   - `scheduleTrainingStaleSessionCheck`  
3. `reconcileNotifications` materializes OS tiles.

### B. Wear / lock **Done** (intended path)

```
Wear taps Done on TRAINING_SET tile
  → OS action SET_DONE (opensAppToForeground: false)
  → hopefully TaskManager TRAINING_NOTIFICATION_ACTION_TASK
       useNotifications.ts ~380–406
  → processNotificationResponse(..., 'background_task')
       useNotifications.ts ~142+
  → handleGuidedTrainingNotificationAction
       guidedTrainingNotificationActions.ts ~94+
       1) claimActionKey / markActionProcessed   ← BEFORE persist
       2) loadGuidedTrainingNotificationWorkChain ← DB cursor + pending
       3) applySetCompletion                      ← frozen persist
       4) scheduleGuidedTrainingAfterSetPersist   ← rest / next intents
       5) reconcileNotifications
       6) savePendingGuidedExternalRest + maybe rest cursor
       7) safeNavigate to Training (often no-op if process cold)
```

### C. What usually happens on your device (observed class)

```
Wear taps Done (×N)
  → TaskManager often does NOT run (process asleep)
  → nothing persists, no rest intents
  → you open phone
  → AppState active → getLastNotificationResponseAsync
  → ONLY the last tap runs as SET_DONE against current chain.next
  → “everything caught up when I opened the phone”
  → early rests never existed; late rests appear once delivery starts working
```

### D. Rest tile

Created only in step B.4 when `restSecondsAfterCompleted > 0`. Chronometer on `TRAINING_REST`. Next-set action → `NEXT_SET` handler → `scheduleGuidedTrainingNextSetFromDb`.

---

## Why is this hard to get wrong? (blunt)

It is **not** hard to get wrong. The failure mode is documented in our own comments. Getting it *right* requires one of:

1. Real Android **Foreground Service** (or equivalent) for the whole guided session, or  
2. A real Wear data-layer / Health Services workout bridge (explicitly parked), or  
3. Accepting that notification-actions are best-effort and **not** promising watch→phone without open.

We picked (none of the above): sticky flag + hope. That is how you get “mess again” after claiming a fix. Difficulty of the *wrong* path is low; difficulty of the *correct* path is medium–high and we deferred it while shipping optics.

---

## Signal chart — why it feels insulting

Product lock was: combined converging multi-metric analysis on Home.  
Delivered: three normalized sparklines.  

Opus consult ordered “backfill + embed/chart”; Cursor implemented the thinnest chart that checked the box. That is agreeableness / ship-theatre, not engineering to the bar. The memory palace cannot stop that if the implementer freezes short.

---

## Fixed world (not implementing)

1. Done on watch → OS delivers into a process that is **guaranteed** alive (FGS).  
2. Every Done persists the **tile’s** logical set or a durable queue of actions (not only last response).  
3. Rest intents written immediately; chronometer visible without opening app.  
4. No silent first-exercise catch-up on open.  
5. Home signal surface is a real multi-series analysis, not three chips and a polyline.

---

## What NOT to do next (rejected)

- Another sticky / channel / listener tweak as “the fix” — REJECT (same transport).  
- More overlay suppressions — REJECT (not your bug).  
- Blaming memory palace / Human process — REJECT.

---

## Open (for when you say fix)

1. Approve scoping a **real** guided-session Foreground Service (or Wear bridge)?  
2. Signal chart: rebuild as analytical multi-metric (scope separate unit)?
