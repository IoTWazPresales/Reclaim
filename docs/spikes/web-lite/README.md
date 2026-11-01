# Web Lite feasibility spike

Branch: `spike/web-lite`, based on `06dcbe9dfe250f17824234ac438f5fb1c498b8e3`.
Isolated worktree: `C:\Reclaim-web-lite`. The original dirty worktree and working branch are preserved.
No deployment, migration, policy change or EIF acceptance is authorized by this spike.

## Finding

**Feasible as an online-only manual training web app.** The export, real Supabase
authentication, saved weekly programme, preview and canonical manual writes work
in desktop Chromium and a 390×844 viewport. This is a feasibility prototype,
not an iPhone Safari production acceptance.

The operator explicitly replaced the dedicated-test-account requirement with use
of the operator account during the spike. A placeholder signup had been rejected;
no new user was created. To preserve that account's active programme, setup was
walked through to its final Save screen but **Save and Delete programme were not
clicked**. Runtime setup-save/new-programme persistence therefore remains
unverified. No password was requested or changed; real authentication used a
one-time operator link generated through the existing Supabase administration
credentials, kept outside the app/repository. Browser data requests used only the
anon key plus the authenticated user's JWT.

| Capability | Observed result |
| --- | --- |
| Web production export | Pass; original mobile entry fails on SQLite WASM resolution, web entry succeeds. |
| Sign-in and reload persistence | Real Supabase one-time-link sign-in and subsequent page reload pass. Token expiry/rotation, successful password, OAuth and recovery flows were not tested. |
| Sign-out | Pass; actual request uses `scope=local`, auth storage clears and reload stays signed out. No global sign-out request is made. |
| Training setup | Existing wizard renders and advances through goals, schedule, equipment, constraints and baselines, to Save. Desktop and narrow layout inspected; existing programme not changed. Save remains a required follow-up. |
| Weekly plan | Saved programme/days load from the real project; week selection works and the current/upcoming week is initially selected. |
| Session Preview | Manual-only preview renders names, canonical load formatting, warnings and a start action. Unknown loads require manual confirmation. |
| Manual session | Confirmed plan freezes into six item rows; manual logging succeeds at desktop and narrow sizes. Two real test set-log rows match two canonical `performed.sets` entries. |
| Reload | Server-read logged set survives reload; unfinished manual session recovers from the server. |
| Offline write | Explicit “Not saved” error, no browser offline queue and no third persisted set. |
| Anonymous RLS probe | Known operator-owned rows return zero rows from all six tested tables. Cross-account reads/writes and policy completeness are not certified. |
| Physical iPhone / Safari | Not tested. Installed Windows WebKit probe is `UNABLE_TO_VERIFY` due to tooling protocol mismatch. |

Temporary sessions, their items/set logs, and the exact returned test-event IDs
were deleted after each write exercise. The final exercise restored every row
in the six snapshotted training tables: 1 profile, 3 programme instances, 48 plan
days, 5 sessions, 14 items and 18 logs. Sorted full-row hashes match before and
after, rather than just the counts. Authentication session/audit activity is
expected from signing in/out; no claim is made that auth audit history is erased.

## Scope

Email/password sign-in, existing training setup, weekly programme, Session Preview,
and manual set completion. Guided sessions, notifications, rest alarms, native
foreground services, Health Connect and Wear are excluded.

## Prototype boundaries and Android preservation

All changes to app runtime code are **new web files**. Existing `App.tsx`, shared
auth/planner/API/set-completion source, package files, Metro/Babel configuration,
native plugins and native source are unchanged. Native Metro resolution ignores
the added `.web.ts`/`.web.tsx` files. The Android source diff is empty; no Android
APK or native bundle was rebuilt, so binary identity is not claimed.

- `App.web.tsx` selects a small web shell instead of the mobile bootstrap.
- `src/web/WebLiteApp.tsx` supplies browser sign-in and theme/query providers;
  a browser Alert bridge lets the existing setup wizard display errors/dialogs.
- `src/web/WebTraining.tsx` composes the existing wizard, shared weekly proposals,
  manual preview and forms. It refuses to take over an open mobile session.
- `localData/database.web.ts` reports SQLite unavailable. Existing optional caches
  fall back to remote reads; mobile hydration is not started.
- `training/offlineQueue.web.ts` rejects queue writes. The canonical set writer
  remains shared; failure cannot become a success message or an unscoped queue.
- `logger.web.ts` uses sanitized console output, omitting native Sentry startup.
- `SessionPreviewModal.web.tsx` exposes only manual logging. Guided controls,
  rest alarms, notification reconciliation/permissions, FGS, health/Wear startup,
  native update checks and background synchronization are not executed.

The existing Supabase storage catches unavailable SecureStore calls and falls
back to AsyncStorage's browser localStorage adapter. Page-reload persistence
was exercised. A web-specific auth storage adapter would remove reliance on
exceptions in production while retaining the existing privacy guards.

Canonical path: manual button → **`applySetCompletion`** → repository/API set-log
write → **`mergePerformedSetsIntoSessionItemFromDb`** →
**`training_session_items.performed.sets`**. Display state comes back from
`getTrainingSession` and `sessionWorkAuthority` helpers. There is no web-specific
set writer. Starting uses `materializePlannedSessionItems`; proposals use
`programmeWeekProposal` → `buildProgramDaySession` and the existing planner.
Resumed item prescriptions come from the frozen DB rows.

## Dependency inventory and smallest fallback

The original `App.tsx` eagerly imports the full mobile shell. Runtime `Platform.OS`
checks alone do not stop Metro resolving native imports. Prefer platform files at
composition boundaries; retain shared planner, API, auth safeguards and persistence.

| Dependency / owner | Existing import path | Web status / smallest fallback |
| --- | --- | --- |
| `expo-notifications`, intent store and reconciler | App, TrainingScreen, TrainingSessionView, NotificationScheduler | Native scheduling and permission APIs unavailable. Exclude mobile bootstrap and guided UI in `App.web.tsx`; do not invoke reconciler, schedule or cancel APIs. No web push in this scope. |
| guided FGS config plugin, `sessionForegroundTransport`, `guidedSessionFgs` | mobile app/guided runtime | Build-time Android plugin and custom native transport. Exclude guided runtime from web composition; no replacement/background worker. Preserve the one Android health FGS. |
| `react-native-health-connect` | exerciseSessionWriter and healthConnectService | Android only. Exclude health bootstrap and session health side effects. A web health adapter should report unavailable rather than fabricated zero metrics. |
| `react-native-health` | Apple HealthKit providers | iOS native only; excluded with health integrations. Never substitute Google Fit. |
| `expo-secure-store` | Supabase storage | No browser keychain implementation. Existing exception fallback reaches AsyncStorage; smallest explicit adapter is browser localStorage/AsyncStorage behind a web-only module, retaining privacy serialization/tombstones. Browser storage is accessible to same-origin JS. |
| `expo-sqlite` / `localData/database` | shared API read caches, local mirrors, mobile hydration | Web implementation needs WASM and cross-origin isolation headers. The spike fails local DB initialization explicitly in `database.web.ts` so optional caches fall back to Supabase. `offlineQueue.web.ts` rejects unsaved writes instead of creating an unscoped browser queue. No offline support. |
| `@shopify/react-native-skia` | mobile visual/chart surfaces | Has web CanvasKit support requiring initialization and WASM delivery. Exclude these surfaces for Lite. If retained later, await CanvasKit loading and self-host/version its assets. |
| `@sentry/react-native` | sentry, logger, mobile App | Includes browser support, but native instrumentation differs. Web console logger avoids importing native telemetry during the spike; production should initialize browser monitoring with PII filtering and source maps. |
| `expo-updates` | mobile updates hook | Native OTA lifecycle has no equivalent on a static website. Exclude hook; browser receives hosted assets on page load. Define cache/version update strategy separately. |
| `expo-calendar` | setup calendar opt-in | Existing web permission guard returns false. Keep disabled/unavailable; no calendar writes. |
| `expo-keep-awake` | guided runtime | Not needed for manual logging; exclude runtime. Screen Wake Lock, if ever added, is a separate capability with browser limits. |
| `expo-background-fetch`, `expo-task-manager` | background health sync | Native background lifecycle excluded. Do not promise browser background execution. |
| `expo-haptics`, `expo-speech`, `expo-av` | training cues and other mobile surfaces | Exclude cues; no rest sound, speech or vibration. Browser audio requires user interaction and foreground behavior. |
| `expo-auth-session`, `expo-web-browser` | mobile OAuth | Spike uses password auth. Production OAuth needs browser-specific redirect URLs, callback handling and PKCE verification. |
| `expo-linking`, `expo-constants` | navigation/bootstrap | Browser implementations exist. Keep only if needed; localhost and hosted auth redirects must be explicitly configured. |
| `expo-font`, Google font assets, `@expo/vector-icons` | setup/theme | Web supported; serve font assets with correct MIME/CORS/cache policy. |
| `expo-file-system` | dataPrivacy export, outside Lite shell | Native file paths are unavailable. Exclude privacy/export route; a future web export should use Blob/download APIs without native file-system imports. |
| custom `PlayIntegrityModule`, `ExactAlarmModule`, `ReclaimSessionForeground` | playIntegrity/native, exactAlarmGate, sessionForegroundTransport, runLocationPermission | Android bridges have no web implementation. Omit integrity monitor and all alarm/FGS/location startup. Existing native methods remain untouched. |
| AsyncStorage | Supabase fallback, queues and settings | Web localStorage adapter exists; storage can be denied or purged. Catch and surface failures; do not promise keychain confidentiality or offline durability. |
| NetInfo | mobile network indicator | Browser support uses network events. Shared set writer currently probes Supabase; actual write/read-back remains authoritative. |
| Reanimated, worklets, gesture-handler, screens, safe-area, SVG, Paper, navigation | mobile UI/shared components | Web variants exist for much of the UI; verify bundle/runtime and keyboard/scroll/modal behavior. Avoid direct native/internal RN imports. |
| community Slider, Picker, chart-kit | setup/shared UI and excluded analytics | Slider/Picker supply web controls; chart-kit uses SVG. Setup sliders render; charts are excluded. Production still needs keyboard/touch verification. |
| purchases, WebView, print/sharing/store-review | other mobile routes reachable through full root navigator | Exclude routes from Lite. Some have web implementations with different capability/gesture/security requirements; do not expose unfinished controls. |

## Hosting (proposal only)

The export is a client SPA talking directly to Supabase; no application server is
needed for these paths. Any HTTPS static host with SPA fallback, cache control,
security headers and custom domain support can serve `dist` (for example Cloudflare
Pages, Netlify or Vercel). Hashed assets can be immutable; HTML should revalidate.
Configure fallback routing before using deep links. A subpath deployment needs
asset/base URL testing.

EAS Hosting integrates Expo exports, preview URLs and custom domains. The current
official FAQ explicitly supports `web.output: single`, as well as `static` and
`server`. This app's single-page export therefore fits its documented output modes;
no Expo Router migration is needed for this hosting choice. Prefer EAS Hosting if
using the existing Expo operations workflow, or a static host if existing web
infrastructure already provides the required routing/headers. Neither option was
deployed or validated on a public URL in this spike.

