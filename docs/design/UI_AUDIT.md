# UI audit — Reclaim (A5)

**Recorded:** 2026-09-19  
**Repo:** `C:\Reclaim`  
**Branch:** `fix/training-confident-ux`  
**Evidence class:** source enumeration **VERIFIED**; A2 dumpsys **VERIFIED** (1.0.5 / vc15 / DEBUGGABLE / Metro). Authenticated-screen visual scores **UNABLE_TO_VERIFY** (fresh install, no session). Auth visual: **VERIFIED** below.

**A2 Auth (adb, dark-theme request):** AuthScreen is **light**, not dark. Expo snackbar “Looks like you have configured linking in multiple…” covers the bottom of the form. Gesture vs 3-button captured.

| Nav | Path |
|---|---|
| Gesture | `docs/design/screenshots/a2-auth-gesture-resting.png` |
| 3-button | `docs/design/screenshots/a2-auth-3button-resting.png` |
| Overlay (dev menu, proves 1.0.5) | `docs/design/screenshots/a2-auth-3button.png` |

Design Lab (`__DEV__` drawer route) holds three directions; screenshots of those mocks go to `docs/design/directions/<name>/` after the debug client is installed.

The inventory below is the AS-IS surface list used for Stage B inset/UI nodes.

---

Status key (bottom inset):

| Status | Meaning |
|--------|---------|
| **LIVE** | `useSafeAreaInsets()` (or equivalent) drives bottom chrome / scroll clearance |
| **FUDGE** | `RECLAIM_SCREEN_TAB_BAR_INSET` (140) or other hardcoded bottom pad |
| **NONE** | Bottom-anchored chrome with no system-inset padding |
| **N/A** | No bottom-anchored page chrome (centered modal / redirect / scroll-only with no sticky CTA) |

TalkBack / 48dp columns are **samples from source**, not exhaustive audits. Visual scoring deferred.

---

## 0. Theme & layout tokens (reference)

| Artifact | Path | Notes |
|----------|------|-------|
| Screen layout tokens | `app/src/theme/reclaimScreenLayout.ts` | `RECLAIM_SCREEN_HORIZONTAL=16`, `RECLAIM_SCREEN_SECTION_GAP=16`, `RECLAIM_TAB_BAR_BODY_HEIGHT=64`, `RECLAIM_SCROLL_ABOVE_TAB_GAP=16`, **`RECLAIM_SCREEN_TAB_BAR_INSET=140`** (static fudge), `reclaimLiveTabBarScrollInset(insetsBottom)`, `reclaimHeroBleedScroll`, `reclaimStandardScreenScroll`, `reclaimBelowHeroContent`, `reclaimSectionSpacing` |
| MD3 Paper themes | `app/src/theme/appThemes.ts` | Extends `MD3LightTheme` / `MD3DarkTheme`; Binaxis primary; `roundness: 14`; custom `spacing` / `borderRadius` / `typography`; `withReclaimFonts` |
| Theme hook | `app/src/theme/index.ts` | `useAppTheme()` → Paper theme cast to `AppTheme` |
| AppScreen wrapper | `app/src/components/ui/AppScreen.tsx` | **LIVE** default bottom via `reclaimLiveTabBarScrollInset(insets.bottom)` |
| PHASE_3 remaining 140 list | `docs/eif-bootstrap/PHASE_3.md` § “Drawer / stack screens using the 140 fudge” | Matches enumeration below for scroll fudge surfaces |

---

## 1. Navigator map

