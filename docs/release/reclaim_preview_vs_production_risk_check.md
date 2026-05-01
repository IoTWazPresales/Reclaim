# Reclaim Preview vs Production Risk Check

Date: 2026-04-20  
Purpose: determine whether preview behavior can plausibly differ from production/build-branch behavior.

## Build Profile Differences (Verified)

Source: `app/eas.json`

- `development`
  - channel: `development`
  - distribution: internal
  - dev client: true
  - android build: apk
- `preview`
  - channel: `preview`
  - distribution: internal
  - android build: apk
- `production`
  - channel: `production`
  - distribution: store
  - android build: app-bundle
  - autoIncrement: true

Implication: preview and production are intentionally split by channel + artifact type. Divergence is plausible and expected if OTA content differs.

## Runtime / Update Configuration (Verified)

Source: `app/app.config.ts`

- `runtimeVersion` pinned to `1.0.3`.
- `updates.url` present (EAS updates enabled path).
- No config-level disable for updates.

Implication: OTA can modify JS behavior without new binary, but only when runtime-compatible and channel-matched.

## In-App Update Behavior (Verified)

Source: `app/src/hooks/useAppUpdates.ts`

- Non-dev builds call `checkForUpdateAsync` and may `fetchUpdateAsync`.
- App can run with pending OTA update and prompt restart.

Implication: two preview testers may observe different runtime behavior if one has fetched a newer preview OTA and another has not restarted/applied.

## Feature Flags / Guards That Can Diverge

### Verified channel-based guard

- `app/src/lib/feedback/flags.ts`
  - `isFeedbackCaptureEnabled()` depends on `Updates.channel`.
  - Enabled for `preview`/`development` channels (and `__DEV__`), not by default for production.

Impact: at least one feature class behaves differently by channel.

### Verified env-based guards

- Uses `EXPO_PUBLIC_*` env values in app configuration and flags.
- Behavior can diverge by profile/env injection (e.g., build-time env differences across preview/production jobs).

### Verified dev-only guards

- `__DEV__` gated UI/actions (e.g., debug/test actions).
- Not a preview-vs-production guard by itself, but can mask behavior during local testing.

## Notification/Trigger Divergence Risk

- Notification categories/channels are initialized in app startup hook (`useNotifications`).
- Guided training prechecks depend on categories being present (`TrainingScreen` checks category identifiers).
- OTA or startup race conditions can alter practical behavior without code branch drift.

Assessment: preview is a high-risk environment for notification behavior drift because notification chains are sensitive to lifecycle and timing.

## Could Preview Omit Behavior Present Elsewhere?

### Yes — plausible mechanisms

1. Channel-specific OTA payload (preview vs production).
2. Pending vs applied OTA state on device.
3. Channel-gated feature behavior (`Updates.channel` checks).
4. Build profile env differences at compile time.

### No evidence found for

- Explicit app.config conditional that disables entire training/mood/mindfulness modules only in preview.
- Preview-only hard kill-switch for core session logic.

## Exact Findings Summary

- Preview/production divergence is **plausible and real** at the OTA/channel layer.
- At least one runtime feature path is explicitly channel-sensitive.
- Incident reports cannot be dismissed as user error solely because local code appears correct.
- Device-side evidence collection (update id, channel, runtime version, scheduled notification diagnostics) is mandatory before release decisions.

## Required Device-Proof Checklist (Not Fully Verified Yet)

1. Capture `Updates.channel`, `Updates.runtimeVersion`, `Updates.updateId` on affected preview devices.
2. Export notification diagnostics (`getNotificationDiagnostics`) before and after toggles/actions.
3. Reproduce watch `Done/Next` behavior on preview and production-channel build with same runtime where possible.
4. Verify mood reminder logical keys (`mood_morning`, `mood_evening`) are present in intents and scheduled requests.
