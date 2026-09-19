# APP_AUDIT_CORE — Reclaim defect audit (core surfaces)

**Mode:** READ-ONLY source audit (no product edits, no commit)  
**Sync pin:** `fix/training-confident-ux` @ `cf12b4d` (tracks `origin/fix/training-confident-ux`)  
**App root:** `C:\Reclaim\app`  
**Date:** 2026-09-19  
**Consultant:** none (source reproduce/refute only; device later)  
**Frozen invariants respected:** notifications = `setIntent` + `reconcileNotifications`; guided completion = DB `performed.sets` + `sessionWorkAuthority` + `applySetCompletion`; native FGS for guided alive; Health Connect only.

---

## Reported-bug verdicts (source)

| Reported bug | Verdict | Evidence |
|---|---|---|
| Training loading loop | **CONFIRMED** (residual path; flash-loop partial mitigation exists) | `TrainingScreen.tsx:1028–1077`, auto-resume `383–400`, comments `379–380` / `314–316` |
| Erratic notifications when app opened mid-guided session | **CONFIRMED** (mechanism) | Foreground force-reconcile + queue drain `useNotifications.ts:734–762`; multi-slot now/timed intents; OS cancel side-path `trainingNotificationScheduler.ts:56–68` |
| Login returning to onboarding | **CONFIRMED** | Fail-safe `onboardStatus='no'` on remote timeout/error `RootNavigator.tsx:237–290`; gate → Onboarding `591–597`; Welcome default `onboardingProgress.ts:35–43` |
| Stale session timer 945-min runaway blocking tab nav | **CONFIRMED** (wall-clock elapsed + non-dismissable Portal dialog) | Timer from `started_at` `TrainingSessionView.tsx:538–567`; freeze `staleSessionGuard.ts:37–45`; dialog `dismissable={false}` `2281–2318`; threshold 5h `sessionUiConstants.ts:7–27` |
| Guided rest + close correctness | **PARTIALLY CONFIRMED** — model present; residual race/restore risks | Canonical rest `guidedSetCompletionCanonical.ts:16–29`; close authority `closeTrainingSession.ts`; restore `TrainingSessionView.tsx:1535–1561`; Wear finalize `guidedTrainingNotificationActions.ts:314–325` |
| `guidedTrainingNotificationActions` second write path (closed?) | **REFUTED as bare schedule writer** / **OPEN as cancel side-path elsewhere** | Actions use `setIntent`/`reconcile`/`scheduleGuided*` (`guidedTrainingNotificationActions.ts:13–14`, `290–298`); OS `cancelScheduledNotificationAsync` still in `trainingNotificationScheduler.ts:65`, `useNotifications.ts:145/821` |
| 1kg / 5kg weight increment | **REFUTED as accidental bug** / **CONFIRMED intentional model** (possible UX complaint) | `exerciseLoadingProfile.ts:289–312`; UI `SetFocusCard.tsx:86–87`; edit override `TrainingSessionView.tsx:1669–1674` |
| Onboarding 6s timeout dumping to Welcome | **CONFIRMED** | Race timeout 6000ms `RootNavigator.tsx:237–243`; fail-safe `'no'` `287–290`; Welcome default `onboardingProgress.ts:36–43` |

---

## 1. Auth / session

### Source-of-truth map

| Role | Location |
|---|---|
| Writers | Supabase Auth (`persistSession: true`) `supabase.ts:84–91`; deep-link `authSessionService.setSessionFromDeepLink`; OAuth/PKCE |
| Readers | `AuthProvider` → `getSession` + `onAuthStateChange` `AuthProvider.tsx:22–77`; `RootNavigator` `useAuth()` |
| Cache | In-memory React context `{ session, loading }`; Supabase client storage adapter (SecureStore + fallback) `supabase.ts:70–91` |
| Persistence | SecureStore via Supabase auth storage; profile row `profiles` (incl. `has_onboarded`) |