```text
RootNavigator (native stack)
├── Auth                    → AuthScreen
├── Onboarding              → OnboardingNavigator (native stack)
│   ├── Welcome             → WelcomeScreen
│   ├── Capabilities        → CapabilitiesScreen
│   ├── MoodCheckin         → MoodCheckinScreen
│   ├── Reset               → ResetScreen
│   ├── Meds                → MedsStepScreen
│   ├── Sleep               → SleepStepScreen
│   └── Finish              → FinishScreen
└── App                     → AppNavigator (drawer)
    ├── HomeTabs            → TabsNavigator (bottom tabs)
    │   ├── Home            → Dashboard
    │   ├── Analytics       → AnalyticsScreen
    │   └── Settings        → SettingsScreen
    ├── Sleep               → SleepScreen
    ├── Mood                → MoodScreen
    ├── Meds                → MedsStack (native stack)
    │   ├── MedsHome        → MedsScreen
    │   └── MedDetails      → MedDetailsScreen (redirect → MedsHome expand)
    ├── Training            → TrainingScreen
    │   ├── (host) TrainingSetupScreen
    │   ├── (host) TrainingSessionView
    │   └── (host) TrainingAnalyticsScreen
    ├── Mindfulness         → MindfulnessScreen
    ├── Meditation          → MeditationScreen
    ├── Integrations        → IntegrationsScreen
    ├── Notifications       → NotificationsScreen
    ├── About               → AboutScreen
    ├── DataPrivacy         → DataPrivacyScreen
    ├── ReclaimMoments      → ReclaimMomentsScreen
    ├── Diagnostics         → DiagnosticsScreen (non-production only)
    ├── GuidedTraceViewer   → GuidedTraceViewerScreen (guided-dev only)
    └── EvidenceNotes       → EvidenceNotesScreen (hidden drawer item)
```

| Navigator | File | Type | Route names |
|-----------|------|------|-------------|
| Root | `app/src/routing/RootNavigator.tsx:59–607` | Native stack | `Auth`, `Onboarding`, `App` |
| Onboarding | `app/src/routing/OnboardingNavigator.tsx:26–71` | Native stack | `Welcome`, `Capabilities`, `MoodCheckin`, `Reset`, `Meds`, `Sleep`, `Finish` |
| App drawer | `app/src/routing/AppNavigator.tsx:38–539` | Drawer | `HomeTabs`, `Sleep`, `Mood`, `Meds`, `Training`, `Mindfulness`, `Meditation`, `Integrations`, `Notifications`, `About`, `DataPrivacy`, `ReclaimMoments`, `Diagnostics?`, `GuidedTraceViewer?`, `EvidenceNotes` |
| Tabs | `app/src/routing/TabsNavigator.tsx:17–86` | Bottom tabs | `Home`, `Analytics`, `Settings` |
| Meds stack | `app/src/routing/MedsStack.tsx:24–66` | Native stack | `MedsHome`, `MedDetails` |

Param types: `app/src/navigation/types.ts`.

**Orphan / unregistered screen file:** `app/src/screens/SignalGraphScreen.tsx` — not in any navigator (grep: definition only). Still inventoried as dormant surface.

---

## 2. Routed screens inventory

Visual score column: **UNABLE_TO_VERIFY** for all.

### 2.1 Root / auth / onboarding

| Surface | Route / host | Bottom chrome | Inset | Empty / loading / error | TalkBack (sample) | 48dp risk (sample) | Spacing |
|---------|--------------|---------------|-------|---------------------------|-------------------|--------------------|---------|
| Splash overlay | `RootNavigator.tsx:615–688` | Centered logo + progress | **N/A** | Loading bar + splash message | No a11y on splash chrome | N/A | Ad-hoc StyleSheet |
| Startup disclaimer | `StartupSplashDisclaimer` via `RootNavigator.tsx:692–698` | Centered RN Modal card | **N/A** | N/A (gate) | Button text only (typical) | Full-width CTAs likely OK | Ad-hoc `padding: 24` |
| Auth | `Auth` → `AuthScreen.tsx` | Submit in ScrollView | **NONE** (tokens for H/top only; no bottom inset) | Inline `loading` button labels; Alert errors | Sparse / none found on primary fields | Buttons Paper default | **Tokens** H+top (`RECLAIM_SCREEN_*`); no 140 |
| Onboarding load | `OnboardingNavigator.tsx:50–55` | Centered spinner | **N/A** | Loading: `ActivityIndicator` + `accessibilityLabel="Loading setup"` | Label present | N/A | Ad-hoc |
| Welcome | `Welcome` → `WelcomeScreen.tsx` | In-flow Continue | **NONE** | Minimal | Some labels | In-flow buttons | **Tokens** H+top |
| Capabilities | `Capabilities` → `CapabilitiesScreen.tsx` | In-flow Continue | **NONE** | — | Multiple labels (~8) | — | **Tokens** H+top |
| MoodCheckin | `MoodCheckin` → `MoodCheckinScreen.tsx` | In-flow Save | **NONE** | — | Labels present | — | **Tokens** H+top |
| Reset | `Reset` → `ResetScreen.tsx` | In-flow | **NONE** | — | Labels present | — | Check file (likely ad-hoc / tokens mix) |
| Meds step | `Meds` → `MedsStepScreen.tsx` | Save button | **NONE** | Alert on save error; `loading={saving}` | Sparse | — | Ad-hoc / Paper |
| Sleep step | `Sleep` → `SleepStepScreen.tsx` | Continue | **NONE** | Inline error text | Labels | — | Ad-hoc / Paper |
| Finish | `Finish` → `FinishScreen.tsx` | Finish CTA | **NONE** | Insight loading / error UI | Label present | — | Ad-hoc |

