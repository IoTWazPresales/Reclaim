# N-0028 — association language

Source of truth: static insight copy in `app/src/data/insights.json`, static catalogue
mechanism descriptions, `chemistryGlossary.ts`, Mood's context card and the calendar
notification body. Rule conditions, IDs, catalogue matches and action routing remain
the existing authorities.

The scan found affirmative cause/causes wording in four insight explanations, three
catalogue descriptions, the glossary and one calendar hint. Mood labels its parallel
sleep/medication context "Cause links". Correct these without inferring causes from
tracked observations, authoring new medical claims, or changing rule thresholds.
Keep explicit denials of causation and implementation comments unchanged.

The missed-dose insight also instructs users to restart dosing. Remove that instruction
and refer users to medication instructions or their pharmacist. Other unsupported
clinical/mechanistic certainty in the same static insight catalogue needs its own
chartered content review; this bounded pass does not certify all clinical content.

Validation: existing insight/catalogue tests, full verbose suite, typecheck, Git Bash
dual-path audit and a targeted causal-language scan. Visual acceptance requires the
Mood card plus triggered insight/education surfaces on the canonical Expo AVD; source
inspection alone does not satisfy that gate.

## Review and remaining limits

The verification-controller pass checked the combined copy diff against each rule's
inputs. The stress message describes its actual seven-hour condition rather than
inferring sleep quality or a change against baseline. No conditions, thresholds,
catalogue identifiers, match keys or review tiers changed. No treatment or mechanism
was added. Broader health-claim certainty is now chartered as N-0065 (for example,
`steps-great-day`, `steps-sedentary-streak`, `meds-great-streak`, and the sleep timing
action). Explicit "not as cause" / "not proof of cause" disclaimers are retained.

Device checks are UNABLE_TO_VERIFY: no ADB device or reachable Metro on 2026-09-28.
See `N0028_DEVICE_CHECK.md`; no environment recovery loop was started.

## Gates

- Focused existing insight/catalogue suites: 3 files / 25 tests PASS.
- Full verbose suite: 147 files / 923 tests PASS (154.93 s), including catalogue
  QA, schema drift and Health Connect permission-use checks.
- Typecheck: exit 0. Git Bash dual-path audit: 27/27 PASS.
- Parsed before/after comparison: all 89 insight rules retain their IDs, conditions,
  priorities and action routes; catalogue metadata unchanged outside mechanism copy.
- Targeted scan: no affirmative cause/causes wording remains in the edited strings;
  explicit non-causation disclaimers remain. Product diff whitespace check clean.
- Local logs: `.eif/audit/N0028-focused.txt`, `N0028-typecheck.txt`, `N0028-vitest.txt`.
- Initial sandbox focused run stalled; stopped only that run. Outside-sandbox focused
  run and full default suite completed. N-0052 retains general harness reproducibility.
