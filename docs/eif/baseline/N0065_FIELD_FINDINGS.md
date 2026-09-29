# N-0065 — field-level findings

Reviewed all 89 static insights against their condition fields. `message`, `action`
and `why` are the only changed fields. Before/after wording is preserved by the
N-0065 commit diff against `f4eb34e`; this table records the reason for each change.
Numeric observations refer to existing rule thresholds, never new clinical targets.

| Insight ID | Changed fields | Finding / disposition |
|---|---|---|
| mood-sustained-low | message, action, why | Unmeasured depletion and crisis-severity inference; qualify 988 service region. |
| mood-dip-watch | message, action, why | Unsupported proven interventions and crisis exclusion from rating. |
| sleep-debt-serotonin | message, action, why | Brain threat/chemistry inference and timed exercise prescription. |
| circadian-drift | message, action, why | Unsigned midpoint difference presented as circadian delay; caffeine timing prescription. |
| low-activity-mood | message, action, why | Energy-trap diagnosis, neurotransmitter claims and brisk activity prescription. |
| oversleep-inertia | message, action, why | Sleep-inertia inference and cold-water intervention. |
| social-buffering | message, action, why | Unmeasured social isolation and stress-response benefits. |
| vagal-tone-breath | message, action, why | Vagus/arousal inference and prescribed breath holds. |
| meds-high-consistency | message, action, why | Timing directive and unsupported automatic-habit explanation. |
| meds-moderate-drift | message, action, why | Assumed cause of lower adherence and meal/coffee dose anchors. |
| meds-rebuild | message, action, why | Directive to choose next dose time and unmeasured behavioral explanation. |
| mood-acute-low | message, action, why | Cognitive impairment and memory-bias inference. |
| mood-below-baseline | message, action, why | Hidden-load inference and promised rapid reset. |
| mood-above-baseline | message, action, why | Brain-reward and causal reinforcement inference. |
| mood-trend-down | message, action, why | Recovery-debt inference and guaranteed comparative intervention. |
| dopamine-downshift | message, action, why | Chemical explanation of motivation and promised reward effect. |
| mood-trend-up | message, action, why | Habit repetition presented as maintaining a causal mood slope. |
| mood-stress-flag | message, action, why | Direct arousal/cognitive-control claims and breath prescription. |
| mood-no-tags | why | Guarantee of more personal/accurate insights. |
| sleep-chronic-debt | message, action, why | Diagnosis from mean duration and hormone explanation. |
| sleep-preventive-short-night | message, action, why | Prescribed nap timing and guaranteed preservation of sleep. |
| circadian-advance | message, action, why | Body-clock diagnosis and prescribed evening light/bedtime. |
| flat-day-sleep-steps | message, action, why | Low-arousal diagnosis and neurotransmitter benefit claim. |
| stress-trend-combo | message, action, why | Protection-mode and causal load inference. |
| meds-low-mood-load | message, action, why | Executive-function explanation and unapproved reminder/schedule simplification. |
| training-mood-lift-today | message, action, why | Personal correlation from one co-occurrence and neurotransmitter claims. |
| training-movement-resets | message, action, why | Exercise-over-rest superiority and prescribed session duration. |
| training-sleep-deload | message, action, why | Uncited 15–20% prescription, physiology and injury-risk claims. |
| training-reentry | message, action, why | Uncited 60–70% load and assumption that barriers are psychological. |
| training-high-volume-fatigue | message, action, why | Overreach inference and guarantee that a rest day accelerates progress. |
| training-low-volume-mood | message, action, why | Neurotransmitter effects and promised mood shift from prescribed activity. |
| training-consistency-streak | message, why | Uncited frequency threshold for BDNF/adaptation. |
| training-rest-day-momentum | message, action, why | Assumed rest day and superior planning from positive mood. |
| training-sleep-boost | message, action, why | Strongest-adaptation claim and seven-hour prescription. |
| sleep_fallback | message, action, why | Unconditional treatment-like light/wake-time advice. |
| mood_fallback | action, why | Causal journaling wording and guarantee of more specific insights. |
| meds_fallback | message, action, why | Unqualified meal/coffee dose anchors and automatic-habit claim. |
| dashboard_fallback | message, action, why | Unconditional behavioral benefit promises. |
| fallback-global-breath | message, action, why | Fastest/direct arousal intervention guarantee. |
| fallback-dashboard-water | message, action, why | Unmeasured dehydration explanation and automatic fluid instruction. |
| sleep-low-efficiency | message, action, why | Sleep restriction treatment and time-in-bed prescription. |
| sleep-low-deep | message, action, why | Incomplete-recovery inference and prescriptive alcohol/exercise timing. |
| sleep-low-rem | message, action, why | REM mechanism and full-night prescription based on tracker estimate. |
| sleep-debt-accumulating | message, action, why | Cognitive impairment claim and prescribed nap/bedtime. |
| sleep-quality-drop | message, action, why | Weekly mean mistaken for last-night duration; cortisol/micro-arousal diagnosis. |
| sleep-circadian-late-shift | message, action, why | Circadian-delay diagnosis and fixed light/dimming regimen. |
| mood-below-personal-baseline | message, action, why | One-point clinical-significance assertion and hidden-load inference. |
| sleep-below-personal-baseline | message, action, why | Measured average treated as physiological need; screen/wake-time regimen. |
| cross-sleep-mood-steps-triple | message, action, why | Depletion diagnosis, shared physiology and prediction of worsening. |
| cross-meds-mood-drop | message, action, why | Low percentage described as a drop; causal link and new daily dose timing. |
| cross-training-sleep-mood-lift | message, action, why | Performance/readiness inference and additional hard-session recommendation. |
| cross-stress-sleep-meds | message, action, why | Cortisol/impulsivity mechanism and one-hour-earlier bedtime prescription. |
| meds-catalog-sleep-overlap | message | Single-night duration described as an ongoing sleep trend. |
| meds-catalog-mood-overlap | retained | Retain: explicitly treats tags and mood as context without judging treatment. |
| meds-catalog-training-overlap | message | Single gap described as widening; unmeasured sleep/soreness context. |
| cross-isolation-mood-trend | message, action, why | Reward/stress mechanism and isolation inferred from missing tags. |
| cross-sleep-steps-recovery | message, action, why | Incomplete hormone/muscle recovery and precise temperature/sleep regimen. |
| mood-good-reinforce | message, action | Observed improvement described as proof of what works. |
| mood-resilience-after-low | message, action, why | Recovery/resilience attribution and protective self-efficacy claims. |
| sleep-good-reinforce | message, action, why | Working causal loop and circadian benefit guarantee. |
| sleep-consistent-timing | message, action | Daytime-alertness prediction and advice to prioritize timing over sleep duration. |
| meds-great-streak | message, action, why | Therapeutic-level claim and rigid medication timing. |
| meds-recovery-after-miss | retained | Retain: distinguishes unlogged from missed doses and refers to instructions/pharmacist. |
| steps-great-day | message, action, why | 10,000-step BDNF/inflammation threshold and compulsory follow-up activity. |
| steps-sedentary-streak | message, action, why | Single count labeled a streak/today; neurochemical-deficit claim. |
| stress-without-sleep-hit | retained | Retain: explicitly separates recorded stress and sleep duration from causal explanation. |
| training-7d-consistency | message, action, why | BDNF threshold, productive-rhythm inference and cortisol claim. |
| training-overreaching-risk | message, action, why | Overreaching diagnosis and fixed active-rest treatment. |
| training-deload-needed | message, action, why | Uncited 40% deload prescription and reduced-gains/physiology claims. |
| sleep-nap-opportunity | message, action, why | Guaranteed nap sleep stage, alertness and absence of sleep disruption. |
| mood-anchor-morning | message, action, why | One-sided trend condition labeled stable; cortisol/attention benefits. |
| meds-morning-anchor | message, action, why | Morning-dose/storage directive and behavioral certainty. |
| social-recharge-needed | message, action, why | Isolation/neurotransmitter inference and guaranteed benefit from contact. |
| circadian-delay-risk-evening | message, action, why | Unsigned timing difference labeled delay; rigid screens/light regimen. |
| stress-high-steps-antidote | message, action, why | Personal benefit inferred from co-occurrence and cortisol/endorphin claims. |
| mood-high-sleep-low-mismatch | message, action, why | Adrenaline explanation and asserted hidden neurological deficit. |
| training-mood-after-session | message, action, why | Assumed exercise benefit and implied before/after evidence. |
| sleep-weekend-recovery | message, action, why | One-hour recovery prescription and invented weekend context. |
| mood-journaling-cue | message, action, why | One tag misreported as no tags; overpromised hidden connections. |
| steps-progressive-build | message, action, why | Uncited 1,000-step/10–15% progression and stable-mood/readiness inference. |
| meds-low-critical | message, action, why | Treatment impact and barrier diagnosis from incomplete dose logs. |
| sleep-efficiency-good | message, action, why | Sleep architecture and guaranteed quality inferred from efficiency. |
| mood-flat-activation | message, action, why | Neurological activation claim and guaranteed leverage. |
| recovery-full-day-check | message, action, why | All-clear/peak-cognitive-capacity inference. |
| steps-above-personal-baseline | message, action, why | Unsupported neurochemical benefit and ambiguous today timing. |
| social-connected-mood-up | message, action, why | Causal social-benefit inference and guaranteed protective effect. |
| training-weekly-active-energy | retained | Retain: energy described as a connected-health estimate and context, without a target. |
| sleep-overnight-vitals-context | retained | Retain: tracker estimates explicitly non-diagnostic, with clinical assessment for concerns. |
| resting-hr-trend-up-mood-soft | message, action, why | Unmeasured causal possibilities and lighter-day/wind-down prescription. |