### 2.2 Tabs

| Surface | Route / host | Bottom chrome | Inset | Empty / loading / error | TalkBack (sample) | 48dp risk (sample) | Spacing |
|---------|--------------|---------------|-------|---------------------------|-------------------|--------------------|---------|
| Tab bar | `TabsNavigator.tsx:50–58` | Icons + labels | **LIVE** `height: 64+insets.bottom`, `paddingBottom: insets.bottom` | N/A | Menu `accessibilityLabel="Open navigation menu"` | Header `IconButton` size 24 (Paper default hit target + margin) | Token `RECLAIM_TAB_BAR_BODY_HEIGHT` |
| Home / Dashboard | `Home` → `Dashboard.tsx` (~2548) | Scroll only; FAB imported but schedule uses overlay host | **FUDGE** `reclaimHeroBleedScroll` → 140 | Tile empty copy; query loading strings; snackbar | Strong on tiles / recovery / today (~many labels) | Tile pressables — visual UNABLE | **Tokens** hero bleed + section |
| Analytics | `Analytics` → `AnalyticsScreen.tsx` | `<AppScreen>` scroll | **LIVE** via AppScreen | “Coming soon” overlay (not data empty) | `accessibilityRole="summary"` + label | N/A (gated overlay) | **AppScreen** + visual language cards |
| Settings | `Settings` → `SettingsScreen.tsx` (~672) | Scroll; feedback Portal modal | **FUDGE** `reclaimStandardScreenScroll` → 140 | Section expand; recovery modal | Good Switch/section labels | Expand rows — UNABLE | **Tokens** standard scroll + section |

### 2.3 Drawer screens

