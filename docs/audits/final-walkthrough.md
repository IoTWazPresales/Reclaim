# Final Pass — Walkthrough & Verification

**Date:** 2026-07-03
**Branch:** `cursor/final-pass-phases-67d1`
**Verification environment:** cloud CI (no Android device / emulator attached).

## How to read this document

Every phase below has two verdicts:

- **Automated** — what was proven in this environment: `tsc --noEmit` clean,
  `vitest` (630/630 green), `npm run audit:training-dual-paths` (19/19), ESLint
  on all touched files (no new errors; 2 pre-existing duplicate-import errors in
  untouched files remain), plus targeted static sweeps listed per phase.
- **Device** — what still needs a walk-through on the physical phone. This
  environment has no Android device, so lock-screen actions, notification
  timing, Health Connect reads and haptics **cannot be observed here**. The
  device checklist at the bottom is the remaining work before calling the pass
  done end-to-end.

## OTA channel check (do this FIRST on device)

`app.config.ts`: `runtimeVersion: 1.0.3`, updates URL `u.expo.dev/d053ca52-…`.
Channels (eas.json): `development` / `preview` / `production`.

Before judging ANY fix on the test device:

1. Open the dev menu (or `Updates.channel` / `Updates.runtimeVersion` in the
   About screen diagnostics) and confirm the device runs **runtimeVersion
   1.0.3** on the channel you published to.
2. Publish this branch with `eas update --branch <channel>`; force-close and
   reopen the app twice (expo-updates applies on second launch).
3. If the device shows runtimeVersion 1.0.2, it will NOT receive these updates
   — rebuild first.

**Native-build caveats in this pass (not OTA-deliverable):**
- `plugins/withHealthConnectPermissions.js` now declares
  `android.permission.health.READ_STEPS` (heart-rate nudge inactivity gate).
  Requires a new EAS build + Play data-safety declaration. Until then the
  steps gate degrades to "unknown" and the nudge relies on sustained HR only.

---

## Phase 0 — Ground truth

| Verdict | Detail |
|---|---|
| Automated: **PASS** | Read DUPLICATE_LOGIC_MAP, RUNTIME_TRUTH_REPORT, TRAINING_BUGS_ANALYSIS, sessionWorkAuthority.ts, the full notification pipeline, and the reskin brief before any code change. Confirmed: one pipeline (intents → reconcile), no watch app, OTA enabled. |

## Phase 1 — Notifications become dumb triggers

**What changed**
- `trainingNotificationScheduler.ts` rewritten: a training notification now
  carries `sessionId` + action-verb context (`TRAINING_SET`/`TRAINING_REST`,
  which map to categories with the action buttons) + display strings +
  `issuedAt`. The 3-level `next/nextAfter/nextNextAfter` payload snapshot is
  gone from every producer, the reconciler, and every handler.
- Fire-time derivation: `SET_DONE`, `SKIP_SET`, `NEXT_SET`, `EDIT_SET` read the
  DB (`loadGuidedTrainingNotificationWorkChain` →
  `sessionWorkAuthority.deriveActiveWorkTarget`) at tap time.
- One notification identity per session: `reclaim-training-{sessionId}` for
  both intent slots (`training_now:{id}` immediate, `training_at:{id}`
  absolute-timestamp). The lock-screen tile is replaced in place. The
  "only-alert-once" behaviour comes from identifier replacement — Expo does not
  expose Android's `setOnlyAlertOnce`, so re-alerts are governed by channel
  importance; observe on device.
- Rest-end fires via one scheduled trigger with an absolute `scheduledAt`;
  `reconcileNotifications` never re-materializes an intent whose `scheduledAt`
  has passed, and the plan signature is keyed on the absolute time so reconcile
  passes don't churn the alarm.
- The `staleHint` patch path is **deleted** (`resolveNotificationPresentation`
  no longer returns it; `guidedNotificationActionEvidence.ts` removed).
  Duplicate deliveries are covered by response-key claim (salted with
  `issuedAt`) + an in-flight guard — proven by tests including a concurrent
  double-delivery race.

| Verdict | Detail |
|---|---|
| Automated: **PASS** | tsc + 630 tests green; `audit:training-dual-paths` 19/19; grep sweeps: zero `nextAfter` payload producers, zero legacy `training_rest:/set:/first:` intent writers (legacy intents are dropped by reconcile and cleared on sight). |
| Device: **PENDING** | Guided session start-to-finish with phone locked: single tile updating in place, Done/Skip/Next actions from lock screen, rest-end firing on time, no stale/duplicate tiles after force-close + reopen. |

## Phase 2 — Intelligent progression

**What changed**
- `decideDoubleProgression` (progression.ts): all sets at top of rep range with
  RPE ≤ 8 → +2.5 kg upper / +5 kg lower (equipment-aware; dumbbells 1 kg);
  reps below range or RPE 9–10 → hold; two consecutive holds at the same load →
  deload 10 % (`countHoldStreak` over 3-session history via
  `getRecentExercisePerformances`).
