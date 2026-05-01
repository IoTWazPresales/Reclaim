# Phase 7 — Full UI/UX/Product-Surface Audit Backlog (April 2026)

This document is the output of a complete screen-by-screen, component-by-component, modal-by-modal product audit conducted in April 2026 across all major app surfaces. It replaces speculative backlog items with confirmed, code-evidenced issues organised by severity and fix type.

---

## Audit Coverage

All major surfaces reviewed:
Home/Dashboard · Sleep · Mood · Medications · Exercise (Today, History, Session, Setup Wizard) · Mindfulness · Meditation · Settings · Integrations · Notifications · Data & Privacy · About · Reclaim Moments · Analytics · Navigation Drawer · Active Training Session

---

## Tier 1 — Ship-Blockers

These must be fixed before wider external user exposure. Each is a direct trust or product quality failure.

| # | Issue | File (confirmed) | Fix |
|---|---|---|---|
| T1-01 | **"Coming next" roadmap card in Sleep screen** — publicly exposes unbuilt features ("iOS HealthKit sleep import", "Sleep consistency score") making the app feel unfinished | `SleepScreen.tsx` line 2639–2655 | Remove the entire `{/* Roadmap hint */}` block |
| T1-02 | **"Spotify (coming soon)" placeholder card in Meditation** — explicitly says "Placeholder only — no integration in this release" | `MeditationScreen.tsx` line 873–881, `<SpotifyPlaceholderCard />` | Remove `SpotifyPlaceholderCard` and its render call |
| T1-03 | **"Let users pick the voice (gender isn't reliably exposed across platforms)" developer comment as UI text** | `MeditationScreen.tsx` line 990 | Remove this `Text` element entirely |
| T1-04 | **"Test Sentry" button in About screen** — Sentry error reporting test tool visible to all production users | `AboutScreen.tsx` (or equivalent) | Wrap with `{__DEV__ && ...}` or remove |
| T1-05 | **"Test reminder in 10s" button in Meds Quick actions** — developer notification test tool visible to production users | `MedsScreen.tsx` line 1254 | Wrap with `{__DEV__ && ...}` |
| T1-06 | **Ghost/zero-data sessions in Training history** — "5936 min · 0 exercises · ~0kg" (99-hour timer) listed as peer history entries, destroys trust in training data | `TrainingHistoryView.tsx` line 177 | Filter: exclude sessions where `exercisesCompleted === 0 && totalSets === 0`, or `durationMins === null`, or `durationMins > 480` |
| T1-07 | **`box_breath_60` / `reality_check` as session titles in Mindfulness history** — raw internal intervention IDs displayed as the primary label | `MindfulnessScreen.tsx` line 1472 — `{item.intervention}` | Create display name map: `{ box_breath_60: 'Box Breathing (60s)', reality_check: 'Reality Check', breath_478: '4-7-8 Breathing', urge_surfing: 'Urge Surfing', five_senses: '5-Senses Grounding' }` and resolve before render |
| T1-08 | **3-button session footer with undefined consequences** — "Cancel session" / "Close" / "Finish session" all peer-level with no differentiation; users will accidentally lose session data | `TrainingSessionView.tsx` line 2325–2367 | Rename "Close" to "Minimize" (keeps session); move "Cancel session" to secondary access (e.g. hold or menu); give "Finish session" full visual dominance |

---

## Tier 2 — Trust-Critical

Fix in the next release cycle. Each damages user trust, causes data misinterpretation, or produces a confusing interaction at a key moment.

### Raw System Values Exposed as User Text (fix as a sweep)

The following are all instances of the same root pattern — internal values rendered without a display layer. Fix them together.

