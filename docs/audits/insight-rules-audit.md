# Insight rules audit (Unit 2)

**Date:** 2026-07-17
**Source:** `app/src/data/insights.json` (89 rules)
**Engine:** `InsightEngine` + `insightActions.resolveInsightAction`
**Free tier:** After `evaluateAll` (priority-sorted matches), `InsightsProvider` slices to `FREE_RULE_LIMIT` (10). Not file order.
**Promotional run:** stays ON until ≥1000 users (Human lock).

## Summary

| Metric | Value |
|--------|-------|
| Total rules | 89 |
| With actionIntent | 84 |
| Advice-only (no intent) | 5 |
| suppressible:false (safety) | mood-sustained-low, mood-acute-low |
| Clinical-language hits (audit regex) | 0 |
| Missing why | 0 |
| Newly assigned intents this pass | 0 |

## Free-tier note

Free users see the top 10 **matching** insights by engine sort (priority desc → condition count → id). Safety rules `mood-sustained-low` and `mood-acute-low` sit at priority 20 so they win when they fire. Executable intents on high-priority sleep/mood/training rules make the free loop actionable when those fire.

## Highest priority rules (reference)

| Pri | Id | Intent | Flag |
|-----|----|--------|------|
| 20 | `mood-acute-low` | open_mood_checkin | safety |
| 20 | `mood-sustained-low` | advice_only | safety |
| 19 | `mood-dip-watch` | open_mood_checkin | general |
| 18 | `sleep-debt-serotonin` | open_sleep | sleep_hc |
| 17 | `cross-sleep-mood-steps-triple` | open_sleep | training_hc |
| 17 | `mood-above-baseline` | open_mood_checkin | general |
| 17 | `mood-below-baseline` | open_mood_checkin | general |
| 17 | `mood-below-personal-baseline` | open_mood_checkin | general |
| 16 | `circadian-drift` | open_sleep | sleep_hc |
| 16 | `cross-meds-mood-drop` | open_meds_today | meds |
| 16 | `mood-trend-down` | open_mood_checkin | general |
| 16 | `mood-trend-up` | open_mood_checkin | general |
| 16 | `sleep-debt-accumulating` | open_sleep | sleep_hc |
| 16 | `training-mood-lift-today` | open_mood_checkin | training_hc |
| 16 | `training-movement-resets` | open_training | training_hc |

## Full matrix