### Race / stale / data-loss

- Session null while `loading=true` holds splash (`useStartupGate.ts:26–33`).
- `onAuthStateChange` can arrive before initial `getSession` completes — provider clears loading on first event (`AuthProvider.tsx:60`).
- Foreground + 30-min periodic refresh (`AuthProvider.tsx:77–106`) can race with onboard resolution keyed on `session.user.id`.

### Error / offline / restore

- Offline: persisted session still loads from SecureStore; API calls fail later.
- Deep-link TTL 5 min fingerprint dedupe (`authSessionService.ts:14–15`).
- No session → Auth stack (`RootNavigator.tsx:587–589`).

### Tests

- NONE for `RootNavigator` / `AuthProvider` integration.
- Related: NONE found for `authSessionService` session restore.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| A1 | S1 | BUG | VERIFIED | Returning users with empty local onboard flag + slow/failed `profiles` read are routed to onboarding (see §2). `RootNavigator.tsx:237–290` |
| A2 | S3 | NO-MODEL | ASSERTED | No automated test that login + `has_onboarded=true` remote never shows Onboarding. |

---

## 2. Onboarding (6s timeout, `onboardStatus`, dump to Welcome)

### Source-of-truth map

| Role | Location |
|---|---|
| Writers | `markOnboardingComplete` → SecureStore monotonic + `profiles.has_onboarded` upsert `onboardingService.ts:14–38`; `setHasOnboarded` `onboarding.ts:12–19`; step route `onboardingProgress.saveOnboardingStep` |
| Readers | `RootNavigator` effect `195–317`; `getHasOnboarded`; `loadOnboardingStep`; `useStartupGateState` |
| Cache | React state `onboardStatus: 'unknown' \| 'yes' \| 'no'` |
| Persistence | SecureStore `reclaim_has_onboarded_v1:{userId}`; ScopedStorage `onboarding:active_route:v1`; Supabase `profiles.has_onboarded` |

### Resolution algorithm (FACT)

1. If local SecureStore true → `'yes'` immediately (`223–229`).
2. Else race remote query vs **6s timeout** (`237–243`).
3. Remote true → upgrade local + `'yes'` (`257–271`).
4. Remote false / no row → `'no'` (`273–283`).
5. **Remote error OR timeout → `'no'` fail-safe** (`287–290`) — intentionally does not mark complete.
6. `onboardStatus === 'no'` mounts `OnboardingNavigator` (`591–597`).
7. Missing/invalid saved step → **Welcome** (`onboardingProgress.ts:35–43`).

### Race / stale / data-loss

- Cleared SecureStore / new device + network timeout → false onboarding dump even when remote is true but late.
- Timeout promise resolves `{ error: timeout }` while real query may still complete later (ignored via `cancelled` only on unmount/user change — late success after timeout already set `'no'` is dropped if effect still mounted: the race winner is first settle; if timeout wins, status stuck `'no'` until relaunch/local refresh).
- Monotonic local prevents downgrade once true (`onboarding.ts:14`).

### Error / offline / restore

- Offline + no local flag → timeout/error → Welcome/onboarding.
- Resume mid-flow via ScopedStorage route (`OnboardingNavigator.tsx:39–44`).
- Finish → `markOnboardingComplete` + `__refreshOnboarding` path.

### Tests

- `app/src/state/onboarding.test.ts` — pure `computeEffectiveOnboarding` helper only (not wired to RootNavigator).
- NONE for 6s timeout / Welcome dump.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| O1 | S1 | BUG | VERIFIED | 6s remote race fail-safe forces `'no'` → Onboarding/Welcome for already-onboarded users when local flag missing. `RootNavigator.tsx:237–290`, `onboardingProgress.ts:36–43` |
| O2 | S2 | WRONG-MODEL | VERIFIED | Fail-safe prefers “show onboarding” over “hold splash / retry” — conflicts with product expectation that login returns home. Comment at `287` acknowledges retry-on-next-launch only. |
| O3 | S3 | DATA | ASSERTED | Legacy global SecureStore key migration (`onboarding.ts:32–41`) can mis-attribute onboard flag across accounts on shared device. |