| Surface | Route / host | Bottom chrome | Inset | Empty / loading / error | TalkBack (sample) | 48dp risk (sample) | Spacing |
|---------|--------------|---------------|-------|---------------------------|-------------------|--------------------|---------|
| Drawer chrome | `AppNavigator.tsx` CustomDrawerContent ~389 | Tile list `paddingBottom: 18` | **NONE** | N/A | Tile labels + menu IconButton a11y | Drawer tiles Pressable — UNABLE | Ad-hoc drawer padding |
| Sleep | `Sleep` → `SleepScreen.tsx` (~1825) | Hero scroll; import Portal modal | **FUDGE** `reclaimHeroBleedScroll` | History empty; ActivityIndicator; provider copy | Many labels (~18) | — | **Tokens** hero |
| Mood | `Mood` → `MoodScreen.tsx` (~1011) | Hero scroll; history Portal card | **FUDGE** hero 140 | “No history yet”; insight loading/error; check-in empty | Labels (~13) | — | **Tokens** hero |
| Meds home | `MedsHome` → `MedsScreen.tsx` (~791) | Hero scroll; **history bottom sheet** | Scroll **FUDGE** 140; sheet **NONE** `paddingBottom: 32` (`:1483`) | Loading / “No medications yet” / dose empty titles | Labels (~16); history close labeled | History/list `IconButton` **size={18}** — likely &lt;48dp without hitSlop | **Tokens** hero; sheet ad-hoc |
| Med details | `MedDetails` → `MedDetailsScreen.tsx:13–31` | Redirect spinner | **N/A** | Loading only | None | N/A | Ad-hoc center |
| Training hub | `Training` → `TrainingScreen.tsx` | List/history scroll; hosts setup/session/analytics | **FUDGE** standard / explicit 140 (`:1252`) | Large ActivityIndicator gates; history loading | Labels (~7) | Header IconButtons | **Tokens** + branches |
| Training setup | Hosted `TrainingSetupScreen.tsx` | Sticky Back/Next/Save footer | **LIVE** `Math.max(insets.bottom, spacing.md)` (`:994`) | Mutation errors via Alert; validation text | Labels present | Footer buttons OK | Mix: tokens + sticky LIVE |
| Training session | Hosted `TrainingSessionView.tsx` | Sticky Done / Save / Minimize | Footer **LIVE** (`:2179`); scroll **FUDGE+LIVE** 140+insets (`:1710–1713`) | Dialogs for resume/complete; mood prompt | Strong (~15) | **IconButton size={18}** +/− weight/reps with `hitSlop={15}` — borderline 48dp | Tokens + double-count scroll |
| Training analytics | Hosted `TrainingAnalyticsScreen.tsx` | Close IconButton; scroll | **FUDGE** `reclaimStandardScreenScroll` | Empty exercise / set-log copy; ActivityIndicator | Close labeled; charts labeled | Close size 24 | **Tokens** standard |
| Mindfulness | `Mindfulness` → `MindfulnessScreen.tsx` (~1295) | Scroll; type Dialog | **FUDGE** standard 140 | “No sessions yet”; refresh loading | Labels (~14) | — | **Tokens** standard |
| Meditation | `Meditation` → `MeditationScreen.tsx` (~1088) | Scroll; library/external/guide modals | **FUDGE** standard 140 | “No sessions yet”; audio Alerts | Labels present | — | **Tokens** standard |
| Integrations | `Integrations` → `IntegrationsScreen.tsx` (~912) | Scroll; Paywall + import Portal | **FUDGE** standard 140 | Import ActivityIndicator; Alert empties | Labels (~7) | — | **Tokens** standard |
| Notifications | `Notifications` → `NotificationsScreen.tsx` (~117) | Scroll; refresh IconButton | **FUDGE** standard 140 | Small ActivityIndicator | Labels (~5) | IconButton | **Tokens** standard |
| About | `About` → `AboutScreen.tsx` (~29) | Scroll | **FUDGE** standard 140 | Static | Sparse | — | **Tokens** standard |
| Data & Privacy | `DataPrivacy` → `DataPrivacyScreen.tsx` (~116) | Scroll; destructive CTA in-flow | **FUDGE** standard 140 | Alert errors; button loading | Sparse | — | **Tokens** standard |
| Reclaim Moments | `ReclaimMoments` → `ReclaimMomentsScreen.tsx` | FlatList | **NONE**/ad-hoc (no reclaim scroll tokens) | Loading center; `ListEmptyComponent`; per-day empty lines | Labels (~4) | — | **Ad-hoc** |
| Evidence Notes | `EvidenceNotes` → `EvidenceNotesScreen.tsx:85` | Scroll | **FUDGE** `paddingBottom: 120` (not 140) | Static notes list | Sparse | — | **Ad-hoc** |
| Diagnostics | `Diagnostics` → `DiagnosticsScreen.tsx` | Scroll | **NONE**/ad-hoc | Error + data branches | Sparse | — | Visual language shell; no scroll tokens |
| Guided traces | `GuidedTraceViewer` → `GuidedTraceViewerScreen.tsx` | Scroll | **NONE**/ad-hoc | “No trace rows yet” | Sparse | — | Visual language; no scroll tokens |

### 2.4 Dormant screen file

| Surface | File | Registered? | Inset / notes |
|---------|------|-------------|----------------|
| Signal Graph | `SignalGraphScreen.tsx` | **No** | Would be **FUDGE** 140 + extra `paddingBottom: 40`; loading ActivityIndicator; uses reclaim tokens |

---

## 3. Modals / sheets / dialogs / overlays

Visual score: **UNABLE_TO_VERIFY** for all.

