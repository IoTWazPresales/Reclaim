# Reclaim — remaining release blockers

This list captures what still stands between current repo state and a credible Play submission package.

## Critical

1. **Manual Play Console declaration/Data Safety evidence gap (Not fully verified)**
- No in-repo proof yet that live Console forms match current HC permissions/runtime scope.
- Source docs flag this as OQ-class risk and prior rejection vector.
- Type: **Manual-only + release blocker**.

2. **Internal health documentation contradiction (Verified broken)**
- `app/Documentation/HEALTH_FIXES_SUMMARY.md` still includes legacy Google Fit/Samsung guidance and OAuth instructions as actionable.
- `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md` still centers obsolete integration diagnosis and stale permission framing.
- Conflicts with HC-only Android release posture and can mislead submission prep.
- Type: **In-repo blocker** (process/trust/compliance prep).

## Important

1. **Submission parity not proven end-to-end (Not fully verified)**
- `versionCode: 8` exists in config, but final uploaded artifact parity and merged manifest from built AAB are not yet evidenced in docs.
- Requires build + artifact diff + Console confirmation.

2. **Listing and creative package still manual (Manual verification required)**
- Needs explicit pass ensuring no over-claims (especially around unsupported Android HC reads).
- Screenshots/feature text must be aligned to current implementation.

3. **Runtime-device behavior not fully proven (Not fully verified)**
- Core call paths are statically verified, but physical-device smoke tests remain required for sync/insights/notification behavior.

## Secondary

1. **Lint warning debt (Non-blocking)**
- 12 eslint warnings (unused disable directives) remain.
- Does not block build/test but increases maintenance noise.

2. **Legacy warning noise in tests/tooling (Non-blocking)**
- `react-test-renderer` deprecation warning.
- `baseline-browser-mapping` stale data warning.

## Minor

1. **Potential confusion from mixed-era docs beyond verification set (Inference)**
- Additional historical docs may still contain old strategy text.
- Low direct release impact if gate docs are followed, but can mislead operators.

## Manual-only

1. Play declaration screenshots/export and row-by-row reconciliation.
2. Data Safety export and telemetry/Sentry declaration confirmation.
3. Privacy policy URL live verification and support contact checks.
4. Final native rebuild, merged manifest verification, and upload-track evidence capture.
5. Evidence archival to `docs/memory/raw/play-console/`.

---

## Fast triage order

1. Resolve/ quarantine contradictory internal health docs.
2. Build native artifact and verify merged manifest.
3. Complete Console declaration + Data Safety + listing/package checks.
4. Archive evidence in repo memory docs.
