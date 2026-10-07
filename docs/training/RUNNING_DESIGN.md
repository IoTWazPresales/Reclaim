# Running design (N-0041)

## RD-006 — A run is a timed session (2026-10-07)

Weeks 1 and 2 of a new plan are 20 minutes. Weeks 3 and 4 are 30 minutes. Those are the two daily figures already stated below: vigorous work on the order of 20 minutes, moderate work on the order of 30 minutes (Garber et al. 2011). The step happens once, at week 3. It is not a weekly percentage.

The session has a clock, Start, Pause, Walk, and Run. While running, the person speaks a sentence. If they cannot, they walk until they can, which is RD-002. Heart rate is shown when Health Connect has samples from the last two minutes. A displayed heart rate is still not a zone and not a prescription.

## RD-007 — What this module does not claim

Lactate, neurotransmitters, and other chemistry are not measured, so they are not used to set pace, load, or minutes. Skill in running is treated as specific to the practice: time on feet at a conversational effort, not a second intensity system.

This file is the citation home for running and hybrid claims. Lifting claims stay in `ROUTINE_AUDIT.md`. A number in product code that is a volume, load, or intensity claim must name this file or `ROUTINE_AUDIT.md`. This document does not make the current strength routine scientifically correct.

Mechanistic sentences use "associated with".

## What this document does not set

- No target pace, and no minutes-per-kilometre table.
- No heart-rate zone percents. A displayed heart rate is not a prescription.
- No week-by-week run/walk minute table. Commercial plans were not copied.
- No running-minute cut for a deload week. That cut is not defined. A later build must not invent one.
- The lift deload (two holds, then a smaller suggested load, increment 0) is a strength-path rule. It is not applied to running minutes.

## RD-001 — Progression is time on feet

A running session is a sequence of easy running and walking, measured in minutes. Pace is not the prescription.

Garber and colleagues, for the American College of Sports Medicine, recommend that the programme be modified to the person's current activity, and that people who cannot meet the full cardiorespiratory target can still benefit from less. The same position stand describes moderate cardiorespiratory work on the order of 30 minutes on 5 days, or vigorous work on the order of 20 minutes on 3 days, as the quantity associated with maintaining fitness in apparently healthy adults. Those figures are a population guideline, not a Reclaim session template.

Source: Garber CE, Blissmer B, Deschenes MR, et al. Quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults: guidance for prescribing exercise. *Med Sci Sports Exerc.* 2011;43(7):1334-1359. PMID [21694556](https://pubmed.ncbi.nlm.nih.gov/21694556/).

Product rule for a later build: a new plan may lengthen run minutes only on a new build, after the previous week's sessions were completed and the talk test in RD-002 stayed comfortable. A started or guided session keeps the minutes it was given. No percent-per-week step is stored, because this file does not define one.

## RD-002 — Intensity is the talk test

The person should be able to speak in sentences during the running portions. If speech breaks down, the remainder of that bout is walking. That is the intensity rule.

Foster and colleagues reported that the talk test tracks the ventilatory threshold closely enough to guide prescription: the last stage at which speech was still comfortable moved with the threshold when the threshold was raised or lowered. The paper does not give Reclaim a heart-rate percent to store.

Source: Foster C, Porcari JP, Anderson J, et al. The talk test as a marker of exercise training intensity. *J Cardiopulm Rehabil Prev.* 2008;28(1):24-30. PMID [18277826](https://pubmed.ncbi.nlm.nih.gov/18277826/).

Heart-rate zones are not a second prescription. They are not in this file as numbers.

## RD-003 — Goals are 5 km, 10 km, or a chosen distance

The person picks one goal: 5 km, 10 km, or a distance they type. The goal names the outing. It does not set a pace, a finish time, or a weekly kilometre total. Those are not defined here.

A 5 km or 10 km goal is still trained as minutes of run and walk (RD-001) at a talk-test effort (RD-002). The distance is the label on the plan, not a pace equation.

## RD-004 — Hybrid interference

Wilson and colleagues pooled 21 studies. Concurrent endurance plus strength work was associated with smaller hypertrophy, strength, and power gains than strength work alone. Running combined with lifting was associated with decrements in hypertrophy and strength; cycling was not, in that analysis. Endurance frequency and duration were negatively associated with those gains. The paper does not give Reclaim a maximum run length to hard-code.

Source: Wilson JM, Marin PJ, Rhea MR, et al. Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. *J Strength Cond Res.* 2012;26(8):2293-2307. PMID [22002517](https://pubmed.ncbi.nlm.nih.gov/22002517/).

Product rule for a later build, matching the charter: a hybrid plan puts runs on days that are not leg-strength days, and does not put a hard run inside a lifting session. Strength mode never asks for a run. Running mode does not ask for a lifting setup.

## RD-005 — Deload

`ROUTINE_AUDIT.md` records that the strength generator has no planned deload week. The per-exercise load step after two holds stays on the strength path only.

A running deload, when one is added, is a shorter-minute week, not a percent off a lifted load. The size of that minute cut is not defined in this file. Do not invent it in code.

## What a later build may implement

N-0040 owns mode persistence. N-0042 owns the guided run. Neither may add a pace, a heart-rate zone percent, a copied commercial minute table, or a running deload percent that this file does not define.
