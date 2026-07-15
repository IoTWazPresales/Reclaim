# UI Excellence Remediation Log

**Branch:** `chore/reclaim-uiux-audit-pilot` (or remediation feature branch)  
**Audit authority:** `docs/audits/ui-audit-master.md` + batch files 1–4  
**Started:** 2026-07-15

---

## Phase summary

| Phase | Status | Commit | Notes |
|-------|--------|--------|-------|
| 0 — Dark theme (X-07) | Done (evidence-only) | `f6612f8` | Verdict **(a)** — follows system; dark renders correctly |
| 1 — Copy & truncation | Done | `cb9bede` | X-11 deferred (dual-source week math) |
| 2 — Accessibility | Done | `f52bd99` | TalkBack code review; emulator TalkBack not enabled |
| 3 — Reduced motion | Done | `dfbc96f` | |
| 4 — Layout authority | Done | `24bd86a` | Session inset uses TAB_BAR + section gaps |
| 5 — Shell IA | Done | `a1f82a7` | |
| 6 — Session-complete UI | Done | `533bd47` | |
| 7 — Stale-session guard | Done | `acf57c0` | See `stale-session-audit.md` |
| 8 — Cold-start audit (X-26) | Done (diagnosis + follow-up fix) | `a40d053` + uncommitted gate fix | Diagnosis in `cold-start-audit.md`; splash no longer awaits reconcile |

---

## Per-phase detail

_Each phase adds a subsection below: finding IDs addressed, files changed, evidence filenames, validation run._

### Phase 0 — Dark theme verification (X-07)

**Verdict: (a)** App follows system theme and dark renders correctly. No app code changes.

#### Theme resolution path (source)

| Symbol / file | Role |
|---------------|------|
| `AppThemeProvider` (`app/src/theme/AppThemeProvider.tsx`) | Reads `useColorScheme()` + `settings.appearanceMode` via React Query; wraps `PaperProvider` |
| `resolveAppTheme` (`app/src/theme/resolveAppTheme.ts`) | `appearanceMode ?? 'system'` → light/dark/system; system uses OS scheme |
| `DEFAULT_SETTINGS.appearanceMode` (`app/src/lib/userSettings.ts`) | Default `'system'` |
| `SettingsScreen` Appearance control | User can force System / Light / Dark |

Audit captures were light because the emulator had `cmd uimode night` = **no** (light), not because the app hardcodes light.

#### Emulator procedure

1. `adb shell "cmd uimode night yes"` → Night mode: yes
2. Force-stop + `am start -a VIEW -d reclaim://home` (and training / meds)
3. Captured Dashboard, Training Today, TrainingSessionView (after Start session), MedsHome
4. Cancelled in-progress session (cleanup)
5. `adb shell "cmd uimode night auto"` → restored

#### Finding table

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| X-07 | evidence-only — verified (a) | none (no app code) | `fix-p0-dark-dashboard.png`, `fix-p0-dark-training.png`, `fix-p0-dark-training-session.png`, `fix-p0-dark-meds.png` |

#### Validation

- Visual: all four captures show dark navy surfaces, light text, teal accents — dark theme intact (not partial/broken).
- No typecheck required (no app code).
- Trivial single-point fix: **not applicable** — resolution path already correct.

#### Not done (by design)

- No broad dark-theme styling pass.
- Did not change `appearanceMode` defaults or Settings UI.

### Phase 1 — Copy & truncation

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B4-N-01 / B4-N-02 | fixed | `NotificationsScreen.tsx`, `nav.ts` | `fix-p1-notifications.png` |
| B3-Mo-01 / B3-Mo-02 | fixed | `ReclaimMomentsScreen.tsx` | `fix-p1-moments.png` |
| X-12 / B1-T-05 | fixed | `pluralize.ts`, `SessionDetailModal.tsx`, `TrainingHistoryView.tsx` | `fix-p1-history.png` |
| B1-S-03 | fixed | `TrainingSessionView.tsx` (ellipsize + a11yLabel already full text) | `fix-p1-session-pill.png` |
| B4-P-01 / B4-P-03 | fixed | `DataPrivacyScreen.tsx` (`descriptionNumberOfLines={0}`) | `fix-p1-privacy-1.0.png`, `fix-p1-privacy-1.3.png` |
| X-13 | fixed | `InsightCard.tsx` (2-line CTA, minHeight 48) | code + typecheck |
| B1-T-07 | fixed | `SessionPreviewModal.tsx` (stacked Weekly sets) | code |
| X-11 | stopped-and-reported | `TrainingScreen.tsx` — no label patch | see below |

