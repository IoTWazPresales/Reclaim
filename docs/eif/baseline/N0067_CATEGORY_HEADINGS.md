# N-0067 — neutral insight category headings

## Source of truth

`InsightCard` renders `formatInsightCategory(insight.sourceTag)` as the category
line under the card title. Before this node that function title-cased the raw
`sourceTag` (`sleep_serotonin` became "Sleep Serotonin"). Persisted tags, rule
IDs, conditions, action routes and `source_tag` telemetry stay on the insight
record. Chemistry chips still come from `getTagForInsight` and remain N-0035.

Display mapping lives in `app/src/lib/insights/insightCategoryLabel.ts`.
Unknown keys, including ones that name a mechanism, display "Daily signal"
and are not title-cased. Empty tags keep "Daily signal".

## Mechanism and clinical headings by ID

These catalogue rows title-cased an internal tag into a mechanism, sleep-stage,
or clinical heading. The stored `sourceTag` is unchanged.

| Rule ID | sourceTag | Previous heading | Display label |
|---|---|---|---|
| sleep-debt-serotonin | sleep_serotonin | Sleep Serotonin | Sleep |
| circadian-drift | sleep_circadian | Sleep Circadian | Sleep timing |
| low-activity-mood | mood_activity_endorphins | Mood Activity Endorphins | Mood |
| oversleep-inertia | sleep_inertia | Sleep Inertia | Sleep |
| vagal-tone-breath | sleep_breath_vagal | Sleep Breath Vagal | Breathing |
| dopamine-downshift | mood_dopamine | Mood Dopamine | Mood |
| stress-trend-combo | mood_allostatic_load | Mood Allostatic Load | Mood |
| circadian-advance | sleep_circadian_advance | Sleep Circadian Advance | Sleep timing |
| cross-sleep-mood-steps-triple | cross_depletion_triple | Cross Depletion Triple | Patterns |
| sleep-low-deep | sleep_deep_low | Sleep Deep Low | Sleep |
| sleep-low-rem | sleep_rem_mood | Sleep Rem Mood | Sleep |
| sleep-circadian-late-shift | sleep_circadian_late | Sleep Circadian Late | Sleep timing |
| circadian-delay-risk-evening | circadian_delay_risk | Circadian Delay Risk | Sleep timing |
| resting-hr-trend-up-mood-soft | vitals_resting_hr_trend_mood | Vitals Resting Hr Trend Mood | Recovery |

The other 75 catalogue rows also stop showing internal tokens (fallback,
friction, override, kcal, and similar). They use the same domain labels:
Sleep, Mood, Medication, Training, Movement, Stress, Social, Today, Patterns,
Recovery, plus Breathing and Sleep timing where the table says so. Bare tags
already used in product code stay domain labels: `sleep` → Sleep, `mood` → Mood,
`breath` → Breathing.

## What did not change

- `app/src/data/insights.json` was not edited.
- Telemetry still sends `source_tag: insight.sourceTag`.
- `getTagForInsight('sleep_serotonin')` is still serotonin / melatonin / cortisol.
  Nerd-mode chemistry chips are N-0035, not this heading change.
- Therapist-export HTML still prints `sourceTag` with underscores turned into
  spaces (`app/src/lib/export/therapistReport.ts`). That pill is a separate
  surface and was not edited here.

## Consult

`.eif/CONSULT.md` is the written protocol. The Cursor entry it would use,
`dual-agent-fable`, is an empty skill file. No consult script, `cursor`/`agent`/
`codex` CLI, or provider API environment name was present. No consult call was
made and no billing route was exercised. This node is same-session
self-verification, not an independent model review.

## Gates (2026-09-29)

- Focused `insightCategoryLabel.test.ts`: **6/6 PASS**.
- `npm run typecheck`: **PASS**, zero errors.
- Git Bash `npm run audit:training-dual-paths`: **27/27 PASS**.
- `npm run med-catalog-qa`: **357 rows, zero governance issues**.
- `python -m pytest scripts/test_eif_node.py -q`: **3/3 PASS**.
- Default `npm test -- --reporter=verbose`: **150/151 files, 958/959 tests**.
  One 5000ms timeout: `smallModuleMirrors.read` duplicate `local_id` dedupe.
  No assertion failure. Same N-0052 case as the N-0065 default run. Local output
  `.eif/audit/N0067-vitest.txt` (not committed).
- One retry with `--testTimeout=30000`: **151 files / 959 tests PASS**, exit 0.
  Output `.eif/audit/N0067-vitest-retry.txt`. No test was removed or retimed in
  source. The default timeout remains N-0052 evidence.

Rendered ordinary and large-text cards are separate: `N0067_DEVICE_CHECK.md`.
Same-session self-verification only. No clinical validation is claimed.