---

## 3. Dashboard

### Source-of-truth map

| Domain | Query keys (readers) | Persistence / writers |
|---|---|---|
| Settings | `['user:settings']`, `['routine:template:settings']` | Supabase / local settings APIs |
| Meds | `['meds']`, `['meds:logs:7d']` | Supabase meds tables via med services |
| Sleep | `['dashboard:lastSleep']`, `['sleep:settings']`, `['sleep:sessions:ring']`, `['sleep:sessions:30d']` | HC + sleep DB |
| Health | `['health:integrations:status']` | Health Connect status |
| Recovery / streaks | `['recovery:progress']`, `['streaks']` | derived + local/remote |
| Mood | `['mood:checkins:7d']`, `['mood:checkins:60d']` (+ invalidates `mood:canonical` / local) | mood service |
| Calendar | `['calendar','today']` | device calendar |
| Training glance | `['training:activeProgram']`, `['training:programDays:today',…]`, `['training:sessions']` | training tables |
| Post-onboard hint | AsyncStorage `@reclaim/just_onboarded_hint` `Dashboard.tsx:279–282` | written by completeOnboarding |

Evidence: `Dashboard.tsx` query block ~`251–527`.

### Race / stale / data-loss

- Many long `staleTime`s (1h settings, 12h sleep settings) → UI can lag after settings change until invalidate.
- Pull-to-refresh / insight refresh paths invalidate subsets; partial failure leaves mixed freshness.
- Training tiles share `training:sessions` with Training tab — guided invalidate storms can refetch dashboard training glance.

### Error / offline / restore

- Per-query `retry`/error UI varies by tile; offline shows last React Query cache when present.
- HC unavailable → sleep/recovery empty states (module-dependent).

### Tests

- NONE dedicated to Dashboard screen orchestration.
- Related insight/mood/sleep unit tests exist under `lib/insights`, `lib/mood`, etc. — not end-to-end dashboard.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| D1 | S2 | WRONG-MODEL | ASSERTED | Dashboard aggregates many independent SoTs without a single “home readiness” gate; cold start can show mixed loading/empty tiles (product honesty risk vs onboarding “daily signal” promise). Evidence: multi-query mount `Dashboard.tsx:251+`. |
| D2 | S3 | BUG | ASSERTED | Long staleTimes without guaranteed invalidate on every writer surface → stale tiles after settings/training changes. |

---

## 4. Guided training + TrainingSessionView + FGS + watch/notification actions

### Source-of-truth map

| Concern | Authority |
|---|---|
| Work position / pending sets | DB `performed.sets` + `sessionWorkAuthority` / `buildNotificationWorkChain` |
| Set completion | `applySetCompletion` / `applySetSkip` (UI + Wear/notif via `guidedTrainingNotificationActions`) |
| Session close | `closeTrainingSession` / `finalizeTrainingSessionAndCleanup` |
| Cursor / rest | Session row `phase`, `rest_ends_at`, `current_exercise_index` (+ pending external rest store) |
| Alive transport | Native FGS `guidedSessionFgs.ts` / `startGuidedSessionRuntime` — not Expo sticky |
| Notifications | Intent keys via `trainingNotificationScheduler` → `setIntent` + `reconcileNotifications` |
| React Query | `['training:session', id]` (3s poll while active) `TrainingScreen.tsx:321–328`; list `['training:sessions']`; invalidation from actions `guidedTrainingNotificationActions.ts:67–73` |
| Local durable | AsyncStorage pending-close `@reclaim/training/pending_close_v1`; guided pending rest store; offline queue |

### Race / stale / data-loss

