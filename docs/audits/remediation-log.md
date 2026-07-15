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
| 7 — Stale-session guard | Done | _pending_ | See `stale-session-audit.md` |
| 8 — Cold-start audit (X-26) | Pending | — | Diagnosis only |

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

---

## Final completion matrix

_Append after Phase 8 — every finding ID from the remediation prompt with status: fixed / evidence-only / stopped-and-reported / deferred-by-design._

| Finding ID | Status | Phase | Notes |
|------------|--------|-------|-------|
| | | | |

### Deliberately not touched

_List anything discovered during implementation that was left unchanged and why._
