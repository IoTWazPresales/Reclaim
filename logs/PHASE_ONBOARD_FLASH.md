# PHASE 4 — Onboarding flash gating + timeline logs

## Symptom
- Already-onboarded users see a brief flash of onboarding on app reopen.
- Need to tighten gating so if user is onboarded locally we never mount onboarding, even briefly, and to debug timing with timeline logs.

## Code path
1. **RootNavigator:** `session`, `hasOnboarded` (local + remote), `appReady`, `remoteOnboarded`, `shouldHoldSplash`, `showApp`.
2. **Boot:** PHASE A (local boot) sets `hasOnboarded` from `getHasOnboarded(userId)`; if local true, set `appReady` and don't wait for remote. PHASE B (remote sync) updates `remoteOnboarded`.
3. **Gating:** `shouldHoldSplash` holds until appReady and onboarding known (or failsafe 8s). `showApp = session && (effectiveHasOnboarded || localHasOnboarded)` so we never show onboarding when local says onboarded.

## Fix (surgical)
1. **`app/src/routing/RootNavigator.tsx`**
   - Added refs: `sessionReadyAtRef`, `localOnboardAtRef`, `remoteOnboardAtRef`, `splashReleaseAtRef`.
   - When `appReady` is set true (boot with/without userId, local true/false): set `sessionReadyAtRef` once.
   - When `hasOnboarded` is set true from local boot: set `localOnboardAtRef` once.
   - When `remoteOnboarded` is set true (remote sync, or trust local): set `remoteOnboardAtRef` once.
   - When `shouldHoldSplash` becomes false: set `splashReleaseAtRef` once.
   - In __DEV__, log `[ONBOARD_GATE]` with `sessionReadyAt`, `localOnboardAt`, `remoteOnboardAt`, `splashReleaseAt` plus existing state (appReady, hasOnboarded, localHasOnboarded, remoteOnboarded, effectiveHasOnboarded, shouldHoldSplash, flowKey, failsafeTriggered).

## Verification (runtime proof)
1. Already-onboarded user reopens app: logs show `localOnboardAt` set early, `splashReleaseAt` after hold; no intermediate route to Onboarding (showApp true as soon as splash releases).
2. New user: `localOnboardAt` null until onboarding completes; `remoteOnboardAt` may set after remote sync.
3. Timeline: `sessionReadyAt` ≤ `localOnboardAt` or `remoteOnboardAt` ≤ `splashReleaseAt` gives ordering for debugging flash.