- Auto-resume sets `activeSessionId` from open DB session (`TrainingScreen.tsx:383–400`) while session fetch may still be empty → spinner path.
- Wear Done + phone UI Done can race; soft-claim + issuedAt staleness guard (`guidedTrainingNotificationActions.ts:86–117`).
- Query invalidation after persist can fight 3s refetch / optimistic patches.
- FGS refused if another domain owns BackgroundService or ACTIVITY_RECOGNITION denied (`guidedSessionFgs.ts:104–116`) → guided “alive” silent degrade.
- Minimize leaves FGS running by design (`TrainingSessionView.tsx:430` comment) — good for alive; bad if close fails.

### Error / offline / restore

- Offline set logs enqueue; pending-close marks even when online close fails (`closeTrainingSession.ts`).
- Rest restore from DB cursor + durable external rest drain (`TrainingSessionView.tsx:1520–1561`).
- Last-set notif path auto-finalizes then navigates Training (`guidedTrainingNotificationActions.ts:317–325`).

### Tests

- `guidedTrainingNotificationActions.*.test.ts` (nextSet, stale, persistence)
- `scheduleGuidedTrainingAfterSetPersist*.test.ts`, `scheduleGuidedTrainingNextSetFromDb.test.ts`, `scheduleGuidedTrainingSessionStart.test.ts`
- `guidedSetCompletionCanonical.test.ts`, `guidedPhoneRestTransition.test.ts`, `guidedWearDelivery.simulation.test.ts`
- `applySetCompletion.test.ts`, `closeTrainingSession.test.ts`, `finalizeTrainingSession.test.ts`, `sessionWorkAuthority.test.ts`
- Gap: no device/E2E for FGS ownership conflicts or mid-session AppState reconcile storms.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| G1 | S1 | BUG | VERIFIED | Opening Training with `activeSessionId` and null session data shows blocking spinner (loading loop residual). `TrainingScreen.tsx:1028–1077` |
| G2 | S1 | BUG | VERIFIED | Foreground mid-guided forces reconcile + action-queue drain → duplicate/reordered tiles possible vs FGS rest-end. `useNotifications.ts:734–762` |
| G3 | S2 | BUG | VERIFIED | FGS start can silently fail (permission / foreign owner) while UI still treats session as guided. `guidedSessionFgs.ts:104–145` |
| G4 | S2 | DATA | VERIFIED | Auto-finalize after last Wear Done can fail while pending-close set — user bounced to Training list; reopen risk depends on pending-close scan. `guidedTrainingNotificationActions.ts:317–323` |

---

## 5. Notifications reconciler (`setIntent` + `reconcileNotifications`)

### Source-of-truth map

| Role | Location |
|---|---|
| Intent store | AsyncStorage `@reclaim/notifications/intents` `NotificationIntentStore.ts:11–34` |
| Sole schedule writer (intended) | `NotificationScheduler.scheduleNotification` via `reconcileNotifications` `NotificationScheduler.ts:815–842`, `1089+` |
| Intent writers (many callers) | Training (`trainingNotificationScheduler`), meds, sleep, mood, meditation, wellness, daily signal, settings — all should `setIntent` then reconcile |
| Guided action handler | `guidedTrainingNotificationActions` → `scheduleGuided*` → `scheduleTrainingNow/TimedPrompt` → `setIntent` (+ deferred reconcile) |

### Second writers / invariant flags

| Path | Kind | Status |
|---|---|---|
| `guidedTrainingNotificationActions` bare `scheduleNotificationAsync` | schedule | **CLOSED** — not present; uses setIntent/reconcile |
| `trainingNotificationScheduler.dismissOsNotification` | **cancel** OS id | **OPEN side-path** `trainingNotificationScheduler.ts:56–68` |
| `useNotifications` cleanup past MED_REMINDER | **cancel** | OPEN `useNotifications.ts:821` |
| `useNotifications` cancel helper ~145 | **cancel** | OPEN |
| Reconciler internal cancel/schedule | allowed (authority) | OK `NotificationScheduler.ts:805–1011` |