#### X-11 week label (not patched)

Next Session uses `programDay.week_index` (`TrainingScreen` ~1196). This Week header uses calendar math from `activeProgram.start_date` (`weekNumber` ~844). These are **two authoritative computations**, not a display-format bug. Left for engineering review — do not unify labels without deciding which source owns “week N”.

#### Validation

- `npm run typecheck` (app/) — pass
- Emulator captures taken against APK build 8 (predates Phase 1 source). Visual confirm of copy fixes requires a rebuild; code changes are typechecked.

### Phase 2 — Accessibility labels, roles, targets

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B4-Dr-02 | fixed | `AppNavigator.tsx` Tile Pressable | code review |
| B1-D-04 | fixed | `DashboardPrimaryAction.tsx`, `DashboardToday.tsx` IntentActionRow | code review |
| B1-S-05 | fixed | `FullSessionPanel.tsx` | code review |
| B1-S-06 | fixed | `SetFocusCard.tsx`, `TrainingSessionView` EditSetDialog hitSlop | code review |
| B1-T-05 (tabs) | fixed | `TrainingScreen.tsx` Today/History | code review |
| B3-O-05 | fixed | `MoodCheckinScreen.tsx` | code review |
| B3-O-06 | fixed | `CapabilitiesScreen.tsx` AnimatedDot tabs | code review |

#### Validation

- `npm run typecheck` — pass
- TalkBack via adb: **not enabled** (stability); verified via code review per phase gate allowance.

### Phase 3 — Reduced-motion parity

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B1-D-02 | fixed | `DashboardThirtyDayArc.tsx` — reduceMotion skips sparkles | code |
| B1-D-05 | fixed | `Dashboard.tsx` → `useReducedMotion`; `HomeDashboardTile` press springs gated | code |
| B1-S-07 | fixed | `SetFocusOverlay` / `EditSetDialog` `animationType` none when reduceMotion | code |
| X-16 | fixed | `MoodHero.tsx`, `MedsHero.tsx` match SleepHero pattern | code |

#### Validation

- `npm run typecheck` — pass
- APK predates source; reduce-motion visual confirm needs rebuild / animator duration scale 0.

### Phase 4 — Layout authority migration

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| X-17 | fixed | AuthScreen, Welcome, MoodCheckin, Capabilities — RECLAIM_SCREEN_* insets | code |
| X-24 / B4-Ab-01 / B4-P-02 | fixed | AboutScreen, DataPrivacyScreen → `reclaimStandardScreenScroll` | code |
| B1-D-06 | fixed | Dashboard `tileRowGap` → `RECLAIM_SCREEN_SECTION_GAP` (no DASHBOARD_SECTION_GAP exists) | code |
| B1-S-04 | fixed | TrainingSessionView paddingBottom = TAB_BAR_INSET + insets + section gaps | code; APK rebuild needed for visual |

#### Validation

- `npm run typecheck` — pass
- Session Done clearance: constants-based (140 + insets + 16/64); full emulator verify needs rebuild.

### Phase 5 — Shell IA

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B4-Dr-01 / X-23 | fixed | AppNavigator Support → `openSection: 'support'` | code |
| B4-Dr-03 / X-09 | fixed | Drawer/title Exercise → Training (routes unchanged) | code |
| B1-D-01 | fixed | LifecycleHero Mood chip z-order / padding (not HomeDashboardTile) | code |

### Phase 6 — Session-complete UI

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B1-S-02 / X-10 | fixed | TrainingSessionView complete summary card | code |
| B1-S-08 | fixed | Finish confirm dialog; Minimize separated | code |

#### Validation

- Presentation-only; `handleComplete` path unchanged behind confirm.
- Typecheck required before commit.

### Phase 7 — Stale-session guard (B1-S-01)

**Part A first:** `docs/audits/stale-session-audit.md` (written before any app code).

| Finding ID | Status | Files | Evidence |
|------------|--------|-------|----------|
| B1-S-01 | fixed (code) | `sessionUiConstants.ts`, `staleSessionGuard.ts`, `TrainingSessionView.tsx` | pending device capture |

#### Behavior

