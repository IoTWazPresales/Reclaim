# Reclaim — Claude Code Project Memory

## What this app is
React Native / Expo wellness and recovery app. Android primary, iOS secondary.
Target user: people rebuilding from injury, burnout, addiction, illness.
One-line pitch: "The only app built for people who are rebuilding — not optimising."

## Tech stack
- React Native 0.81.5, React 19.1.0, Expo SDK ~54
- Supabase (auth + Postgres + RLS)
- Zustand + React Query for state
- react-native-paper (MD3 dark theme)
- @shopify/react-native-skia (canvas graphics)
- expo-notifications (intent-based reconciler)
- Health Connect ONLY — Google Fit was removed March 2026
- Sentry, EAS Build, expo-updates

## Critical architecture rules
1. Notifications: ALWAYS setIntent() + reconcileNotifications(). Never schedule directly.
2. Guided training: one canonical SET_DONE transition (guidedSetCompletionCanonical). UI Done, phone notification Done, and watch Done must all use it. Never create competing completion workflows.
3. Runtime sync bridge: watch actions sync into runtimeState via logSet() replay on items prop change.
4. Medication feature: educational/contextual ONLY. No prescribing, dosing, interactions, or medical advice.
5. Always commit AND push to current branch after every validated package.
6. Never use git add . — stage only required files.
7. Always provide complete files, never diffs or snippets.
8. Never leave empty catch blocks — always logger.debug in __DEV__.

## Known issues (as of May 2026)
- Normal training sessions are behaving like guided sessions — mode detection or notification gating is wrong somewhere. This is the most urgent bug.
- Wear OS real-device QA for guided training still pending.
- ScreenErrorBoundary exists but is not wrapping any screens — full app crash risk.
- 6+ auth calls without try/catch (supabase.auth.getUser()).
- 30+ empty catch blocks swallowing errors silently.

## Active work (2026-06-07)
**Branch:** `feat/meds-catalog-governance` — Medication module rebuild Phases 0–5.
- Phase 0 ✅ catalogue frozen at **215 rows** (`9fb8ae0`)
- Phase 1 ✅ `useMedDetailContext` + extracted `components/meds/*` (`16a3a96`)
- **Phase 2 next:** `MedInlineDetailPanel` on `MedsScreen` (no stack push)
- Handover: `docs/handover/meds-module-rebuild-handover.md`

## Module completion status
- Mood: ~70%
- Sleep: ~65% (Health Connect only)
- Medication: ~85% (215-row catalogue, governance, Phase 1 detail extraction; inline host + SSOT + fusion in progress)
- Training: ~78% (session work authority on DB `ec4a308`; Wear QA pending)
- Meditation: ~40%
- Insights: ~55%
- Dashboard: ~60%
- Notifications: ~85%
- Infrastructure/stability: ~55%

## Deferred (do not implement without explicit instruction)
- OCR/script scanning for medications
- Drug interaction lists
- Recovery/readiness score changes
- Google Fit (removed — do not re-add)
- Fuzzy medication matching
