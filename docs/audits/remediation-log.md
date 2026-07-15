# UI Excellence Remediation Log

**Branch:** `chore/reclaim-uiux-audit-pilot` (or remediation feature branch)  
**Audit authority:** `docs/audits/ui-audit-master.md` + batch files 1–4  
**Started:** 2026-07-15

---

## Phase summary

| Phase | Status | Commit | Notes |
|-------|--------|--------|-------|
| 0 — Dark theme (X-07) | Done (evidence-only) | `2e9bf85` | Verdict **(a)** — follows system; dark renders correctly |
| 1 — Copy & truncation | Pending | — | |
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

---

## Final completion matrix

_Append after Phase 8 — every finding ID from the remediation prompt with status: fixed / evidence-only / stopped-and-reported / deferred-by-design._

| Finding ID | Status | Phase | Notes |
|------------|--------|-------|-------|
| | | | |

### Deliberately not touched

_List anything discovered during implementation that was left unchanged and why._