- On session-view mount: if `started_at` older than 6h **and** no set `completedAt` within window → Paper Dialog “Resume this session?”; elapsed clock **frozen** (no `setInterval`) until choice.
- **Resume** → clear guard → existing live wall-clock timer.
- **Discard** → `handleComplete` → `finalizeTrainingSessionAndCleanup` (same as Finish; no new termination).
- Constants: `app/src/lib/training/sessionUiConstants.ts` (`STALE_SESSION_HOURS = 6`).
- DEV simulate: `EXPO_PUBLIC_STALE_SESSION_MINUTES` (positive number) overrides threshold to minutes; unset → 6h.
- Log: `[STALE_SESSION] guard triggered…`
- **Not touched:** `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority` internals, notification reconciler.

#### Validation

- `npm run typecheck` — pass
- `npx vitest run src/lib/training/__tests__/staleSessionGuard.test.ts` — pass

### Phase 8 — Cold-start audit (X-26)

**Diagnosis only.** Full write-up: `docs/audits/cold-start-audit.md`. **No startup-gate code changes.**

| Finding ID | Status | Evidence |
|------------|--------|----------|
| X-26 | evidence-only (diagnosed) | `cold-start-audit.md` + logcat/screencaps under `docs/audits/evidence/` if present |

#### Key measured numbers (emulator-5554, APK 1.0.3/build8)

- START → `Running "main"`: **2.2–3.4 s**
- UI “Notification setup…” through **10 s**; Home by **12 s**
- GESTURE HANDLER (first RN surface proxy): **~12–14 s**
- `ENTRY_CHAIN` / `STARTUP_GATE` in logcat: **0** (release `__DEV__` strips `logger.debug`)

#### Dominant contributor

Splash holds on notifications phase awaiting `reconcileNotifications()` (permission already granted).

#### Explicit

Do **not** implement the fix in this phase. Preferred later fix: await permission only; reconcile in background.

---

## Final completion matrix

Every finding ID from the remediation prompt Phases 0–8:

| Finding ID | Status | Phase | Notes |
|------------|--------|-------|-------|
| X-07 | evidence-only | 0 | Verdict (a) — follows system; dark OK |
| B4-N-01 | fixed | 1 | Quiet-hours copy + Settings deep link |
| B4-N-02 | fixed | 1 | Deep link via `navigateToSettings({ openSection: 'notifications' })` |
| B3-Mo-01 | fixed | 1 | Removed duplicate list header title |
| B3-Mo-02 | fixed | 1 | Removed duplicate card date header |
| X-12 | fixed | 1 | `pluralize` helper |
| B1-S-03 | fixed | 1 | Pill ellipsize + full a11yLabel |
| B4-P-01 | fixed | 1 | Export description wrap |
| B4-P-03 | fixed | 1 | `descriptionNumberOfLines={0}` |
| X-13 | fixed | 1 | InsightCard 2-line CTA |
| B1-T-07 | fixed | 1 | Weekly sets stacked layout |
| X-11 | stopped-and-reported | 1 | Dual week sources — no label patch |
| B4-Dr-02 | fixed | 2 | Drawer tile a11y |
| B1-D-04 | fixed | 2 | Dashboard CTA / intent labels |
| B1-S-05 | fixed | 2 | FullSessionPanel row labels |
| B1-S-06 | fixed | 2 | Stepper hitSlop + labels |
| B1-T-05 | fixed | 2 | Today/History tab roles |
| B3-O-05 | fixed | 2 | Onboarding mood chips |
| B3-O-06 | fixed | 2 | Carousel slide dots |
| B1-D-02 | fixed | 3 | ThirtyDayArc reduceMotion |
| B1-D-05 | fixed | 3 | Dashboard/tile reduceMotion unify |
| B1-S-07 | fixed | 3 | Session overlay animation gated |
| X-16 | fixed | 3 | Mood/Meds heroes gated |
| X-17 | fixed | 4 | Auth/onboarding layout constants |
| X-24 | fixed | 4 | About/Privacy scroll authority |
| B4-Ab-01 | fixed | 4 | About scroll |
| B4-P-02 | fixed | 4 | Privacy scroll |
| B1-D-06 | fixed | 4 | tileRowGap → SECTION_GAP |
| B1-S-04 | fixed | 4 | Session bottom inset constants |
| B4-Dr-01 | fixed | 5 | Support → openSection support |
| X-23 | fixed | 5 | same |
| B4-Dr-03 | fixed | 5 | Exercise → Training copy |
| X-09 | fixed | 5 | same |
| B1-D-01 | fixed | 5 | LifecycleHero Mood chip overlap |
| B1-S-02 | fixed | 6 | Session-complete summary |
| X-10 | fixed | 6 | same |
| B1-S-08 | fixed | 6 | Finish confirm + separate Minimize |
| B1-S-01 | fixed | 7 | Stale-session Resume/Discard |
| X-26 | **fixed (follow-up)** | 8→fix | Splash awaits permission only; `reconcileNotifications` backgrounded; splash bar polish |