- `suggestLoading` uses this decision as the primary path — the previous
  e1RM/Epley re-derivation (which bounced loads and made holds impossible) is
  no longer used when history exists.
- Reasoning surfaced: set card (SetFocusCard) and session history
  (SessionDetailModal) show e.g. `+2.5kg — you hit 3×7 @ RPE 7 last time.`
- Bodyweight: progresses by reps, suggests adding weight at 3×12, and displays
  **Bodyweight**, never `0kg` (`formatWeight`/`formatWeightReps`; a 0×0 log
  renders "Skipped").
- History trail: the progression reason is persisted per exercise in the
  session's `planned.decisionTrace` and shown in history; per-exercise e1RM
  trend chart already exists in Training Analytics.

| Verdict | Detail |
|---|---|
| Automated: **PASS** | 13 policy tests (increase/hold/deload/bodyweight/streak) + golden program tests green. |
| Device: **PENDING** | Complete a session hitting top-of-range, start the next session of the same type, confirm the +2.5/+5 kg suggestion and the reasoning line render. |

## Phase 3 — Heart-rate nudge, honestly

**What changed**
- Phone-only Health Connect **polling every ~15 minutes**
  (`HR_NUDGE_CHECK_INTERVAL_MS`), replacing the per-minute spike stream.
- Gate (`hrNudgeGate.ts`): fires only when **all** recent samples in the window
  exceed resting HR + 35 bpm (≥ 2 samples = "sustained") **and** steps in the
  window say inactive (≤ 60; unknown step data doesn't block). Never fires
  without a resting baseline — no fake thresholds.
- Debounce: max one nudge per 2 hours; silent during quiet hours.
- Notification tap starts the existing 1-minute box-breathing session
  (`box_breath_60`, autoStart deep link).
- Settings copy states plainly: checks run about every 15 minutes, not live
  monitoring, not a medical alert.
- Wear OS companion: **not started**, per instruction.

| Verdict | Detail |
|---|---|
| Automated: **PASS** | 8 gate tests (sustained, active-user, quiet hours, debounce, no-baseline, unknown-steps). |
| Device: **PENDING** | Simulate: seed Health Connect with elevated HR samples + resting baseline, wait one poll cycle, confirm one nudge, tap → breathing starts; confirm 2-hour debounce and quiet-hours silence. Steps gate active only after the READ_STEPS build. |

## Phase 4 — Cadence & import truth

**What changed**
- Mood reminder: **one per day** at a user-chosen time (Settings →
  Notifications, default 20:00), scheduled as next-3-day one-shot date
  triggers. Today's reminder is skipped when a mood is already logged
  (device-first check incl. pending outbox); logging triggers a reconcile that
  drops it. Legacy fixed 08:00/20:00 repeating reminders retired.
- Sleep: cold-open and background syncs are fully silent (open-app celebration
  deleted). Celebration fires ONLY when the user taps Import/Sync and new
  nights arrived; otherwise a quiet "Up to date — no new nights." snackbar.
  Dedupe by session key unchanged; daily background job
  (`expo-background-fetch`, 24 h) unchanged.

| Verdict | Detail |
|---|---|
| Automated: **PASS** | Preference normalization + mood-reminder-time tests green; celebration formatter returns null unless new nights. |
| Device: **PENDING** | Log mood before 20:00 → no reminder that evening; skip logging → reminder at the chosen time; cold-open with new HC nights → silent; manual Import with new nights → one celebration. |

## Phase 5 — Motion discipline

**What changed**
- `MilestoneCelebrationModal`: ONE spring — scale 0.96 → 1.06 → 1.0
  (160 ms ease-out + overshoot-clamped spring, settled well under 450 ms), one
  haptic, no confetti, no loops, no multi-bounce. Reduced-motion renders
  statically.
- Celebrations remain earned-only: dose taken, session finished, streak
  milestone, PR, and user-tapped sleep import with new nights (Phase 4).
  Ambient hero art loops are untouched (out of scope — they are not
  achievement animations).

| Verdict | Detail |
|---|---|
| Automated: **PASS** | tsc/tests green; single `withSequence`, no `withRepeat`, one haptic call per open (code-verified). |
| Device: **PENDING** | Log a dose → one clean spring + one haptic; enable reduced motion → static card. |

## Phase 6 — UI consistency pass

**What changed**
- **Medication detail** collapsed: header (labeled dose — no orphan "25"),
  `Next dose: Today 20:00` line, ONE adherence line ("No dose history yet"
  when empty — never 0 %), ONE reminders block ("Every day" / "Weekdays" /
  day names — the `(1=Mon…7=Sun)` legend is gone), recent doses, and all
  education behind a single **About this medication** expander.
- **Hero emoji removed** (mood 🌤/☀️…, sleep 🌙, meds 💊/⏳/⚠️/🕒/🌗, and the
  "Good morning ☀️" notification title) — the orbit art carries the state.
- **Raw debug strings replaced**: "Low (0%) · 0 days of data" → labelled
  `ConfidenceBadge` ("No data yet" when empty) on the Mood/Sleep/Meds heroes;
  the LifecycleHero "Dot legend: …" line → proper chip legend.
- **One insight card per screen, top of scroll, dismissible**: `InsightCard`
  gained `onDismiss`; Mood and Sleep insights moved to the top of the scroll;
  Dashboard/Meds wired for dismissal (crisis read is not dismissible).
- **In-session header** is now the live next-set pill ("Now: Bench Press ·
  Set 2" / "Next: …" while resting) — the truncated screen title is gone.
- **One chip spec** added to the theme (36 px height, radius 18, filled =
  selected, outline = actionable, dim = informational) and applied to RPE
  chips, training day chips, and mood quick tags.
- **Copy**: "Guided forces actionable training notifications during the
  session." → "Guided: the watch and lock screen walk you set-by-set."
  Settings mood-reminder copy rewritten; HR-nudge copy rewritten (Phase 3).
- **Streaks**: progress arcs now measure progress toward the next badge
  threshold (3/7/14/30 d) with next-unlock labels ("7d → Mood Wave"); "Lv"
  hidden until level 2 exists (ring shows the streak day count first).

| Verdict | Detail |
|---|---|
| Automated: **PASS** | tsc/tests green; sweeps: no user-visible `1=Mon`, no `(0%)` strings, no hero emoji in the named headers. |
| Device: **PENDING** | Screenshot pass of med detail, heroes, in-session header, chips, and streak arcs in light + dark. |

## Phase 7 — Retention loop

**What changed**
- **Forecast grading**: `forecastJournal.ts` stores each day's forecast
  (tone/headline/confidence) and freezes it once graded. Mood check-in
  (Dashboard quick log and Mood screen) grades it: "We expected a rough day —
  you said 6/10. Updating your model." Forecast-vs-actual stored; accuracy
  summarized for the weekly report.
- **Weekly Stability Report** (Sunday 19:30 notification): mood trend, sleep
  average, adherence, training sessions + PR count, one insight, one focus.
  **Bug fixed on the way**: the old weekly narrative (and the daily signal)
  were scheduled with `appTag` but no `logicalKey`, so the reconciler cancelled
  them on its next pass — they effectively never arrived. Both are now routed
  through the intent store. Shareable via the system share sheet from
  Analytics → "Weekly Stability Report".
- **Streak repair**: exactly one per week (ISO-week refill, max 1 banked);
  missing one day and logging within the next 24 h keeps the streak. Copy
  remains no-guilt ("Reclaim Shield protected your streak").
- **Home widgets: DEFERRED.** Android home-screen widgets require native
  Kotlin (RemoteViews/Glance) + a config plugin, a new store build, and a Play
  release — not deliverable via OTA in this pass. Same class of exclusion as
  the Wear OS companion the brief itself rules out. Recommended follow-up:
  separate native project (next-dose widget with mark-taken intent + one-tap
  mood widget) alongside the READ_STEPS build.

| Verdict | Detail |
|---|---|
| Automated: **PASS** | 11 new tests (grading copy, freeze-after-grade, accuracy summary, weekly repair refill/limits) green. |
| Device: **PENDING** | Log mood in the evening → grading line appears; Sunday 19:30 → report notification arrives once; share sheet exports the report text. |
| Deferred | Home widgets (native build). |

## Phase 8 — Final verification

**Automated (this environment)**
- `tsc --noEmit`: clean.
- `vitest run`: **630/630** across 96 files.
- `npm run audit:training-dual-paths`: **19/19**.
- ESLint on all touched files: no new errors (2 pre-existing
  duplicate-import errors in untouched files: `DashboardThirtyDayArc.tsx`,
  `SettingsScreen.tsx` — noted, not introduced here).
- Static contradiction sweeps: no payload lookahead producers; no legacy
  training intent writers; no user-visible "0%"-for-no-data strings in the
  named surfaces; single insight card per named screen; every reconciler-owned
  notification carries a `logicalKey`.

**Device walkthrough (REQUIRED before calling the pass done)** — in order:

1. **OTA check** (top of this document) — do not judge anything before this.
2. Fresh install → onboarding → seeded week of mood/sleep/med data.
3. Guided session start-to-finish with the phone locked: one tile updating in
   place; Done/Skip/Next from the lock screen; rest-end on time; kill the app
   mid-rest and confirm the rest-end still fires once and taps still work.
4. Next session of the same type: progression suggestion + reasoning line.
5. HR nudge simulation (elevated HC samples + resting baseline; expect ≤ 1
   nudge / 2 h, honest copy, one-tap breathing).
6. Mood + sleep cycle: reminder-skip-when-logged; silent cold-open import;
   manual import celebration only with new nights; evening grade line.
7. Med day: detail screen collapsed layout; "Every day"; reminders fire; dose
   log → single-spring celebration.
8. Sunday evening: Weekly Stability Report arrives once; share/export works.
9. Cross-screen contradiction check: every number traces to its source
   (adherence, streaks, forecasts, progression) — anything missing must read
   "no data yet", never 0 %.

**Rule check:** no screen may contradict another; no notification late,
duplicated, or stale. Everything provable without a device has been proven;
the device checklist above is the remaining evidence.
