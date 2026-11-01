# Read-only EAS and cold-start provenance checks - 2026-11-01

Result: **INCONCLUSIVE launch identity; STOP before account writes**, as explicitly instructed. No downloaded update was identified, but the required affirmative embedded-launch log was not obtained.

## Installed configuration

Inspected compiled installed base.apk AndroidManifest using aapt xmltree and compiled resource values using aapt resources. Runtime resource expo_runtime_version resolves to **1.0.5**. Updates enabled=true, check-on-launch=ALWAYS, launch-wait=0, update URL=https://u.expo.dev/d053ca52-e860-4241-822b-8f821974f884. No EXPO_UPDATES_REQUEST_HEADERS or expo-channel-name metadata exists in installed manifest. No installed updates channel can therefore be reported. Source app.config.ts agrees on runtime and endpoint; eas.json profile channel names are not treated as installed configuration.

## Read-only EAS result

Executed from app/: `eas update:list --all --platform android --runtime-version 1.0.5 --limit 50 --offset 0 --json --non-interactive`. All branches queried because installed artifact has no channel. CLI exit=0; JSON `{"currentPage": []}`. Therefore no published Android updates matching runtime 1.0.5 were returned across this project's branches; empty first page, no further page required. No EAS publication, channel/branch modification, configuration change, CLI upgrade or deploy.

## Exactly one approved cold start

Cleared logcat, force-stopped Reclaim once, and launched once via `adb shell am start -W -n com.fissioncorporation.reclaim/.MainActivity`. Android returned Status ok, COLD, TotalTime=1935ms / WaitTime=2021ms. New PID=10388. Full logcat captured after six seconds and captured again after the EAS query without a second restart. App remains running.

After correctly decoding PowerShell's UTF-16 output, logs include:
- `embeddedAssetFileMap: embeddedAssets count = 131`.
- ReactHost getJSBundleLoader and Loading JS Bundle.
- StartStartup and EndStartup with isUpdateAvailable=false, isUpdatePending=false.
- Remote update requests fail with missing channel-name header; error lists required expo-runtime-version/expo-channel-name/expo-platform headers.

The asset map proves embedded assets are indexed; it is not an explicit selected/loaded-bundle statement. No isEmbeddedLaunch=true, selected embedded update or launch asset path is present in captured launch messages. Remote request failure plus empty EAS listing supports an embedded-launch inference, but does not meet operator's requirement for affirmative launch logs. No alternate proof was silently substituted.

Sanitized native update messages: provenance-launch-messages.json. Raw full logcat/manifest/resources/CLI output retained locally. Earlier UTF-8 parsing of UTF-16 output incorrectly counted update logs as absent; current analysis corrects this. Fresh decoded process log has no fatal-crash markers; absence claims in prior receipts that used incorrect decoding must not be relied on without rechecking.

## Stop condition and preserved authorization

Monday-Friday approved as real schedule, but schedule not changed/saved. Strength/goals/experience/equipment/baselines not changed. No setup/profile/program write, Start, Done, set log, Cancel & delete or medication action. Steps 2-8 remain pending successful provenance gate. No EIF acceptance or source edits. Do not restart again or modify update settings as part of this read-only task.