### Race / stale / data-loss

- Foreground `reconcileWithCooldown(..., true)` + Wear queue drain can overlap in-flight SET_DONE scheduling.
- Intent TTL 7 days (`NotificationIntentStore.ts:12`) — stale intents can resurrect if reconcile runs before clear.
- Dual-path logging comments remain in IntentStore header (historical dual-write docs) — current guided path is intent-first.

### Error / offline / restore

- reconcile failures logged; intents remain → next foreground retry.
- Permission denied → lastPermissionDenied gate; grant triggers `forceRescheduleNotifications` (`useNotifications.ts:741–744`).

### Tests

- `notificationStartupGate.test.ts`
- Guided action tests mock reconcile
- Gap: no invariant test that forbids `scheduleNotificationAsync` outside NotificationScheduler.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| N1 | S1 | BUG | VERIFIED | Mid-guided AppState→active always drains + reconciles — primary mechanism for “erratic notifications when opening app”. `useNotifications.ts:734–762` |
| N2 | S2 | WRONG-MODEL | VERIFIED | Direct OS cancel outside reconcile (`trainingNotificationScheduler.ts:65`) can desync OS vs intent until next reconcile. |
| N3 | S3 | NO-MODEL | ASSERTED | No CI guard against new bare `scheduleNotificationAsync` call sites. |

---

## 6. Training loading loop

### Mechanism (FACT)

1. Open DB session (`started_at && !ended_at` and not pending-close) → `setActiveSessionId` (`TrainingScreen.tsx:370–400`).
2. Render waits for `activeSessionQ.data` (`1002`).
3. If id set but data missing → “Opening session…” spinner with Cancel (`1028–1077`).
4. Historical flash-loop from clearing `dismissedResume` on AppState was mitigated (`379–380`).
5. Wear last-set finalize failure previously resurrected same id into spinner — code now navigates away and relies on pending-close (`guidedTrainingNotificationActions.ts:314–316`).

### Residual loop conditions

- `getTrainingSession` fails/slow with `retry: false` while auto-resume keeps id.
- Pending-close map not ready / miss → zombie open session re-bound every sessions refetch.
- Post-setup 4s loading gate (`495–502`) is separate (“Loading your updated plan…”) — can feel like a loop if invalidate never settles.

### Tests

- NONE for TrainingScreen loading/auto-resume UI.
- Indirect: `closeTrainingSession.test.ts` pending-close; guided finalize tests.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| L1 | S1 | BUG | VERIFIED | Stuck spinner when `activeSessionId` without session payload. `TrainingScreen.tsx:1028–1077` |
| L2 | S2 | BUG | VERIFIED | Auto-resume effect has no timeout/backoff if fetch never returns data. `383–400`, `321–328` |

---

## 7. Stale session timer (945-min runaway, blocks tab nav)

### Mechanism (FACT)

- Elapsed UI = wall clock `now - started_at` (or frozen copy) `TrainingSessionView.tsx:538–567`, `staleSessionGuard.ts:37–45`.
- Stale if started older than threshold **and** no performed set `completedAt` within threshold (`staleSessionGuard.ts:10–34`).
- Production threshold **5 hours** (`sessionUiConstants.ts:7`); `__DEV__` can override via `EXPO_PUBLIC_STALE_SESSION_MINUTES`.
- When stale: `staleResumePrompt='pending'`, timer interval stopped, elapsed frozen; **non-dismissable** Dialog (`TrainingSessionView.tsx:2281–2318`).
- 945 minutes ≈ 15.75h wall time from `started_at` — expected frozen display if session left overnight **or** live display if a set was logged within last 5h (staleness false) while `started_at` is old (“runaway” continues).

### Tab nav block

