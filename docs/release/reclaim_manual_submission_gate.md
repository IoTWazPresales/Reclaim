# Reclaim — manual submission gate

**Purpose:** Final manual checklist before Play submission.  
**Status model:** mark each as `Done` / `Pending` / `Blocked` with evidence links.

---

## A. Play Console health declaration gate

- [ ] Export current Health Connect declaration screens to `docs/memory/raw/play-console/`.
- [ ] Confirm declaration rows exactly match shipped merged manifest HC permissions:
  - `READ_SLEEP`
  - `READ_HEART_RATE`
  - `READ_OXYGEN_SATURATION`
  - `READ_RESPIRATORY_RATE`
  - `READ_BODY_TEMPERATURE`
- [ ] Confirm **no** rows for Android HC data types not currently in scope (steps/calories/RHR/HRV).
- [ ] Record evidence artifact names in release notes / PR comment.

## B. Data safety gate

- [ ] Export Data Safety form/screens to `docs/memory/raw/play-console/`.
- [ ] Confirm declaration reflects app telemetry behavior (`app_logs`, `user_id` linkage as applicable).
- [ ] Confirm Sentry usage is accurately represented (collection/share/retention fields as applicable).
- [ ] Confirm health data categories match current in-app usage and claim language.

## C. Listing copy gate

- [ ] Short and full descriptions align with HC-only Android posture.
- [ ] No listing claims for unsupported Android HC reads (steps/calories/RHR/HRV).
- [ ] HR-based mindfulness nudge wording is optional/non-clinical and not overstated.
- [ ] Home story language is consistent with current app (“Daily signal” primary, recovery support).

## D. Screenshots and creative gate

- [ ] Screenshot set reflects current app UI (no deprecated placeholders/test tooling).
- [ ] Feature graphic and screenshot captions do not over-claim capabilities.
- [ ] If tier-1 cleanup changed visuals, refresh screenshots accordingly.

## E. Privacy/support gate

- [ ] `PRIVACY_POLICY_URL` resolves publicly (incognito + mobile browser).
- [ ] Policy content matches actual collection/processing behavior.
- [ ] Support contact/email in Play Console is active and monitored.

## F. Version/build parity gate

- [ ] Confirm release uses intended version metadata (`versionCode: 8` currently in config).
- [ ] Build new native binary after permission/config changes (required).
- [ ] Diff merged manifest from built artifact against source expectations.
- [ ] Confirm uploaded artifact in Console matches intended commit/build metadata.

## G. Native rebuild requirement (mandatory)

- [ ] Rebuild native Android artifact after `app.config`/manifest-level changes.
- [ ] Validate resulting permissions and Health Connect declaration from built artifact, not source assumptions.

## H. Evidence export back into repo memory

- [ ] Store Play declaration screenshots/PDFs in `docs/memory/raw/play-console/`.
- [ ] Store Data Safety evidence in same location.
- [ ] Add timestamped note mapping artifacts to submission attempt and track/version code.

---

## Current known blockers before credible submission package

1. Console declaration/data safety evidence not yet captured in repo (manual-only, critical).
2. Internal health docs still contain contradictory legacy guidance and should be corrected or explicitly quarantined before handoff:
   - `app/Documentation/HEALTH_FIXES_SUMMARY.md`
   - `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md`

---

## Sign-off template

- Release manager:
- Date:
- Build/version code:
- Console evidence paths:
- Remaining accepted risks:
