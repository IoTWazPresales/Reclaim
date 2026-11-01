# Android OTA channel release finding - 2026-11-01

Status: OPEN, record only; no fix or deployment authorized.

The standalone Android 1.0.5/vc15 artifact built locally on 2026-11-01 has expo.modules.updates.ENABLED=true, runtimeVersion=1.0.5 and the configured EAS update endpoint, but no expo-channel-name request header/channel metadata. Cold-start logs show update requests rejected with missing channel-name. Production OTA cannot be delivered to this artifact with its current configuration. This observation does not assert that a separately built/deployed production artifact has identical configuration. eas.json profile channel declarations alone do not prove a channel was embedded in this direct local Gradle build.

Read-only EAS all-branch listing returned no Android updates matching runtime 1.0.5. Operator accepted embedded-source provenance by elimination; that decision does not resolve this release finding or approve deployment. No EAS update published, channel/branch modified or application/native config changed.

Evidence: `.eif/audit/N-0070/android-20261101/provenance-readonly-result.md`, `operator-provenance-decision.md`, and `operator-accepted-result.md` in the same directory. Resolve only in a separately authorized change with installed-artifact configuration and delivery verification.