- Active session replaces Training screen with `TrainingSessionView` (`TrainingScreen.tsx:1002–1024`).
- Portal Dialog `dismissable={false}` overlays UI until Resume / Save & close — **blocks interaction** with the session surface; typically covers app chrome including tabs while dialog visible (**CONFIRMED mechanism**; device confirmation still useful).

### Tests

- `staleSessionGuard.test.ts` — threshold + freshness rules.
- NONE for Portal dialog blocking navigation / 945 display formatting.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| S1 | S1 | WRONG-MODEL | VERIFIED | Elapsed is wall-clock from `started_at`, not active-work time — overnight sessions show hundreds of minutes. `TrainingSessionView.tsx:556–559`, `staleSessionGuard.ts:37–45` |
| S2 | S1 | BUG | VERIFIED | Non-dismissable stale dialog traps user until explicit choice. `TrainingSessionView.tsx:2281–2282` |
| S3 | S2 | BUG | VERIFIED | Recent set activity within 5h disables stale guard → timer keeps climbing from original `started_at` (runaway). `staleSessionGuard.ts:30–32` |

---

## 8. Guided rest + close correctness

### Rest SoT

- Phone/Wear share `computeRestSecondsAfterCompletingSet` → `resolveRestPeriodAfterCompletingSet` (`guidedSetCompletionCanonical.ts:16–29`).
- After persist: `scheduleGuidedTrainingAfterSetPersist` writes now/timed intents + rest seconds (`scheduleGuidedTrainingAfterSetPersist.ts:100–168`).
- UI rest restore: pending external rest store + DB `phase==='rest'` + `rest_ends_at` (`TrainingSessionView.tsx:1520–1561`).
- Stale prompt pending **blocks** cursor rest restore (`1540`) — rest UI may not appear until dialog cleared.

### Close SoT

- `closeTrainingSession`: pending-close first, durable `ended_at`, intent clear, FGS stop, reconcile (`closeTrainingSession.ts`).
- Work-complete vs incomplete UX: Save & close vs Minimize/Finish confirm (`TrainingSessionView.tsx:2200–2274`).

### Residual risks

- Rest restore skipped while stale dialog pending.
- Between-exercise rest depends on `hasNextExercise` option parity — unit tests cover; device parity still needed.
- Close timeout 10s (`CLOSE_PHASE1_TIMEOUT_MS`) → enqueue path; UI may show success/pending mismatch briefly.

### Tests

- Strong unit coverage: guided rest transition, canonical rest, close, finalize, Wear simulation.
- Gap: integration of stale-dialog + rest restore interaction.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| R1 | S2 | BUG | VERIFIED | Rest countdown restore gated off while `staleResumePrompt` unevaluated/pending — mid-overnight resume can miss rest UI. `TrainingSessionView.tsx:1540–1549` |
| R2 | S2 | BUG | ASSERTED | Race: Wear schedules rest intents before UI mounts; AppState reconcile may rewrite tiles before rest store drain. |

---

## 9. 1kg / 5kg weight increment

### Model (FACT — intentional)

`getExerciseIncrementKg` (`exerciseLoadingProfile.ts:289–312`):

- Dumbbell-like → **1**
- Cable/machine → **2.5**
- Barbell-like lower body → **5**; upper → **2.5**
- Fallback / bodyweight-ish → **2.5** / lower **5**

UI:

- `SetFocusCard`: fine step = `getWeightStep`; coarse `bigStep = max(weightStep * 5, 5)` (`SetFocusCard.tsx:86–87`).
- Edit dialog: dumbbell forced to 1 else `getWeightStep` (`TrainingSessionView.tsx:1669–1674`).

### Verdict

Not an accidental off-by-factor bug in source. User-facing “1kg vs 5kg wrong” is either:

1. Expectation mismatch (barbell squat UI steps 5kg), or  
2. Confusion with coarse ± buttons (always ≥5).

### Tests