| Surface | Host file:line (approx) | Kind | Bottom chrome | Inset | Empty/L/E | TalkBack sample | 48dp sample | Spacing |
|---------|-------------------------|------|---------------|-------|-----------|-----------------|-------------|---------|
| SessionPreviewModal | `SessionPreviewModal.tsx:70+`; TrainingScreen ~1582 | Paper Portal Modal (sheet-like) | Confirm/Cancel row | **LIVE** margins + action `Math.max(insets.bottom,…)` | Plan null → return null | Labels on actions | — | Theme spacing + insets |
| GuidedPrepScreen | `GuidedPrepScreen.tsx:120+`; TrainingScreen ~1596 | Centered Paper Modal | Cancel / Start | **N/A** | Countdown | — | — | Theme spacing |
| SetFocusOverlay | `SetFocusOverlay.tsx:60+`; TrainingSessionView | Portal Modal | Focus UI | **N/A** | — | Via SetFocusCard | IconButtons size 20–22 + hitSlop | Theme |
| FullSessionPanel | `FullSessionPanel.tsx:48+` | Portal Modal | — | **N/A** | — | Labels | — | Theme |
| SessionDetailModal | `SessionDetailModal.tsx:86+`; TrainingHistoryView | Portal Modal | — | **N/A** | — | — | — | Theme |
| ExerciseDetailsModal | `ExerciseDetailsModal.tsx:76+` | Portal Modal | Close IconButton | **N/A** | Loading spinner | Close labeled | IconButton | Theme |
| PostSessionMoodPrompt | `PostSessionMoodPrompt.tsx:52+` | Portal Modal | — | **N/A** | — | — | — | Theme |
| ReplaceExerciseDialog | `ReplaceExerciseDialog.tsx:51+` | Portal Dialog | Actions | **N/A** | List | — | — | Theme |
| ExerciseCard dialogs | `ExerciseCard.tsx:532+` | Portal Dialogs (edit set / RPE / why) | Actions | **N/A** | — | Many labels (~24 file) | — | Theme |
| TrainingSessionView dialogs | `TrainingSessionView.tsx:2279+` | Portal Dialogs (resume / complete / finish) | Actions | **N/A** | Confirm copy | — | — | Theme |
| Edit set RN Modal | `TrainingSessionView.tsx:153` | RN Modal | +/− controls | **N/A** | — | Decrease/Increase labels | **size={18}** + hitSlop 15 | Theme |
| Meds history sheet | `MedsScreen.tsx:1473–1535` | Portal absolute bottom Card | Sheet handle via Card.Title + close | **NONE** `paddingBottom: 32` | Filtered empty list possible | Close + filter chips labeled | Close IconButton; chips | Ad-hoc |
| Mood history modal | `MoodScreen.tsx:1538+` | Portal centered Card | Close button | **N/A** | — | Sparse | Ghost button | Ad-hoc |
| Sleep history detail | `SleepHistorySection.tsx:212+` | Portal | — | **N/A** | “No history yet” on list | — | — | Theme |
| Sleep import modal | `SleepScreen.tsx:2634+` | Portal Modal | — | **N/A** | ActivityIndicator | — | — | Theme |
| SleepHero confidence sheet | `SleepHero.tsx:269+` | Portal Modal | — | **N/A** | — | Labels | — | Theme |
| DashboardMoodCheckInModal | `DashboardMoodCheckInModal.tsx:52+` | Portal Modal | In-card; close IconButton | **N/A** (`paddingBottom: 12` in-card) | — | Labels (~7) | Close IconButton | Theme |
| DashboardForecastModal | `DashboardForecastModal.tsx:31+` | Portal Modal | — | **N/A** | — | — | — | Theme |
| DashboardSleepSnapshotModal | `DashboardSleepSnapshotModal.tsx:31+` | Portal Modal | — | **N/A** | — | — | — | Theme |
| ScheduleOverlay | `ScheduleOverlay.tsx:126+` via `DashboardScheduleOverlayHost.tsx:20` | Portal absolute overlay “sheet” | Scroll `paddingBottom: 8` | **NONE** | Empty ranged list | — | Close / Take dose | Ad-hoc |
| MilestoneCelebrationModal | `MilestoneCelebrationModal.tsx:124+` (Dashboard, Meds, Meditation, TrainingSession) | RN Modal | — | **N/A** | — | Label present | — | Theme |
| PaywallModal | `PaywallModal.tsx:57+` (Dashboard, Integrations) | RN Modal | Purchase/restore in-card | **N/A** | — | Labels (~3) | — | Theme |
| RecoveryResetModal | `RecoveryResetModal.tsx:56+`; Settings | Portal | — | **N/A** | — | Labels (~12) | — | Theme |
| Settings feedback | `SettingsScreen.tsx:1434+` | Portal Modal | — | **N/A** | — | — | — | Theme |
| MeditationLibraryModal | `MeditationLibraryModal.tsx:111+` | RN Modal slide | — | **N/A** | — | — | — | Theme |
| ExternalMediaModal | `ExternalMediaModal.tsx:46+` | RN Modal slide | — | **N/A** | — | — | — | Theme |
| Meditation guide / edit | `MeditationScreen.tsx:1148+`, `:1271+` | RN Modal | — | **N/A** | — | — | — | Theme |
| MeditationSessionOptions voice | `MeditationSessionOptions.tsx:92+` | Portal Dialog | — | **N/A** | — | Label | — | Theme |
| Mindfulness type picker | `MindfulnessScreen.tsx:821+` | Portal Dialog | — | **N/A** | — | — | — | Theme |
| Integrations import | `IntegrationsScreen.tsx:962+` | Portal Modal | — | **N/A** | ActivityIndicator | — | — | Theme |
| InsightCard glossary | `InsightCard.tsx:1086+`, `:1112+` | Modal | — | **N/A** | — | Labels (~13 file) | IconButtons | Theme |
| FirstVisitCoach | Meds/Mood/Mindfulness/Meditation | Inline coach card | — | **N/A** | — | Dismiss labeled | IconButton | Theme |
| DashboardSnackbar | `DashboardSnackbar.tsx` | Snackbar | — | **N/A** | Message | — | — | Paper |
| HealthDisclaimerModal | `HealthDisclaimerModal.tsx` | RN Modal (self-mount) | Centered card | **N/A** | — | — | — | Ad-hoc 24 | **Note:** replaced for first-time by StartupSplashDisclaimer; **no App.tsx mount found** — dormant unless imported elsewhere |
| BuildFingerprintOverlay | `BuildFingerprintOverlay.tsx` | Dev overlay | Corner text | **N/A** | — | None | N/A | Ad-hoc | **No App.tsx mount found** — dormant unless wired in build |