| Id | Scopes | Pri | Trigger (summary) | Msg | Why | Action | Intent | Flag | Notes |
|----|--------|-----|-------------------|-----|-----|--------|--------|------|-------|
| `mood-acute-low` | mood, dashboard | 20 | mood.last lte 2 | ok | ok | ok | open_mood_checkin | safety | non-suppressible |
| `mood-sustained-low` | mood, dashboard | 20 | mood.trend3dPct pctLt -15; mood.last lte 2 | ok | long | ok | — | safety | non-suppressible; advice_only_ok |
| `mood-dip-watch` | mood, dashboard | 19 | mood.trend3dPct pctLt -15; mood.last eq 3 | ok | ok | ok | open_mood_checkin | general | — |
| `sleep-debt-serotonin` | sleep, dashboard | 18 | mood.last lt 3; sleep.lastNight.hours lt 6 | ok | long | ok | open_sleep | sleep_hc | — |
| `cross-sleep-mood-steps-triple` | dashboard | 17 | sleep.lastNight.hours lt 6.5; mood.last lte 3; steps.lastDay lt 3000 | ok | long | ok | open_sleep | training_hc | — |
| `mood-above-baseline` | mood, dashboard | 17 | mood.deltaVsBaseline gte 1 | ok | ok | ok | open_mood_checkin | general | — |
| `mood-below-baseline` | mood, dashboard | 17 | mood.deltaVsBaseline lte -1 | ok | ok | ok | open_mood_checkin | general | — |
| `mood-below-personal-baseline` | mood, dashboard | 17 | mood.belowBaseline gt 1 | ok | ok | ok | open_mood_checkin | general | — |
| `circadian-drift` | sleep, dashboard | 16 | sleep.midpoint.deltaMin gt 90 | ok | long | ok | open_sleep | sleep_hc | — |
| `cross-meds-mood-drop` | meds, mood, dashboard | 16 | meds.adherencePct7d lt 65; mood.trend3dPct pctLt -12 | ok | long | ok | open_meds_today | meds | — |
| `mood-trend-down` | mood, dashboard | 16 | mood.trend3dPct pctLt -10 | ok | ok | ok | open_mood_checkin | general | — |
| `mood-trend-up` | mood, dashboard | 16 | mood.trend3dPct pctGt 10 | ok | ok | ok | open_mood_checkin | general | — |
| `sleep-debt-accumulating` | sleep, dashboard | 16 | sleep.debtHours gt 6 | ok | long | ok | open_sleep | sleep_hc | — |
| `training-mood-lift-today` | dashboard, mood | 16 | training.completedToday eq true; mood.last gte 4 | ok | ok | ok | open_mood_checkin | training_hc | — |
| `training-movement-resets` | dashboard, mood | 16 | training.daysSinceLastSession gte 3; mood.last lte 3 | ok | long | ok | open_training | training_hc | — |
| `cross-stress-sleep-meds` | dashboard | 15 | flags.stress eq true; sleep.lastNight.hours lt 6.5; meds.adherencePct7d lt 75 | ok | long | ok | open_sleep | meds | — |
| `cross-training-sleep-mood-lift` | dashboard | 15 | training.completedToday eq true; sleep.avg7d.hours gte 7; mood.last gte 4 | ok | ok | ok | open_training | training_hc | — |
| `meds-low-critical` | meds, dashboard | 15 | meds.adherencePct7d lt 50 | ok | long | ok | open_meds_today | meds | — |
| `mood-stress-flag` | mood, dashboard | 15 | flags.stress eq true | ok | ok | ok | open_meditation | general | — |
| `sleep-chronic-debt` | sleep, dashboard | 15 | sleep.avg7d.hours lt 6.5 | ok | ok | ok | open_sleep | sleep_hc | — |
| `sleep-quality-drop` | sleep, dashboard | 15 | sleep.lastNight.quality lt 50; sleep.avg7d.hours gte 6.5 | ok | long | ok | open_sleep | sleep_hc | — |
| `training-reentry` | dashboard | 15 | training.daysSinceLastSession gte 7 | ok | long | ok | open_training | training_hc | — |
| `training-sleep-deload` | dashboard, sleep | 15 | training.completedToday eq true; sleep.lastNight.hours lt 6 | ok | ok | ok | open_training | training_hc | — |
| `vagal-tone-breath` | sleep, mood, dashboard | 15 | tags.contains eq "stressed"; sleep.lastNight.hours lt 6 | ok | ok | ok | open_meditation | general | — |
| `cross-isolation-mood-trend` | mood, dashboard | 14 | behavior.daysSinceSocial gt 4; mood.trend3dPct pctLt -10 | ok | ok | ok | open_mood_checkin | general | — |
| `low-activity-mood` | mood, dashboard | 14 | steps.lastDay lt 2000; mood.last lt 4 | ok | long | ok | open_training | general | — |
| `meds-catalog-mood-overlap` | meds, mood, dashboard | 14 | meds.domainOverlap.mood eq true; mood.trend3dPct pctLt -8 | ok | ok | ok | — | meds | advice_only_ok; educational_catalog |
| `meds-catalog-sleep-overlap` | meds, sleep, dashboard | 14 | meds.domainOverlap.sleep eq true; sleep.lastNight.hours lt 6.5 | ok | long | ok | — | meds | advice_only_ok; educational_catalog |
| `sleep-below-personal-baseline` | sleep, dashboard | 14 | sleep.belowBaseline gt 1.5 | ok | ok | ok | open_sleep | sleep_hc | — |
| `sleep-low-efficiency` | sleep, dashboard | 14 | sleep.lastNight.efficiency lt 80; sleep.lastNight.hours lt 7 | ok | ok | ok | open_sleep | sleep_hc | — |
| `stress-trend-combo` | mood, dashboard | 14 | mood.trend3dPct pctLt -10; tags.contains eq "stressed" | ok | ok | ok | open_meditation | general | — |
| `stress-without-sleep-hit` | mood, dashboard | 14 | flags.stress eq true; sleep.lastNight.hours gte 7 | ok | long | ok | open_meditation | sleep_hc | — |
| `training-high-volume-fatigue` | dashboard, mood | 14 | training.weeklySessionCount gte 5; mood.last lte 3 | ok | long | ok | open_training | training_hc | — |
| `cross-sleep-steps-recovery` | sleep, dashboard | 13 | sleep.avg7d.hours lt 7; steps.lastDay gt 8000 | ok | long | ok | open_sleep | training_hc | — |
| `flat-day-sleep-steps` | dashboard, sleep | 13 | sleep.lastNight.hours lt 6.5; steps.lastDay lt 2500 | ok | ok | ok | open_training | training_hc | — |
| `meds-catalog-training-overlap` | meds, dashboard | 13 | meds.domainOverlap.training eq true; training.daysSinceLastSession gt 5 | ok | ok | ok | — | meds | advice_only_ok; educational_catalog |
| `sleep-low-deep` | sleep, dashboard | 13 | sleep.lastNight.deepMinutes lt 40; sleep.lastNight.hours gte 6 | ok | ok | ok | open_sleep | sleep_hc | — |
| `sleep-low-rem` | sleep, dashboard | 13 | sleep.lastNight.remMinutes lt 60; mood.last lte 3 | ok | ok | ok | open_sleep | sleep_hc | — |
| `sleep-preventive-short-night` | sleep, dashboard | 13 | sleep.lastNight.hours lt 6; mood.last gte 4 | ok | ok | ok | open_sleep | sleep_hc | — |
| `social-buffering` | mood, dashboard | 13 | mood.trend3dPct pctLt -8; behavior.daysSinceSocial gt 4 | ok | ok | ok | open_mood_checkin | general | — |
| `steps-sedentary-streak` | dashboard | 13 | steps.lastDay lt 1500 | ok | long | ok | open_training | training_hc | — |
| `training-low-volume-mood` | dashboard, mood | 13 | training.weeklySessionCount lte 1; mood.trend3dPct pctLt -10 | ok | long | ok | open_training | training_hc | — |
| `training-overreaching-risk` | dashboard | 13 | training.weeklySessionCount gte 6; sleep.avg7d.hours lt 7; mood.last lte 3 | ok | long | ok | open_training | training_hc | — |
| `circadian-advance` | sleep, dashboard | 12 | sleep.midpoint.signedDeltaMin lt -90 | ok | ok | ok | open_sleep | sleep_hc | — |
| `meds-low-mood-load` | meds, mood, dashboard | 12 | meds.adherencePct7d lt 70; mood.deltaVsBaseline lte -1 | ok | ok | ok | open_meds_today | meds | — |
| `mood-high-sleep-low-mismatch` | dashboard | 12 | mood.last gte 4; sleep.lastNight.hours lt 6 | ok | long | ok | open_sleep | sleep_hc | — |
| `mood-no-tags` | mood,dashboard | 12 | tags.count eq 0 | ok | ok | ok | open_mood_checkin | general | — |
| `oversleep-inertia` | sleep, dashboard | 12 | sleep.lastNight.hours gt 9.5; mood.deltaVsBaseline lt -0.5 | ok | ok | ok | open_sleep | sleep_hc | — |
| `stress-high-steps-antidote` | mood, dashboard | 12 | flags.stress eq true; steps.lastDay gt 7000 | ok | long | ok | open_training | training_hc | — |
| `training-consistency-streak` | dashboard | 12 | training.weeklySessionCount gte 3 | ok | ok | ok | open_analytics | training_hc | — |
| `training-deload-needed` | dashboard | 12 | training.weeklySessionCount gte 4; sleep.debtHours gt 4 | ok | long | ok | open_training | training_hc | — |
| `meds-great-streak` | meds, dashboard | 11 | meds.adherencePct7d gte 85; meds.adherencePct7d lt 95 | ok | ok | ok | open_meds_today | meds | — |
| `meds-high-consistency` | meds, dashboard | 11 | meds.adherencePct7d gte 95 | ok | ok | ok | open_meds_today | meds | — |
| `meds-recovery-after-miss` | meds, dashboard | 11 | meds.adherencePct7d gte 70; meds.adherencePct7d lt 85 | ok | long | ok | open_meds_today | meds | — |
| `sleep-circadian-late-shift` | sleep, dashboard | 11 | sleep.midpoint.signedDeltaMin gt 90 | ok | ok | ok | open_sleep | sleep_hc | — |
| `social-recharge-needed` | mood, dashboard | 11 | behavior.daysSinceSocial gt 6; mood.last lte 3 | ok | long | ok | open_mood_checkin | general | — |
| `training-rest-day-momentum` | dashboard | 11 | training.daysSinceLastSession gte 1; training.daysSinceLastSession lt 3; mood.last gte 4 | ok | ok | ok | open_training | training_hc | — |
| `training-sleep-boost` | dashboard, sleep | 11 | training.weeklySessionCount gte 2; sleep.avg7d.hours gte 7 | ok | long | ok | open_training | training_hc | — |
| `circadian-delay-risk-evening` | sleep, dashboard | 10 | sleep.midpoint.deltaMin gt 60; sleep.lastNight.hours lt 7 | ok | long | ok | open_sleep | sleep_hc | — |
| `meds-moderate-drift` | meds, dashboard | 10 | meds.adherencePct7d gte 70; meds.adherencePct7d lt 90 | ok | ok | ok | open_meds_today | meds | — |
| `mood-flat-activation` | mood, dashboard | 10 | mood.last eq 3; mood.trend3dPct pctLt 0; mood.trend3dPct pctGt -8 | ok | long | ok | open_mood_checkin | general | — |
| `sleep-consistent-timing` | sleep, dashboard | 10 | sleep.midpoint.deltaMin lt 30 | ok | ok | ok | open_sleep | sleep_hc | — |
| `sleep-nap-opportunity` | sleep, dashboard | 10 | sleep.lastNight.hours lt 6.5; sleep.avg7d.hours gte 6.5 | ok | long | ok | open_sleep | sleep_hc | — |
| `sleep-weekend-recovery` | sleep, dashboard | 10 | sleep.debtHours gt 3; sleep.avg7d.hours lt 7.5 | ok | long | ok | open_sleep | sleep_hc | — |
| `training-7d-consistency` | dashboard | 10 | training.weeklySessionCount gte 3; mood.last gte 3 | ok | long | ok | open_training | training_hc | — |
| `meds-rebuild` | meds, dashboard | 9 | meds.adherencePct7d lt 70 | ok | ok | ok | open_meds_today | meds | — |
| `mood-resilience-after-low` | mood, dashboard | 9 | mood.last gte 4; mood.trend3dPct pctGt 15 | ok | long | ok | open_mood_checkin | general | — |
| `training-mood-after-session` | dashboard | 9 | training.completedToday eq true; mood.last lte 3 | ok | long | ok | open_analytics | training_hc | — |
| `dopamine-downshift` | mood, dashboard | 8 | mood.trend3dPct pctLt -10; tags.contains eq "stressed" | ok | ok | ok | open_mood_checkin | general | — |
| `meds-morning-anchor` | meds | 8 | meds.adherencePct7d lt 80; meds.adherencePct7d gte 50 | ok | long | ok | open_meds_today | meds | — |
| `mood-good-reinforce` | mood, dashboard | 8 | mood.last gte 4; mood.trend3dPct pctGt 5 | ok | ok | ok | open_mood_checkin | general | — |
| `social-connected-mood-up` | mood, dashboard | 8 | behavior.daysSinceSocial lt 2; mood.last gte 4 | ok | long | ok | open_mood_checkin | general | — |
| `steps-progressive-build` | dashboard | 8 | steps.lastDay gte 3000; steps.lastDay lt 6000; mood.last gte 3 | ok | long | ok | open_training | training_hc | — |
| `sleep-efficiency-good` | sleep, dashboard | 7 | sleep.lastNight.efficiency gte 90 | ok | long | ok | open_sleep | sleep_hc | — |
| `sleep-good-reinforce` | sleep, dashboard | 7 | sleep.lastNight.hours gte 7.5; mood.last gte 4 | ok | long | ok | open_sleep | sleep_hc | — |
| `steps-above-personal-baseline` | dashboard | 7 | steps.aboveBaseline gt 1000; mood.last gte 3 | ok | long | ok | open_training | training_hc | — |
| `steps-great-day` | dashboard | 7 | steps.lastDay gt 10000 | ok | long | ok | open_training | training_hc | — |
| `mood-anchor-morning` | mood, dashboard | 6 | mood.last gte 3; mood.trend3dPct pctGt -5 | ok | long | ok | open_mood_checkin | general | — |
| `mood-journaling-cue` | mood | 6 | mood.last lte 3; tags.count lt 2 | ok | long | ok | open_mood_checkin | general | — |
| `recovery-full-day-check` | dashboard | 6 | sleep.lastNight.hours gte 7.5; mood.last gte 4; steps.lastDay gte 7000 | ok | ok | ok | open_mood_checkin | general | — |
| `training-weekly-active-energy` | dashboard | 6 | training.weeklyActiveKcalSum gte 200 | ok | ok | ok | open_training | training_hc | — |
| `sleep-overnight-vitals-context` | sleep, dashboard | 5 | sleep.lastNight.avgSpO2 gte 85; sleep.lastNight.avgRespiratoryRate gte 8 | ok | ok | ok | open_sleep | sleep_hc | — |
| `resting-hr-trend-up-mood-soft` | dashboard, global | 4 | vitals.restingHrTrendLabel eq "above_baseline"; mood.last lt 4 | long | ok | ok | open_meditation | sleep_hc | — |
| `dashboard_fallback` | dashboard | 2 | (none) | ok | ok | ok | open_mood_checkin | general | — |
| `meds_fallback` | meds | 2 | (none) | ok | ok | ok | open_meds_today | meds | — |
| `mood_fallback` | mood | 2 | (none) | ok | ok | ok | open_mood_checkin | general | — |
| `sleep_fallback` | sleep | 2 | (none) | ok | ok | ok | open_sleep | sleep_hc | — |
| `fallback-global-breath` | global, dashboard, mood, sleep, meds | 1 | (none) | ok | ok | ok | open_meditation | meds | — |
| `fallback-dashboard-water` | dashboard | 0 | (none) | ok | ok | ok | — | general | advice_only_ok |

## Play / HC field coverage

| HC / domain | Example rule ids |
|-------------|------------------|
| Sleep (+ overnight vitals path) | sleep-*, circadian-*, sleep-overnight-vitals-context |
| Steps | steps-*, flat-day-sleep-steps, cross-sleep-mood-steps-triple, stress-high-steps-antidote |
| Active calories / training energy | training-weekly-active-energy, training-* |
| Heart rate / resting trend | resting-hr-trend-up-mood-soft, sleep overnight HR via context |
| Meds (educational only) | meds-*, meds-catalog-*, cross-meds-* |

## Fix pass applied (Unit 2)

- Expanded `actionIntent` coverage for clear executable advice (navigate/log).
- Left true guidance-only / catalog-educational rules without intent (advice_only via resolver).
- No threshold/science retunes; no clinical copy rewrites required (0 regex hits).
- Consistency test: every present `actionIntent` must resolve to a non-advice_only action.

## Deferred (post-Play / Unit 3+)

- Lagged personal correlation discovery
- Verify-lite acknowledgment after action (Unit 3)
- Free-tier priority science retunes beyond current ranks
- Promotional-run / paywall unwind (locked until ≥1000 users