| # | Issue | File | Confirmed Line | Fix |
|---|---|---|---|---|
| T2-01 | **"Preferred: health_connect"** raw integration ID in Sleep Connect card | `SleepScreen.tsx` | 1736 | Resolve `preferredIntegrationId` to its `.title` from `connectedIntegrations` |
| T2-02 | **"Last scheduled at: 4/12/2026, 1:28:53 AM"** with full seconds in Meds Reminders | `MedsScreen.tsx` | 767 | Use `formatDistanceToNow` or strip seconds: `toLocaleString([], { hour: 'numeric', minute: '2-digit' })` |
| T2-03 | **"Last session: 4/4/2026, 8:49:02 PM"** with full seconds in Mindfulness streak | `MindfulnessScreen.tsx` | 1196 | Same as above |
| T2-04 | **"Last sync: 4/12/2026, 4:31:41 PM"** with full seconds on Analytics Sync card | `AnalyticsScreen.tsx` | (confirm line) | Same as above |
| T2-05 | **"via manual · user_request"** raw trigger_type + reason as session metadata in Mindfulness history | `MindfulnessScreen.tsx` | 1476–1477 | Map `trigger_type`: `{ manual: 'Started by you', health_trigger: 'Health nudge', scheduled: 'Scheduled' }`; omit reason for `user_request` |
| T2-06 | **"Permission: granted"** raw system label in Meds Reminders card | `MedsScreen.tsx` | 761 | Replace with "Notifications: On" / "Notifications: Off" |
| T2-07 | **"This sends a private report to your Supabase logs table."** in Settings Support | `SettingsScreen.tsx` | 689 | "This sends a private report directly to our support team." |
| T2-08 | **"Supabase"** appears in Data & Privacy delete confirmation, data storage copy, and telemetry bullet | `DataPrivacyScreen.tsx` | multiple | Replace all user-facing "Supabase" references with "Reclaim's servers" or "Reclaim" |
| T2-09 | **"Duration: 520 min"** / **"468 min"** — raw minutes in sleep history list and modal | `SleepHistorySection.tsx` | 164, modal | Format: `Math.floor(durationMin/60)h ${durationMin%60}m` |
| T2-10 | **"Source: healthkit"** raw DB enum in sleep history entries | `SleepHistorySection.tsx` | 167 | Map source enums: `{ healthkit: 'Apple Health', health_connect: 'Health Connect', manual: 'Manual' }` |
| T2-11 | **"2026-04-06 → 2026-04-12"** ISO date format in "This Week" header on Exercise | `TrainingScreen.tsx` | 1300 | Replace `toYMD()` display calls with `weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` |
| T2-12 | **"Target sleep (minutes): 480"** — raw minutes in Settings Sleep | `SettingsScreen.tsx` | 306 | Convert to hours input (or display "8h"). Label as "Target sleep duration" |
| T2-13 | **User ID: 7ae5c7ce-b9b1-458d-a660-b690ed2d5ee6** — full Supabase UUID shown in Profile settings | `SettingsScreen.tsx` | 665 | Remove from profile view. Expose only via diagnostics copy button in Support section |

### Interaction / Form / State Issues