---

## 4. PHASE_3 remaining 140 / inset backlog (cross-check)

From `docs/eif-bootstrap/PHASE_3.md` — still **FUDGE** / **NONE** in source (this enumeration confirms):

| Still FUDGE (140 via tokens) | Evidence |
|------------------------------|----------|
| Dashboard, Settings, Training list, Meds, Mood, Sleep, Mindfulness, Meditation, Integrations, Notifications, DataPrivacy, About, TrainingAnalytics | `reclaimHeroBleedScroll` / `reclaimStandardScreenScroll` / explicit `RECLAIM_SCREEN_TAB_BAR_INSET` |
| SignalGraphScreen (orphan) | standard + +40 |
| EvidenceNotes | **120** hardcoded |

| Still NONE / sticky risks | Evidence |
|---------------------------|----------|
| Meds history sheet | `paddingBottom: 32`, no insets |
| Drawer content | `paddingBottom: 18` |
| ScheduleOverlay scroll | `paddingBottom: 8` |
| Auth + onboarding CTAs | In-flow, no `insets.bottom` |
| TrainingSessionView scroll | 140 **+** `insets.bottom` while footer already LIVE (double-count) |

| Already LIVE (item 4) | Evidence |
|-----------------------|----------|
| TabsNavigator tab bar | `TabsNavigator.tsx:55–56` |
| AppScreen / Analytics | `AppScreen.tsx:41–44` |
| TrainingSetup sticky footer | `TrainingSetupScreen.tsx:994` |
| TrainingSession sticky footer | `TrainingSessionView.tsx:2179` |
| SessionPreviewModal | `SessionPreviewModal.tsx:76–78` |

---

## 5. TalkBack coverage snapshot (not exhaustive)

