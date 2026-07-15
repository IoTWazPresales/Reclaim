# UI Excellence Remediation Log

**Branch:** `chore/reclaim-uiux-audit-pilot` (or remediation feature branch)  
**Audit authority:** `docs/audits/ui-audit-master.md` + batch files 1–4  
**Started:** 2026-07-15

---

## Phase summary

| Phase | Status | Commit | Notes |
|-------|--------|--------|-------|
| 0 — Dark theme (X-07) | Done (evidence-only) | `f6612f8` | Verdict **(a)** — follows system; dark renders correctly |
| 1 — Copy & truncation | Done | _pending_ | X-11 deferred (dual-source week math) |
| 2 — Accessibility | Pending | — | |
| 3 — Reduced motion | Pending | — | |
| 4 — Layout authority | Pending | — | |
| 5 — Shell IA | Pending | — | |
| 6 — Session-complete UI | Pending | — | |
| 7 — Stale-session guard | Pending | — | Requires `stale-session-audit.md` first |
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

---

## Final completion matrix

_Append after Phase 8 — every finding ID from the remediation prompt with status: fixed / evidence-only / stopped-and-reported / deferred-by-design._

| Finding ID | Status | Phase | Notes |
|------------|--------|-------|-------|
| | | | |

### Deliberately not touched

_List anything discovered during implementation that was left unchanged and why._