### Deliberately not touched

- `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority` internals, notification reconciler (`setIntent` / `reconcileNotifications`) internals
- X-11 week label unification (dual authoritative sources)
- Startup-gate / cold-start fix (Phase 8 diagnosis only)
- Broad dark-theme styling pass (Phase 0 verified OK)
- Remaining onboarding screens still on `padding: 24` outside Phase 4 file list
- `CONTEXT.md` local edits left uncommitted
- Audit batch markdown / bulk evidence PNGs from audit pass (still untracked except phase fix-*.png)

---

## Post-remediation device QA (2026-07-15)

**Branch:** `chore/reclaim-uiux-audit-pilot` @ `f0cac28` (pulled; remediations through `a40d053`)  
**Build under test:** local `expo run:android --variant release` → `releases/reclaim-release-ui-remediation-f0cac28.apk` (debug-signed; embeds remediation JS). Not an EAS `preview` cloud artifact.  
**Device:** emulator-5554 · package `com.fissioncorporation.reclaim`  
**Auth:** Google OAuth re-login required after signature change (EAS preview → local debug keystore).  
**Evidence prefix:** `docs/audits/evidence/qa-*.png`

### Smoke checklist results

| Checklist item | Result | Evidence | Notes |
|----------------|--------|----------|-------|
| Dark mode (Dashboard / Training / Meds) | **PASS** | `qa-dark-dashboard.png`, `qa-dark-training.png`, `qa-dark-meds.png` | System night mode; navy surfaces + teal accents |
| Dark mode (Session active) | **BLOCKED** | — | Could not enter session via adb tap (Start no-ops; see below) |
| Notifications → Settings deep link | **PASS** | `qa-notifications.png`, `qa-notifications-deeplink.png` | Quiet-hours copy + CTA; lands Settings with Notifications section expanded |
| Moments (no duplicate title/date) | **PASS** | `qa-moments.png` | Single header “Reclaim moments”; timeline date column only (no duplicate card date header) |
| History pluralization | **PASS** | `qa-history.png` | `1 exercise • 1 set` / `8 exercises • 20 sets` etc. |
| Session Finish confirm + complete summary | **BLOCKED** | `qa-session-preview.png` (still Training Today) | adb taps on Start button bounds do not open `SessionPreviewModal`; Finish/complete UI not device-verified this run |
| Stale Resume/Discard | **BLOCKED** | — | Release build: `__DEV__` false → `EXPO_PUBLIC_STALE_SESSION_MINUTES` ignored (by design). Needs DEV client for 1-minute simulate. Phase 7 unit tests remain authority |
| Drawer Support → Settings support | **PARTIAL** | `qa-drawer.png`, `qa-support-settings.png` | Drawer shows **Support** tile + **Training** (not Exercise). adb could not activate Support tile press; Settings Support & Feedback section verified via `reclaim://settings` (`qa-settings.png` / `qa-support-settings.png`). Code path: `goSettingsSupport` → `openSection: 'support'` |
| Training labels | **PASS** | `qa-dark-training.png`, `qa-history.png`, `qa-drawer.png` | Title/tabs/drawer say Training; no user-facing Exercise |

### Observed (not fixed — deferred)

- **X-11 still visible on device:** Next Session `Week 3` vs This Week `Week 2` (`qa-dark-training.png`). Left for engineering decision.
- **X-26** not re-measured; fix still deferred.

### Build / automation notes

- Local release APK install wiped prior EAS-signed session (different signing cert).
- Start button is clickable in UIAutomator (`bounds≈[87,869][993,993]`) but presses do not open preview — likely RN touch / overlay / silent early-return in `handleDayPress` (profile/program gate or in-progress path). Manual tap on emulator recommended for Finish/complete + Support tile.
- Stale-session visual QA requires `__DEV__` build + `EXPO_PUBLIC_STALE_SESSION_MINUTES=1`.

### Explicitly not started

- X-11 week-label unification
- X-26 cold-start fix