| Density | Surfaces |
|---------|----------|
| Stronger | Dashboard tiles/today/recovery, TrainingSessionView / ExerciseCard / SetFocusCard, MedsScreen, SleepScreen, Settings switches, RecoveryResetModal |
| Moderate | Mood, Mindfulness, Meditation, Integrations, Notifications, onboarding Capabilities |
| Sparse / weak | Auth, About, DataPrivacy, EvidenceNotes, Diagnostics, GuidedTraceViewer, splash, BuildFingerprint, many centered modals |
| Common pattern | Header menu `IconButton` → `accessibilityLabel="Open navigation menu"` (Tabs, MedsStack, Drawer) |

---

## 6. 48dp target hotspots (source-obvious)

| Location | Evidence | Risk |
|----------|----------|------|
| TrainingSessionView edit modal +/− | `IconButton` `size={18}` + `hitSlop={15}` | Borderline; hitSlop helps but visual target small |
| SetFocusCard steppers | `size={20|22}` + `hitSlop={14|16}` | Borderline |
| MedsScreen list actions | `IconButton` `size={18}` (no hitSlop seen at those lines) | Likely &lt;48dp |
| Universal header menu | `IconButton` `size={24}` | Paper default; usually OK — **UNABLE_TO_VERIFY** without screenshot measure |

---

## 7. Spacing system adoption

| Pattern | Used by |
|---------|---------|
| `reclaimHeroBleedScroll` + `reclaimBelowHeroContent` + `reclaimSectionSpacing` | Dashboard, Sleep, Mood, Meds |
| `reclaimStandardScreenScroll` | Settings, Training branches, Mindfulness, Meditation, Integrations, Notifications, About, DataPrivacy, TrainingAnalytics |
| `AppScreen` + live inset | Analytics only |
| Tokens H/top only (no 140) | Auth, several onboarding screens |
| Ad-hoc | ReclaimMoments, EvidenceNotes, Diagnostics, GuidedTraceViewer, drawer, most modals/sheets, splash |

---

## 8. Empty / loading / error presence (screen-level)

| Present | Examples |
|---------|----------|
| Explicit empty copy | Meds, Mood history, Meditation/Mindfulness sessions, TrainingAnalytics, ReclaimMoments, GuidedTraceViewer, Sleep history |
| Loading indicators | Training hub gates, MedDetails redirect, Meds list, Sleep history, Analytics “coming soon”, Onboarding gate, ReclaimMoments |
| Error UI / Alerts | Mood insights, Sleep sync, Integrations import, DataPrivacy export/delete, Training setup mutations, Auth Alerts |
| Weak / static only | About, EvidenceNotes, Analytics (placeholder not real empty) |

---

## 9. Visual scoring placeholder

| Surface class | Visual score |
|---------------|--------------|
| All routed screens | **UNABLE_TO_VERIFY** — needs adb screenshots |
| All modals / sheets / overlays | **UNABLE_TO_VERIFY** |
| Tab bar / drawer chrome | **UNABLE_TO_VERIFY** |

Suggested later capture matrix: Home, Analytics, Settings, Sleep, Mood, Meds (+ history sheet), Training (hub + session sticky), Meditation, Mindfulness, Integrations, Auth, one onboarding step, ScheduleOverlay, SessionPreviewModal — gesture-nav and 3-button nav.

---

## 10. Sources inspected (material)

- `app/src/routing/{RootNavigator,AppNavigator,TabsNavigator,OnboardingNavigator,MedsStack}.tsx`
- `app/src/navigation/types.ts`
- `app/src/theme/{reclaimScreenLayout,appThemes,index}.ts`
- `app/src/components/ui/AppScreen.tsx`
- `docs/eif-bootstrap/PHASE_3.md`
- Screen files under `app/src/screens/**` and overlay hosts under `app/src/components/**` (Modal/Portal/Dialog grep)
- `app/App.tsx` (RootNavigator mount only; no HealthDisclaimer / BuildFingerprint)

---

## 11. Out of scope / next

- No product source edits in this pass.
- Feed `docs/design/UI_AUDIT.md` from this inventory when that doc is authored.
- Device screenshot pass required before any visual grade.
- Prefer fixing remaining **FUDGE→LIVE** scroll bottoms and Meds history **NONE** sheet next (already ranked in PHASE_3).
