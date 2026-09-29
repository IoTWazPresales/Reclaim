# N-0065 — static insight content review

## Source of truth and scope

Review all 89 records in `app/src/data/insights.json` against their existing
condition fields. The permitted edits are message, action and why text only.
IDs, priority, scopes, suppression, conditions, numeric thresholds, source tags,
icons and action routing remain unchanged. No catalogue review metadata changes.

The baseline contains unsupported mechanism claims (for example BDNF from a step
threshold), causal/personal interpretations of co-occurring logs, treatment-like
sleep/training prescriptions, and medication timing/storage instructions unrelated
to a particular medicine. Replace these with recorded observations, optional
reflection, and references to existing medication instructions or a pharmacist.
Numeric observations describe existing thresholds, not medical targets.

Retain urgent-support signposting and make the US scope of 988 explicit. Source:
[988 Lifeline About](https://988lifeline.org/About/), checked 2026-09-28.
Medication questions belong with medicine-specific instructions and the care team;
the FDA identifies timing, missed doses and storage as questions for a pharmacist:
[FDA pharmacist discussion guide](https://www.fda.gov/drugs/information-consumers-and-patients-drugs/stop-learn-go-tips-talking-your-pharmacist-learn-how-use-medicines-safely),
checked 2026-09-28. These sources support routing and service availability, not the
removed claims or any newly certified clinical content.

## Verification plan

Record field-level findings and before/after text. Parse the before/after data to
prove all non-copy contracts identical. Run existing insight behavior/action tests,
full verbose suite, types, Git Bash audit and catalogue QA. Device text rendering
requires the canonical Expo session and stays separate from source validation.

## Review outcome

All 89 records reviewed; 84 changed, 242 text fields changed. Per-record findings
are in `N0065_FIELD_FINDINGS.md`. The complete before/after copy is the commit diff
against `f4eb34e`. A Node.js `assert.deepEqual` check of parsed before/after records
after omitting only message/action/why proved every non-copy contract identical.
IDs, conditions, thresholds, ranking and navigation behavior were not retuned.

Review sampled the actual adherence, sleep-context and card-rendering producers,
not just prose. Absolute sleep-timing delta is not direction; weekly averages are
not last-night duration; unlogged doses/social tags are not confirmed events.
No clinical mechanism or catalogue review provenance was invented.

## Executed gates (2026-09-28)

- Focused existing InsightEngine, insightActions and insightVerifyLite tests:
  **3 files / 34 tests PASS**, 25.55 seconds. Local output:
  `.eif/audit/N0065-focused.txt`.
- `npm run typecheck`: **PASS**, zero errors; `N0065-typecheck.txt`.
- Git Bash `npm run audit:training-dual-paths`: **27/27 PASS**.
- `npm run med-catalog-qa`: **357 rows, zero governance issues**, QA test passes.
- `python -m pytest scripts/test_eif_node.py -q`: **3/3 PASS**, 6.23 seconds.
- Default `npm test -- --reporter=verbose`: **147/150 files, 950/953 tests PASS**;
  three 5000ms timeouts, 532.49 seconds. No assertion failures. Timed-out cases:
  routineVolumeMeasurement's scenario measurement; meditationSessionsRepository's
  canonical row load; smallModuleMirrors.read's local-ID deduplication. Product
  source for these cases was not changed. Raw output `N0065-vitest.txt` stays local.
- One documented full retry with `--testTimeout=30000`: **150 files / 953 tests
  PASS**, 465.04 seconds, exit 0. Output `.eif/audit/N0065-vitest-retry.txt`.
  No assertions or tests removed, no test configuration/product edit, no worker-
  pool experiments. Result reconciled on 2026-09-29 after the execution pause.

The default-timeout failure remains N-0052 evidence. A passing retry cannot erase
that observation or prove the default harness reliably green.

## Verification limits and follow-up

**Same-session self-verification, not independent model review.** Single-writer
constraints were preserved. Source scope/parity and focused gates are verified;
whole-wave independent verification and rendered acceptance are not claimed.

N-0067 is wrapper-chartered (feature/R2, depends N-0065) for the separate category
heading path in InsightCard: raw source tags such as sleep_serotonin are still
title-cased into clinical-sounding headings. Optional chemistry/association chips
remain a N-0035 review surface. The copy node does not certify the whole screen.

ADB returned no devices and Metro was unreachable in bounded checks. No environment
recovery was attempted. Actual visual checks and screenshot paths are in
`N0065_DEVICE_CHECK.md`; no screenshot or journey pass is fabricated.