- `exerciseLoadingProfile.test.ts` expects curl **1**, bench **2.5**.
- `doubleProgression.test.ts` for +2.5/+5 progression reasons (separate from UI stepper).

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| W1 | S3 | WRONG-MODEL | VERIFIED | Barbell lower UI increment is 5kg (progression-sized), which may feel wrong for plate math vs 2.5. `exerciseLoadingProfile.ts:308–310` |
| W2 | S3 | WRONG-MODEL | VERIFIED | Coarse stepper minimum 5kg even when fine step is 1. `SetFocusCard.tsx:87` |

---

## 10. Cardio visibility in gym-shaped training module

### Facts

- Setup UI exposes equipment token **`cardio`** (`TrainingSetupScreen.tsx:74`; allowed in `setupMappings.ts:70`).
- Catalog conditioning exercises do **not** use equipment id `cardio`. Examples: `running` → `treadmill`; `rowing_machine` → `rowing_machine`; `burpees` → `[]` (`exercises.v1.json:230–267`).
- `hasEquipment` matches catalog equipment tokens only (`engine/index.ts:143–168`) — toggling “Cardio equipment” does not unlock treadmill/rower.
- Gym-shaped **muscle/strength** 3-day plan is Push/Pull/Legs with **no conditioning day** (`programPlanner.ts:169–189`). Conditioning day appears for non–muscle/strength 3-day (`204–209`) or special full-body variants.

### Verdict

**CONFIRMED product gap / WRONG-MODEL:** cardio is largely invisible in typical gym (PPL / strength) programs, and the cardio equipment toggle is a dead token relative to catalog.

### Tests

- `setupMappings.test.ts` includes `'cardio'` in valid ids only.
- NONE proving cardio equipment enables rowing/treadmill selection.

### Top defects

| ID | Sev | Class | Status | Defect |
|---|---|---|---|---|
| C1 | S2 | WRONG-MODEL | VERIFIED | Setup `cardio` token never matches catalog equipment (`treadmill` / `rowing_machine`). `TrainingSetupScreen.tsx:74`, `exercises.v1.json:247–261`, `engine/index.ts:143–168` |
| C2 | S2 | NO-MODEL | VERIFIED | Strength-focused PPL omits conditioning template — cardio work absent from gym-shaped week. `programPlanner.ts:169–189` |

---

## Ranked defect register (cross-surface)

| Rank | ID | Sev | Class | Status | Symptom | Root cause (file:line) | Best-path fix direction |
|---|---|---|---|---|---|---|---|
| 1 | O1/A1 | S1 | BUG | VERIFIED | Login → onboarding/Welcome | 6s timeout fail-safe `'no'` `RootNavigator.tsx:237–290` | Hold splash + retry/backoff; only route onboarding on definitive remote `false` or explicit local incomplete; never timeout→Welcome for existing accounts |
| 2 | L1 | S1 | BUG | VERIFIED | Training loading spinner loop | `activeSessionId` without data `TrainingScreen.tsx:1028–1077` | Fail closed: timeout fetch → clear id / show error; never auto-bind without successful payload |
| 3 | S1/S2 | S1 | WRONG-MODEL | VERIFIED | 945-min timer + blocked UI | Wall-clock elapsed + non-dismissable dialog `TrainingSessionView.tsx:538–567`, `2281–2282` | Separate active-work elapsed from wall age; soft banner instead of modal trap; allow tab switch |
| 4 | N1/G2 | S1 | BUG | VERIFIED | Erratic notifs opening mid-guided | Forced foreground reconcile + drain `useNotifications.ts:734–762` | Guided-aware reconcile: skip/force only intent diffs; serialize drain vs FGS rest-end |
| 5 | C1/C2 | S2 | WRONG-MODEL | VERIFIED | Cardio missing in gym module | Dead `cardio` token + PPL omits conditioning `programPlanner.ts:169–189`, setup/catalog mismatch | Map cardio → treadmill/rower/etc. or replace toggle; include optional conditioning in gym splits |
| 6 | R1 | S2 | BUG | VERIFIED | Rest/close edge on resume | Rest restore blocked by stale prompt `TrainingSessionView.tsx:1540` | Restore rest independently of stale dialog; dialog only pauses work clock |
| 7 | G3 | S2 | BUG | VERIFIED | Guided alive without FGS | FGS refuse paths `guidedSessionFgs.ts:104–116` | Surface failure in UI; fallback policy explicit |
| 8 | N2 | S2 | WRONG-MODEL | VERIFIED | OS cancel side-path | `trainingNotificationScheduler.ts:65` | Route dismiss through intent clear + reconcile only |
| 9 | W1/W2 | S3 | WRONG-MODEL | VERIFIED | 1kg/5kg feels wrong | Intentional increments `exerciseLoadingProfile.ts:289–312` | Split UI plate step from progression step; label coarse buttons |
| 10 | D1 | S2 | WRONG-MODEL | ASSERTED | Dashboard honesty / mixed empty | Multi-query mount without readiness gate `Dashboard.tsx:251+` | Single home readiness / skeleton contract |

### Rejected thin alternatives

- “Bump onboard timeout to 30s” — **REJECT**: still fails offline; wrong fail-safe polarity.
- “Clear `activeSessionId` on any spinner” without pending-close — **REJECT**: drops legitimate slow loads; must distinguish zombie vs slow.
- “Cap displayed timer at 99:59” — **REJECT**: hides wall-clock model; does not fix tab trap or stale policy.
- “Disable foreground reconcile” globally — **REJECT**: breaks meds/permission recovery; needs guided-scoped policy.
- “Add more cardio substitutionTags” — **REJECT**: equipment gate never sees tags; fix token mapping / planner.

### Fixed workflow (target world)

1. Auth restores session → onboard resolves with local-or-remote-true without timeout dumping to Welcome.  
2. Training opens only after session payload loads; zombies pending-close never bind.  
3. Guided mid-session foreground reconciles without reshuffling live rest/set tiles.  
4. Overnight session shows honest age + soft resume; tabs remain usable; elapsed reflects work or clearly labeled wall time.  
5. Rest restores even when resume prompt is showing; close always clears intents + FGS.  
6. Gym setup cardio maps to real equipment; optional conditioning appears in gym weeks when selected.  
7. Weight steppers match plate reality; progression deltas remain separate.

---

## Files inspected (material)

`RootNavigator.tsx`, `useStartupGate.ts`, `onboarding.ts`, `onboardingProgress.ts`, `onboardingService.ts`, `OnboardingNavigator.tsx`, `supabase.ts`, `AuthProvider.tsx`, `authSessionService.ts`, `Dashboard.tsx` (query keys), `TrainingScreen.tsx`, `TrainingSessionView.tsx`, `staleSessionGuard.ts`, `sessionUiConstants.ts`, `guidedTrainingNotificationActions.ts`, `trainingNotificationScheduler.ts`, `NotificationIntentStore.ts`, `NotificationScheduler.ts` (schedule site), `useNotifications.ts`, `scheduleGuidedTrainingAfterSetPersist.ts`, `guidedSetCompletionCanonical.ts`, `closeTrainingSession.ts`, `guidedSessionFgs.ts`, `exerciseLoadingProfile.ts`, `progression.ts`, `SetFocusCard.tsx`, `programPlanner.ts`, `setupMappings.ts`, `TrainingSetupScreen.tsx`, `exercises.v1.json` (cardio/conditioning samples), `engine/index.ts` (`hasEquipment`).

## Explicitly not done

- Device reproduction / EAS build smoke  
- Product source fixes  
- Commit / push  
- Parallel surfaces outside this agent’s list  

## Next step recommendation

Stay on **same chat** only if implementing O1/L1/S1 next; otherwise start a **fresh chat** for fix implementation with this file as the pin (`docs/eif/drafts/APP_AUDIT_CORE.md`) to avoid audit-context bloat.