Sources checked for this spike:
[EAS Hosting](https://docs.expo.dev/eas/hosting/),
[Expo website publishing](https://docs.expo.dev/guides/publishing-websites/),
[SQLite web requirements](https://docs.expo.dev/versions/latest/sdk/sqlite/),
[Skia v2 CanvasKit setup](https://wcandillon.github.io/react-native-skia/v2/docs/getting-started/web/).

## Production risks

- Anon/publishable key exposure in the JS bundle is expected. Service-role keys
  must never enter `EXPO_PUBLIC_*`, browser files, build output or source control.
  Hiding the anon key is not access control. Verify RLS on programme, session,
  session-item and set-log tables, including parent ownership and cross-user writes.
  UI user filters do not prove RLS. No RLS changes belong in this spike.
  [Supabase key guidance](https://supabase.com/docs/guides/getting-started/api-keys).
- Browser tokens in localStorage increase XSS impact. Use a strict CSP, minimize
  third-party scripts, review auth redirects, and test sign-out/cache isolation,
  refresh and multiple tabs. Avoid shared-device persistence surprises.
- iOS-size Chromium is a layout check, not iPhone Safari certification. Safari
  needs real-device tests for private browsing/storage eviction, keyboard/viewport,
  safe areas, date inputs, touch scrolling, portals and page suspension. Manual
  set completion must survive reload via server truth, without alarms/background
  promises. WebKit on Windows, if runnable, is additional engine evidence only.
  [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).
- Online-only Lite must visibly distinguish queued/failed writes from server
  success. Existing queues need account isolation, replay and privacy review before
  claiming offline support. A successful click is insufficient without DB read-back.
- The mobile setup supports modes outside this spike. Running/Hybrid require
  explicit web UX decisions; route/FGS/run tracking must remain unavailable.

## Evidence

[Failure chronology](FAILURES.md), [runtime receipt](evidence/runtime.json),
[validation receipt](evidence/validation.json) and
[direct native import inventory](evidence/native-imports.json).

The import inventory scans non-test app source, including other routes eagerly
reachable through the original mobile root; it is deliberately a superset of the
five Lite paths. It does not claim every listed package executes on web. Local
screenshots and verbose/raw logs are preserved outside Git at
`C:\Reclaim-web-lite-evidence\20261102` and omitted from the commit to avoid
publishing operator prescriptions or bulk captures. Runtime receipts contain
only artificial test values and row counts.

Final verification: **1,533 tests / 209 files passed**, zero type errors, 31/31
dual-path checks, catalogue 357/0 issues, and successful web export. The EIF
wrapper's three smoke tests skipped because runtime is absent in this isolated
worktree. No EIF status was accepted or changed. Test harness failures and the
successful fixed file-order retry are recorded separately in the failure receipt.

## Effort to productionise

Estimate: **6–10 engineer-days**, assuming online-only strength training, unchanged
schema/RLS contracts and access to a real iPhone. This is engineering judgment
from the observed spike, not a fixed delivery commitment.

| Work | Estimate |
| --- | --- |
| Responsive/keyboard/accessibility polish; proper dialogs; hide unsupported setup modes; complete preview diagnostics | 1–2 days |
| Browser auth storage, redirect/recovery/password tests, refresh/multiple tabs and account isolation | 1–2 days |
| Manual-session lifecycle, duplicate starts/in-flight writes, retries and summaries; isolated setup-save verification | 1–2 days |
| Cross-user RLS denial tests, CSP/monitoring, bundle pruning and HTTPS hosting/cache configuration | 1–2 days |
| Real iPhone Safari, private-mode/storage/keyboard/suspension tests and acceptance fixes | 2 days |

Offline parity, guided/background behavior, running tracking and native
integrations would be separate work. The prototype's large shared API import
still emits unused mobile helper chunks; prune those boundaries before treating
the current ~2.07 MB AppEntry as a production performance target. Manual finish
currently records an end time; full mobile summaries/cancellation parity need
their own acceptance coverage.

## Reproduce locally

From this branch's `app/`, provide the existing public Supabase project settings
in an ignored `.env`, run `npm ci`, then `npx expo export -p web`. Serve the exported
files, for example `python -m http.server 8097 --bind 127.0.0.1 --directory dist`.
No deployment command is needed. Use an explicitly authorized account and keep
credentials, browser storage and one-time links out of source control.

For a follow-up setup-save check, use an isolated account or obtain explicit
approval to replace the operator's active programme. Verify a newly saved
programme/days, preview/session parity and cleanup with direct server read-back.
