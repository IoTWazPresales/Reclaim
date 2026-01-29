# PHASE 4 — Onboarding flash timing proof (DEV only)

## What the timestamps mean

- **t_session:** When session became available (userId truthy and boot entered).
- **t_local:** When local onboard status was resolved (e.g. `getHasOnboarded` returned true and we set `hasOnboarded`).
- **t_remote:** When remote onboard status was resolved (profile `has_onboarded` from API or trust-local fallback).
- **t_splashRelease:** When the splash was released (`shouldHoldSplash` flipped to false).

All are ISO strings or empty; logged only in `__DEV__`.

## Where logs are

- **`app/src/routing/RootNavigator.tsx`:** Refs `sessionReadyAtRef`, `localOnboardAtRef`, `remoteOnboardAtRef`, `splashReleaseAtRef` set when session available, local onboard resolved, remote onboard resolved, and splash released. In `__DEV__`, log `[ONBOARD_GATE] t_session=... t_local=... t_remote=... t_splashRelease=... hasOnboarded=... remoteStatus=... remoteOnboarded=...`. No behavior change.

## Patterns that indicate a flash cause

- **Splash releases before remote known:** `t_splashRelease` is set while `remoteOnboarded` is still `null` and `remoteStatus` is `checking` or `unknown`. We may briefly show Onboarding then switch to App when remote resolves.
- **Local onboarded but remote late:** `t_local` set, `t_remote` empty or much later. If we don’t treat local-as-onboarded until remote is known, we can show Onboarding briefly.
- **FlowKey remount:** `flowKey` changes when `hasOnboarded` or `remoteOnboarded` flips (e.g. `OFF` → `ON`), forcing a stack remount and possible flash.
- **Failsafe:** 8s timeout releases splash with remote still unknown; we may render Onboarding then correct to App when remote arrives.