| # | Issue | File | Fix |
|---|---|---|---|
| T2-14 | **"Save check-in" button above form inputs** in Mood Check-in — primary action before all fields | `MoodScreen.tsx` | 1210–1237 | Move `ReclaimButton` to after note input |
| T2-15 | **"Dose Overdue" + "4/4 today" contradictory hero state** on Medications | `MedsScreen.tsx` | Hero logic | Clarify: distinguish "today's earlier doses" from "upcoming overdue dose" in subtitle |
| T2-16 | **"Enable reminders" shown when reminders already enabled** in Meds Reminders | `MedsScreen.tsx` | 784 | Gate on `permStatus !== 'granted' \|\| remindersDisabled === true` |
| T2-17 | **"watch notifications are forced"** in active session header | `TrainingSessionView.tsx` | 1938 | Change to "Guided mode: notifications active" |
| T2-18 | **"End Session" destructive button in session header card** | `TrainingSessionView.tsx` | header render | Remove from header; consolidate all exit actions in bottom bar only |
| T2-19 | **"Start sessi..." still truncating** in Session Preview modal bottom bar | `SessionPreviewModal.tsx` | 237–241 | Lower `stackActions` threshold to `winW < 500` or add `compact` + reduce `paddingHorizontal` on primary capsule contentStyle |
| T2-20 | **"Delete program" in wizard navigation bar** every step of Training setup | `TrainingSetupScreen.tsx` | 962 | Move to a secondary menu or long-press. Do not show on initial setup (no program exists yet) |
| T2-21 | **"Auto (recommended)" not the pre-selected default** in Strength Baselines frequency | `TrainingSetupScreen.tsx` | frequency default | Change initial state to `'auto'` |
| T2-22 | **Interpretation text ignores user-applied negative tags** in Mood detail modal | `MoodScreen.tsx` | modal interpretation | When negative tags (#low, #anxious, #overwhelmed) present, modify interpretation copy to acknowledge both score and tag |
| T2-23 | **"Histo..." tab label truncation** — History tab clips when selected | `TrainingScreen.tsx` / tab bar | Reduce tab label `fontSize` to 12 or rename to "Log" |

---

## Tier 3 — Polish & Product Quality

Fix in the sprint following Tier 2. Each is medium-severity but visible and reduces perceived quality.

### Copy & Language

| # | Issue | Fix |
|---|---|---|
| T3-01 | **"Volatility (MAD)"** — raw statistical term | Replace with "Day-to-day swing" or "Variability" |
| T3-02 | **"±0"** in Mood detail modal trend | Replace with "No change" or "Holding steady" |
| T3-03 | **"-3.6 vs 7d"** false decimal precision in mood delta | Round to nearest whole number |
| T3-04 | **"Tap for detail"** explicit copy on Mood history entries without notes | Remove; use chevron or card elevation |
| T3-05 | **"4 goals"** internal label in Training recent sessions | Replace with "N exercises" |
| T3-06 | **"sum to 1.0"** framing in Training Goals setup | Change to "add up to 100%" |
| T3-07 | **"7-7"** degenerate rep range when min === max | Display as single value: "7 reps" |
| T3-08 | **"AMRAP"** without explanation in Outcome Preview | Add "(max reps)" in parentheses |
| T3-09 | **"Guided forces actionable training notifications"** — coercive verb | Change to "Guided sends workout prompts to your notifications during the session" |
| T3-10 | **"Hour (0-23)" / "Minute (0-59)"** technical range labels on time inputs | Remove range notation from labels; use placeholder text instead |
| T3-11 | **"2-minute reset: water + 60 sec movement (any)"** — clinical/overprecise | Soften: "Take a minute to move and drink some water" |
| T3-12 | **"Desired wake / Typical wake (HH:MM)"** format constraints in label | Move format hint to placeholder text |
| T3-13 | **"Built with: Expo, React Native, Supabase, React Query, Zustand"** in About | Remove tech stack from user-facing About screen |
| T3-14 | **"Nerd mode"** label inconsistent with premium tone | Rename to "Detailed insight labels" or "Scientific detail" |
| T3-15 | **"No matching set from your last session yet"** repeated on every set row | Show once as card-level note; remove per-row repetition |

### Interaction & State

| # | Issue | Fix |
|---|---|---|
| T3-16 | **Full-width "Taken" button for completed meds doses** — state displayed as action | Replace with compact inline chip/badge for completed doses |
| T3-17 | **Redundant toggle + "Disable reminders" button** in Mood Reminders | Use toggle only as the control; remove the separate button |
| T3-18 | **"Save my take" disabled with no explanation** in Mood cause links | Add helper: "Select Yes, Somewhat, or No to save" |
| T3-19 | **"In crisis?" card placed in regular mood check-in flow** | Move to bottom of screen or Settings > Help |
| T3-20 | **"~0kg" for bodyweight exercises** in Session Preview | Display "bodyweight" or "BW" when weight is 0 |
| T3-21 | **Weekly history view all zeros with no empty-state guidance** | When all values 0, show "No sessions logged yet this week" + prompt |
| T3-22 | **No "none apply" affordance on Constraints & Injuries setup step** | Add "No constraints" chip or text: "Nothing selected means no restrictions applied" |
| T3-23 | **"Start" disabled in Meditation with no explanation** | Add inline: "Choose a practice above to begin" |
| T3-24 | **Mood ↔ Meditation card renders with one side "—"** | Gate on `meditationDays > 0` |
| T3-25 | **Medication adherence 4% (5/120) lacks temporal context** | Show "Based on N days of tracking" to avoid clinical alarm |
| T3-26 | **"Send test" button in Auto-Start Meditation** | Rename to "Test alarm" with explanatory label, or gate with `__DEV__` |
| T3-27 | **"Clear reminders" in Meds Quick actions has no confirmation** | Add Alert confirmation before executing |
| T3-28 | **"Hide provider priority helper" internal button visible to all users** | Rename to "Manage data source priority" or move to developer/power-user section |
| T3-29 | **"Premium feature — upgrade" with no working upgrade path** in Integrations | Remove gate until upgrade flow is built, or wire it |
| T3-30 | **"Quiet hours: Off → Off"** format | Replace with "Quiet hours: Not set" |
| T3-31 | **Analytics tab mostly empty for new users** | Add sparse-data message: "Your analytics build over time. Keep logging to see patterns." |

### Layout & Formatting

| # | Issue | Fix |
|---|---|---|
| T3-32 | **"🌫️" emoji renders as gray square on Android** for Heavy mood state | Replace with react-native-paper icon or remove emoji entirely |
| T3-33 | **"Dumbbell Bench Press" chip clipped** in Training Analytics exercise selector | Add right-edge fade gradient or `flexWrap: 'wrap'` |
| T3-34 | **Y-axis has no unit label** in Training Analytics strength chart | Add "kg" or "est. 1RM (kg)" axis label |
| T3-35 | **"Histo..." tab truncation in History sub-view** (List/Weekly mode) | Same fix as T2-23 |
| T3-36 | **Empty space on Equipment and Constraints wizard steps** | Add brief helper copy below chips |
| T3-37 | **Lifecycle hero → first card gap too large** on Dashboard | Reduce `heroToStackGap` spacing |
| T3-38 | **Routines list mixes lifestyle and workout types** without visual separator | Add section headers: "Lifestyle" and "Workouts" |
| T3-39 | **PDF summary subtitle truncated** in Data & Privacy export card | Increase `numberOfLines` or shorten description |
| T3-40 | **"Last connected 7 days ago"** ambiguous in Integrations | Clarify: "Last synced 7 days ago" and consider prompt to re-sync if stale |
| T3-41 | **Overlay lacks backdrop** on "Get ready" training countdown | Add semi-transparent scrim behind card |
| T3-42 | **"Your watch will alert you"** assumes wearable in training countdown | Add fallback: "or your notification bar" |
| T3-43 | **Time format inconsistency** in Meds medication list ("7:30" vs "20:00") | Standardise to 12h AM/PM or ensure 24h includes leading zeros |
| T3-44 | **"___" RPE element unlabelled** in exercise set card | Label as "Rate effort" or "Add RPE" |
| T3-45 | **Blue mood dot in Moments has no legend** | Consistently neutral indicator or add tooltip |

---

## Tier 4 — Low-Priority / Optional

| # | Issue | Fix direction |
|---|---|---|
| T4-01 | "Tap for detail" explicit CTA on history entries without notes | Remove; rely on card tap affordance |
| T4-02 | "Reps" label repeated per exercise in Strength Baselines | Single column header |
| T4-03 | "±0" mood delta | "No change" |
| T4-04 | Duplicate ghost mindfulness sessions 10 seconds apart | Dedup on `created_at` within 60s window for same intervention |
| T4-05 | "Efficiency: 85%" in Sleep modal has no framing | Add "(good)" or range context |
| T4-06 | Session history Recent sessions shows "Timed · 4 goals" | Replace with "N exercises" |

---

## Scoring Summary (All Surfaces)

| Surface | Visual | Premium | Clarity | Trust | Usefulness | Return | Consistency | **Avg** |
|---|---|---|---|---|---|---|---|---|
| Mood Hero | 8.5 | 8.0 | 8.0 | 8.0 | 7.5 | 8.0 | 8.0 | **8.0** |
| Reclaim Moments | 7.5 | 7.0 | 8.0 | 7.5 | 8.0 | 7.5 | 7.5 | **7.6** |
| Training Setup Wizard | 7.0 | 6.5 | 6.5 | 7.0 | 8.0 | 7.0 | 7.0 | **7.0** |
| Integrations | 7.0 | 6.5 | 6.5 | 7.0 | 7.0 | 6.5 | 6.5 | **6.7** |
| Mood Screen (full) | 7.5 | 7.0 | 6.0 | 6.5 | 6.5 | 6.5 | 7.0 | **6.7** |
| Navigation Drawer | 7.0 | 6.5 | 7.0 | 7.0 | 7.0 | 6.0 | 7.0 | **6.8** |
| Notifications | 6.5 | 6.5 | 6.5 | 7.5 | 6.5 | 6.0 | 6.5 | **6.6** |
| Data & Privacy | 6.5 | 6.5 | 6.0 | 7.5 | 7.0 | 5.5 | 6.5 | **6.5** |
| Medications Today | 6.5 | 6.0 | 5.5 | 6.5 | 7.0 | 5.5 | 6.0 | **6.1** |
| Exercise Today Tab | 6.5 | 6.0 | 5.5 | 5.5 | 6.5 | 5.5 | 6.0 | **5.9** |
| Active Training Session | 6.5 | 5.5 | 4.5 | 6.0 | 7.0 | 5.5 | 5.5 | **5.8** |
| Mindfulness Screen | 6.5 | 6.0 | 5.0 | 5.0 | 7.0 | 6.0 | 5.5 | **5.9** |
| Sleep Screen | 6.5 | 5.5 | 5.0 | 4.5 | 6.0 | 5.0 | 6.0 | **5.5** |
| Settings | 6.5 | 5.5 | 5.5 | 5.5 | 7.0 | 6.0 | 6.0 | **6.0** |
| Medications (full) | 6.5 | 6.0 | 5.5 | 5.5 | 6.5 | 5.5 | 6.0 | **5.9** |
| Analytics | 6.0 | 5.5 | 5.5 | 5.5 | 5.0 | 4.5 | 5.5 | **5.4** |
| About | 6.0 | 4.5 | 6.0 | 5.5 | 4.5 | 4.0 | 5.5 | **5.1** |
| Meditation Screen | 5.5 | 4.5 | 5.0 | 4.0 | 5.5 | 4.5 | 5.0 | **4.9** |
| Exercise History | 5.5 | 4.5 | 4.5 | 3.5 | 5.5 | 4.0 | 5.5 | **4.7** |

---

## Best Surfaces

1. **Mood Hero** — premium visual, honest confidence labelling, great copy
2. **Reclaim Moments** — clean, scannable, does exactly what it promises
3. **Training Setup Wizard (Strength Baselines step)** — live Est. 1RM, excellent functional design
4. **Outcome Preview card in Training Goals** — real-time consequences while adjusting goals
5. **"What you're tracking here" (Meds info card)** — trust-building, honest, well-scoped

## Weakest Surfaces

1. **Meditation screen** — Spotify placeholder card and developer comment are the most direct trust failures in the app
2. **Exercise History** — ghost/99-hour sessions make the history feel broken
3. **About screen** — "Test Sentry", full tech stack, and developer-facing copy in a user screen
4. **Analytics tab** — mostly empty for realistic usage levels with no adaptive empty state

---

## Top Retention Risks

1. **User accidentally taps "Cancel session" instead of "Close"** during training → data lost → likely churn
2. **"Coming next" roadmap card on Sleep** → user concludes core features don't exist yet
3. **"5936 min · 0 exercises" in Training History** → immediate loss of trust in all health data
4. **"Placeholder only — no integration in this release" on Meditation** → user questions whether app is production-ready
5. **Analytics tab showing all zeros** → user concludes the app isn't working for them

---

## Suggested Sequencing

### Sprint 1 (before any external user expansion)
All Tier 1 items: T1-01 through T1-08.
Estimated effort: Small — mostly removal/gating. None require new features.

### Sprint 2 (trust & raw values sweep)
T2-01 through T2-13 as a single sweep — all share the same pattern (raw internal values as display text). Can be done in one coordinated pass across 6–8 files.
T2-14 (check-in button order), T2-16 (Enable reminders state), T2-19 (Start session truncation), T2-23 (Histo... tab).

### Sprint 3 (interaction hierarchy)
T2-17, T2-18, T2-20, T2-21, T2-22 — session action bar restructure, End Session removal, Delete program relocation, default frequency fix, tag-aware interpretation.

### Sprint 4 (polish pass)
All remaining Tier 3 items in order of user visibility.

---

*Generated from full audit conducted April 2026. Update when closing items.*
