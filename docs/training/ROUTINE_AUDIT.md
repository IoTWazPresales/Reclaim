## Weekly policy v5 (2026-11-05)

Operator-requested policy for **new builds only** (`weekly-20261105-v5`, node N-0073). Saved `weekly-20261104-v4`, `weekly-20261030-v3` and `weekly-20261014-v2` programmes rebuild unchanged (frozen-version replay tests with the operator profile fixture, 2-5 days and 2-day Upper/Lower), and started or guided sessions keep their frozen sets. Load arithmetic (`progression.ts` formulas, equipment steps) is unchanged. Every v5 number and candidate list lives in one place: the v5 section of `app/src/lib/training/weeklyProgrammePolicy.ts`, each with a pointer to the entry below. Running mode, hybrid run placement (D-P2-03) and the legacy-intents path are not changed.

**V5-1 Hinge slots and deadlift variants (selection policy, not science).** The heavy hinge takes `romanian_deadlift`, with `good_mornings` then `hip_thrust` only when RDL is ineligible. The hinge follow-up takes `leg_curls`, `single_leg_rdl`, `hip_thrust` in that order; RDL, Nordic curls and good mornings are not follow-up candidates. Both slots fill from their lists only (no off-list fill). One list, `DEADLIFT_VARIANT_IDS` (conventional, sumo, trap-bar deadlift), may fill only the deadlift requirement; the compiler enforces this and the R05 declaration marks the variants as excluded on every other exposure, so baseline-first ranking or matching cannot place them elsewhere. If no follow-up candidate is eligible, its sets fold into that day's heavy hinge (hinge or deadlift) up to the 5-set exercise cap, with one plain warning; the slot is never left empty. This replaces the v4 outcome in which, without a leg-curl machine, RDL took the follow-up and an off-list sumo deadlift took the heavy hinge.

**V5-2 Session caps (D-P2-01 amendment, Warren-approved 2026-11-05).** v5 has no session time cap and no session total-set cap. The only binding session limits are at most 5 sets per exercise and at most 10 sets per owner muscle per session. v2-v4 and the generic engine path keep their accepted caps. Per-session volume evidence: Remmert and colleagues' meta-regressions found a positive per-session dose-response with diminishing returns, with outcome superiority no longer detectable at about 11 fractional sets per session for hypertrophy (*Is There Too Much of a Good Thing? Meta-Regressions of the Effect of Per-Session Volume on Hypertrophy and Strength*, SportRxiv **preprint**, 2025, [sportrxiv.org/…/537](https://sportrxiv.org/index.php/server/preprint/view/537)); the 10-set owner cap sits at that level. It is a pooled association and not peer reviewed.

**V5-3 Rest.** Strength exposures 180 s (unchanged). A hypertrophy exposure of a compound slot rests 120 s (`V5_HYPERTROPHY_EXPOSURE_REST_SECONDS`). Accessory compounds keep the blended accessory rest (90 s at 50/50); isolation and support work is unchanged. Evidence: in resistance-trained men, 3-minute rests between sets were associated with greater strength and some hypertrophy measures than 1-minute rests at matched sets (Schoenfeld et al., *J Strength Cond Res.* 2016;30(7):1805-1812, PMID [26605807](https://pubmed.ncbi.nlm.nih.gov/26605807/)). 120 s is an operator-chosen value between the two arms, not a tested condition.

**V5-4 In-day order.** Every v5 day runs strength exposures, then hypertrophy exposures, then accessory compounds, then isolation/support, with core last (`V5_ORDER_TIERS`; the table position index breaks ties). Warm-ups are unchanged: only the first exercise of a session gets ramp sets (existing rule, operator-confirmed 2026-11-05). Enes and colleagues found no meaningful difference in volume load, repetitions or bar velocity between one or two specific warm-up sets and no warm-up in trained lifters (*Warming up to improved performance?*, SportRxiv **preprint**, 2025, [sportrxiv.org/…/559](https://sportrxiv.org/index.php/server/preprint/view/559)), so later exercises get no extra warm-up sets.

**V5-5 Duration estimate (display only; product assumption, not science).** Per exercise: warm-up sets × 60 s + working sets × (reps × 3 s + 15 s set-up), doubled when reps are counted per side, + (sets − 1) × rest + 120 s transition; the session estimate is the sum, shown as "about N min" in Session Preview and the programme overview. Constants: `V5_DURATION_ESTIMATE`. The estimate never trims sets and never warns; for v5 it is also the session's declared time budget so R05's invalid-budget and understated-duration checks still apply. It is not a measured duration.

**V5-6 Core.** A core support requirement (owner `core`, trunk stability, 3 sets, isolation reps and rest, placed last) from two explicit lists only: flexion / anti-extension `cable_crunch`, `hanging_leg_raise`, `reverse_crunch`, `ab_wheel_rollout`; anti-rotation `pallof_press`, `dead_bug`. Planks, carries and side planks are excluded because the allocated path prescribes repetitions and those are not repetition prescriptions (side plank is wrongly inferred as reps). Placement: 2 days one per day (A flexion, B anti-rotation); 3 days two (days 0, 2); 4-6 days three, on non-consecutive days where the day count allows, preferring upper/pull days, alternating type (4 days 0, 2, 3; 5 days 0, 2, 3; 6 days 1, 3, 5). Catalogue `core` and `rectus_abdominis` already map to the Core bucket (RA-008), so the weekly line shows Core. Evidence: squats and deadlifts at 80% 1RM were associated with higher lower-erector-spinae activation than the instability trunk exercises tested (Hamlyn, Behm and Young, *J Strength Cond Res.* 2007;21(4):1108-1112, PMID [18076231](https://pubmed.ncbi.nlm.nih.gov/18076231/)), so the week's heavy lifts already load the back extensors; the added work is flexion/anti-extension and anti-rotation (a design inference, not a tested comparison); core training was associated with moderate improvements in trunk flexion and lateral-flexion endurance (Barrio et al., *Kinesiology* 2024;56(1):87-100, doi 10.26582/K.56.1.9). The operator also cited "Sberse et al. 2024"; that reference could not be located in this session and is recorded as **unverified** pending its full details.

**V5-7 Pull-ups.** A heavy own-load lift takes the strength role only with a prescribable load. Pull-ups lead with a bodyweight exercise, so they take strength (5 reps) only when the policy's added-load variant (`weighted_pull_ups`) is eligible and has an entered baseline; otherwise they are a hypertrophy exposure: 4 × 8, 120 s, bodyweight, progressing by reps. No slot without a prescribed load carries a strength rep target.

**V5-8 Two-day policies.** Auto and Full body on two days both use a genuine twice-a-week full body: Day A squat (strength), bench (strength), heavy row (strength), RDL (hypertrophy), lateral raise, curl, core; Day B deadlift (strength), bench repeat (hypertrophy), heavy quad (hypertrophy), pull-up (role per V5-7), fly, pushdown, core. Upper/Lower on two days: Upper bench, heavy row, overhead press, pulldown, fly, lateral raise, curl, core (no pushdown); Lower squat, RDL, quad follow-up, hinge follow-up, calf raise, core. Setup line (replaces the 2026-11-04 line, which claimed about the same weekly sets): "Upper body one day, lower body the other. Each muscle is trained once a week; full body trains each muscle twice and is usually better for strength." Evidence: Pelland and colleagues' meta-regressions found training frequency associated with strength gains but not clearly with hypertrophy (*The Resistance Training Dose-Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy and Strength Gain*, SportRxiv **preprint**, 2024); Remmert et al. 2025 (**preprint**, V5-2) adds diminishing per-session returns, which favour splitting a muscle's weekly sets across two sessions. Three- and four-day split preferences map as before and resolve to the v5 tables.

**Per-side display.** A catalogue field `repsPerSide: true` (every `unilateral: true` exercise plus Pallof press and dead bug; 17 entries) makes the app show "N per side" in Session Preview, the programme overview and the guided set card. Display only; logged data is unchanged.

**Mid-session replacement.** A rep-based replacement inherits the replaced item's planned reps, rep range and rest (its exposure): bench replaced on the strength day stays 5 reps / 180 s, on the volume day 8 reps / 120 s. Load still comes from the replacement's own evidence at those reps; when the replacement has its own earned progression decision inside that range, its reps/load pair is kept together (2026-11-03 combined decision). This closes the item deferred on 2026-11-04.

**Operator five-day week (fixture verification).** Mon bench 4×5 @97.5, row 4×5 @70, pulldown 3×9, DB fly 2×12, lateral 3×12, curl 3×12 @25, cable crunch 3×12. Tue squat 4×5 @90, RDL 4×8 (120 s), hack squat 3×9, single-leg RDL 3×9 per side, calf. Wed OHP 4×5 @85 (now first, so it carries the warm-ups), bench 4×8 @90 (120 s), cable fly, lateral, pushdown @40, face pull, Pallof 3×12 per side. Thu pull-ups 4×8 bodyweight (120 s), T-bar row, DB curl, rear-delt fly, shrugs, hanging leg raise. Fri deadlift 4×5 @100, leg press 4×8 (120 s), hip thrust 3×9, lunges 3×9 per side, calf, overhead triceps extension. Weekly owner sets chest 12, lats 14, quads 14, hamstrings 14, core 9. With a leg-curl machine Tuesday's follow-up is leg curls and Friday's is single-leg RDL: the existing accessory-variety rule (a repeat of the same no-own-load requirement ranks below unused listed candidates) is unchanged. Evidence: docs/training/recovery/evidence/weekly-policy-v5-20261105.md.

## Split preference (2026-11-04)

Setup offers a weekly split: **Auto** (the existing day-count policy, unchanged), **Full body** and **Upper/Lower**. A choice is shown only when an approved weekly policy of that shape exists for the selected day count, and only in strength mode, so hybrid run placement (D-P2-03) is not decided by it. Full body maps to the existing balanced 2- and 3-day weeks; Upper/Lower maps to the existing balanced 4-day week and to one new policy, `balanced-v1:2-upper-lower`. The choice is stored in the existing training-profile preferences JSON with no schema change, and only new builds read it.

Two-day Upper/Lower: Upper is bench, heavy row, overhead press, pulldown, lateral raise, curl and pushdown; Lower is squat, heavy hinge (RDL first), quad follow-up, hinge follow-up and calf raise. Doses are the weekly policy v4 doses above, so at 50/50 Upper is 24 sets (the session cap) and about 51 estimated minutes, Lower 17 sets; no owner muscle exceeds 7 sets in a session. As in the two-day full-body week, each owner muscle is trained once a week. Weekly sets are about the same (41 against 40 at 50/50): chest gets 4 instead of 6 because the specified Upper day has no fly, and calves gain 3.

Setup line: "Upper body one day, lower body the other. Each muscle is still trained once a week, as in the two-day full-body plan, with about the same weekly sets." Evidence: with weekly sets matched, Schoenfeld, Grgic and Krieger found no significant hypertrophy difference between training frequencies (*J Sports Sci.* 2019;37(11):1286-1295. PMID [30558493](https://pubmed.ncbi.nlm.nih.gov/30558493/)), and in Grgic and colleagues' volume-matched strength studies frequency had no significant effect (P = 0.421; *Sports Med.* 2018;48(5):1207-1220. PMID [29470825](https://pubmed.ncbi.nlm.nih.gov/29470825/)). Both are pooled associations, not a promise for one lifter; the two-day split changes how sessions are organised, not the weekly dose.

## Mixed-goal exposures and accessory dose (2026-11-04)

Operator-requested correction for **new builds only** (weekly policy `weekly-20261104-v4`). Saved `weekly-20261030-v3` programmes are declared and validated with the earlier rules, and started or guided sessions keep their frozen sets. Load arithmetic (the RPE 8 working weight, ceilings and exercise increments) is unchanged.

**Accessory dose.** A follow-up accessory (pulldown, quad and hinge follow-ups, row follow-up) takes its own accessory sets, reps and rest from `rules/rules.v1.json`. Before this, every non-primary slot took the isolation rep and rest blend, and a follow dose took isolation sets, while progression already used the accessory range. Fly stays an isolation. At 50/50 an accessory is 3 sets of 9 at 90 s (range 7–12); a fly is 2 sets of 12 at 55 s. The weekly compiler and the older non-weekly session path use the same rule.

**Stable blend.** Goal weights are expressed as shares rounded to the nearest 0.05 before sets, reps and rest are blended, so a slider that rests at 50.37/49.63 is treated as 50/50. Unrounded, 0.5037 × 3 + 0.4963 × 4 = 3.496 rounded to 3 heavy sets; at 50/50 the existing blend gives 4. This is an input-stability rule, not a new dose.

**Strength and hypertrophy exposures.** When both build-strength and build-muscle hold at least 0.3 of the mix, heavy exposures take separate roles instead of all using one blended range:

- The first weekly exposure of an own-load heavy lift (bench, squat, deadlift, overhead press, heavy row, pull-up) is a strength exposure: the build-strength primary range (3–6), target 5 reps, 180 s rest.
- A repeat exposure of the same lift (for example the second bench day) and every heavy no-own-load variant (heavy hinge, heavy knee-dominant lift, incline) is a hypertrophy exposure: the build-muscle primary range (6–12), target 8 reps, 90 s rest.
- Both keep the blended heavy set count. Each exposure declares its own sets, and the weekly target is the sum of those declarations rather than an assumed even split. Caps are unchanged: at most 5 sets per exercise, 10 per owner muscle and 24 per session, and the 60-minute estimate.

The targets 5 and 8 are operator-approved values inside the two single-goal ranges already in `rules.v1.json`; the ranges are not new constants. Pure goals (100% muscle or 100% strength) take no exposure roles, so their heavy, isolation and support prescriptions are as before; the accessory correction above is the only change they see.

Evidence: hypertrophy in sets taken to failure was similar across low and high loads, while maximal strength gains were associated with heavier loads. Schoenfeld, Grgic, Ogborn and Krieger pooled 21 studies (*J Strength Cond Res.* 2017;31(12):3508-3523. PMID [28834797](https://pubmed.ncbi.nlm.nih.gov/28834797/)). Lopez and colleagues' network meta-analysis of 28 studies and 747 adults found strength gains associated with high and moderate loads over low loads and hypertrophy that did not differ meaningfully by load (*Med Sci Sports Exerc.* 2021;53(6):1206-1216. PMID [33433148](https://pubmed.ncbi.nlm.nih.gov/33433148/)). One heavy exposure in the 3–6 range therefore carries the strength-specific stimulus, and a moderate-load exposure keeps the hypertrophy dose without lowering weekly sets. Weekly sets, not exposure count, remain the volume measure: see Schoenfeld, Ogborn and Krieger 2017 (PMID [27433992](https://pubmed.ncbi.nlm.nih.gov/27433992/)) and Schoenfeld, Grgic and Krieger 2019 (PMID [30558493](https://pubmed.ncbi.nlm.nih.gov/30558493/)) in *Small-muscle volume* and *Balanced week* below. Currier and colleagues ranked higher-load, multiple-set training highest for strength (PMID [37414459](https://pubmed.ncbi.nlm.nih.gov/37414459/)). These are associations from pooled trials, not a guarantee for any one lifter.

**Exercise ranking (selection, not science).** A slot's own candidate order outranks "has a baseline"; a baseline only breaks ties among off-list fills. An exercise already held by a different weekly requirement ranks below the slot's other listed candidates. An off-list fill never outranks the list, never takes a lift that another requirement lists itself (the deadlift belongs to the deadlift day), leads with the slot's owner muscle, and then ranks by movement role. With a leg-curl machine the five-day squat day is squat, RDL and leg curl; without one, RDL is the only eligible hinge follow-up and the heavy hinge falls to an owner-led variant (sumo deadlift for the operator's equipment).

**Weekly region line.** An exercise adds its sets once to each distinct region of its primary muscles. A row tagged lats, rhomboids and middle traps is Back once, not three times.

**Preview copy.** Issue codes, day/slot/requirement identifiers and source paths appear only in development builds. Identical warnings show once, and every starting-weight confirmation for the day is one block naming the exercises.

**Deferred.** A session-only exercise replacement still uses the priority × goal range, not the replaced exposure's declared range.

## Approved prescription progression correction ? 2026-11-03

Operator approved the contract after read-only reproduction and isolated simulations, then authorized implementation with **no dual workflows**. For new prescriptions, the existing double-progression decision governs **both reps and weight**. Original planned targets, original loads, policy/range context and adjustment presence survive canonical performance-history projection. No second planner, completion path, replica history or schema migration is introduced.

- Complete all frozen working targets at their prescribed uniform load, with no reported RPE above 8: add one rep per set below the current range maximum. Optional/missing RPE retains its accepted meaning; it is not fabricated as RPE 8.
- Complete the prescribed maximum: add the existing equipment increment and reset reps to the range minimum. Overperforming a lower target still advances only one rep.
- One missed target or difficult attempt repeats the prescription. Two consecutive comparable unsuccessful attempts without improved target-capped reps or comparable reported effort retain the existing approximately 10% equipment-rounded deload and reset reps to the minimum. Successful prescribed work never counts as stagnation. Set counts never change through this rule.
- Partial, skipped, unfinished, mixed-load or adjusted work interrupts the comparison. A valid frozen prescription can be repeated, but no progression or stagnation penalty is earned. A first complete uniform performance against an explicitly uncalibrated load establishes a repeat prescription, not an immediate increase.
- A newer explicit baseline still wins, never overwrites entered values and resets comparison. Ties/invalid baseline timestamps favor the baseline; cleared timestamps do not govern. Otherwise a qualified prescription decision is authoritative: an Epley estimate derived from that same submaximal performance must not cap it back down. Estimates remain calibration/re-anchoring policy, not a scientifically validated measurement of remaining capacity.
- Changed/unknown range or policy context starts a fresh comparison. Repeat an in-range frozen target once; re-anchor out-of-range work. Missing original targets cannot prove success/stagnation. Off-step loads do not auto-advance; minimum/rounding limits cannot turn a deload into an increase.
- Bodyweight reps stay within the range; added load requires explicit confirmation. Assistance, carries, time prescriptions, exercise selection, split, volume and running policy remain outside this correction.

This supersedes the history-cap and fixed-next-rep portions of the 30 October / 1 November policies below **for new builds**. Explicit v1 replay and started/guided snapshots remain frozen. Shared input-based validation checks the final pair and cannot accept explanation text as proof. Implementation and evidence: [progression correction](recovery/evidence/prescribed-progression-20261103.md).

# Reclaim training routine / generator audit (AS-IS)

## Working weight versus ceiling (2026-11-01; new builds only)

The 9 October Epley figure remains a ceiling, not the working weight. Applying
this audit's RPE 8 rule means leaving **2 reps in reserve**: invert the same
Epley relation at **target reps + 2**, then round **down** to the exercise unit's
existing step. Baseline and qualified-history evidence retain the resolved
D-P2-01 precedence. The applied working load is the lower of the existing
progression/deload proposal and that RPE 8 limit; no additional load constants
are introduced. Explanation text separates the target-rep ceiling, RPE 8 limit,
and final applied working weight. Started/guided prescriptions and historical
v1 replay remain frozen. Source verification and release-build evidence:
[working-weight evidence](recovery/evidence/working-weight-20261101.md).

## RA-016 source correction (2026-11-01; Android approval pending)

For new builds, population loads now require an exact source/target unit match: existing free-weight defaults are total-bar; existing machine defaults are cable-stack; the existing carry default is per-hand only. Other units use their own qualified evidence or `load_requires_confirmation` with no displayed number. No ratios or load constants were added. Started/frozen/history rows are not recomputed. The 9 October rule that a different unit never copies a barbell kilogram is enforced at the shared resolver and new-build boundaries. [Full path inventory, 137-exercise comparison, history limits and gates](recovery/evidence/ra016-default-load-units-20261101.md). Historical audit observations below remain historical; Android, live writes and EIF acceptance were excluded by the operator.

## Approved policy update (2026-10-30; implementation pending)

The [resolved operator decisions](../eif/phase2-controls/DECISIONS_PENDING.md#resolved-operator-decisions--2026-10-30)
are recorded verbatim and take precedence over conflicting earlier policy below
for new builds. Dated audit sections remain historical source observations,
not evidence that the approved update has been implemented.

D-P2-01 uses the most recent evidence: newer R06-qualified history supersedes a
baseline ceiling with the Epley estimate from the best recent qualified set at
target reps; a baseline entered after the last qualified session wins. Without
qualified history the baseline ceiling stays unchanged. Existing double-progression
increments remain, and the user-entered baseline is never overwritten.

The approved v2 binding limits are 5 sets per exercise, 10 per owner-muscle per
session (heavy plus follow-up), 24 working sets and a 60-minute session estimate,
plus user-supplied tighter hard caps. Direct small-muscle work counts toward both
session and muscle totals. The per-priority isolation cap and 120-set session total
are no longer binding for new builds. Report shortfalls. Frozen and historical
sessions retain v1 rules; started/guided prescriptions are never rewritten.

No fractional credit contributes to prescriptions. Secondary involvement is
recorded for recovery/fatigue only; D-P2-04 remains open for future cited changes.
Weekly targets are totals regardless of frequency: frequency distributes rather
than multiplies, and volume increases require progression evidence. Earlier
frequency-dependent doses or once-weekly examples exceeding v2 session caps below
do not override these decisions; constrained work must be reported as shortfall.
These are operator policy choices, not new claims of scientific or clinical efficacy.

## Balanced week (2026-10-09)

Named strength days (the 2- through 6-day labels from `twicePerMuscleSplit`) are built from one owner per exercise. A bench set is chest. A row or pulldown set is back. It is not also a shoulder set and not also an arm set. Direct curls, pushdowns, raises, face pulls, and calf raises are the only sets those muscles get.

No region is emphasised unless a later profile says so. Chest, back, quads, and hamstrings get the same dose. On 4, 5, or 6 days that dose is two exposures of the heavy blend plus the follow-up blend. At 50/50 that is 4+2 twice, 12 sets, inside the 12–20 band already cited below. The saved mix on this account rounds the heavy blend to 3, so those regions are 10. Sixteen is only the emphasis case: the follow-up also uses the heavy blend, twice. Two training days use one exposure, the same number for all four regions (6 at 50/50, 5 for this mix). Three days add a second exposure of the compound only.

Biceps, triceps, side delts, rear delts, and calves are 3 sets, twice when the week has room and once when it does not. Three twice is 6, inside the 5–9 band already cited. The entered overhead press is one heavy exposure and owns the front delts. Shrugs are 3 once. Glutes are recorded on the squat and the deadlift and have no separate quota. Carries and trunk work are not in this week.

The Epley figure is a ceiling for the exercise that was entered. A Romanian deadlift, hack squat, leg press, or fly with no baseline of its own is left for the person to load. It does not receive the barbell kilogram, and it is not labelled as if that kilogram were per dumbbell. A missing rack tick does not drop an entered squat or overhead press. An injury or a real equipment block does. A session stops at 24 working sets or 60 minutes. Week number does not change the load. A started session stays frozen.

## Prescription rules (2026-10-07)

These rules govern new plans. A session that has already started keeps the sets it stored.

A baseline is stored as an estimated 1RM on one exercise id (`squat`, `deadlift`, `barbell_bench_press`, `overhead_press`, `barbell_row`). That number is the anchor for the same pattern. The population table is not used for a variation when the anchor exists.

Gullett and colleagues reported mean 1RM values of 69.2 kg for the front squat and 88.3 kg for the back squat in the same trained adults. A front squat with no history of its own is prescribed from that ratio of the person's squat estimated 1RM, then converted with the Epley inversion already used for working weight. It is a group mean used as a ceiling, not a personal test. Overhead squat uses the same ceiling and is not selected unless skill work is turned on, so it is not the next exercise after a squat.

Other variations in the same family (Romanian deadlift, incline press, and the rest of the lists in `anchorLoad.ts`) cannot be prescribed above the anchor's working weight for the same reps.

American College of Sports Medicine. Progression models in resistance training for healthy adults. *Med Sci Sports Exerc.* 2009;41(3):687-708. PMID [19204579](https://pubmed.ncbi.nlm.nih.gov/19204579/). The position stand recommends sequencing that keeps intensity: large muscle groups before small ones, multiple-joint exercises before single-joint exercises, and higher-intensity exercises before lower-intensity ones. A session therefore keeps one multi-joint exercise for a pattern. A second slot of that pattern may only be a single-joint exercise. Calf raises, leg extensions, and leg curls are single-joint. They use the existing small-muscle kilogram row, not the squat or deadlift row.

A carry with no history is 15 kg per hand, the existing novice free-weight carry value, for 20 m. The old distance was `20 + average reps × 2.2`, which is not a cited carry. Twenty metres is a short finisher so the distance is no longer that formula. It is not a measured physiological constant.

Chemistry that is not measured (lactate, neurotransmitters) is not used to choose a load. Practice stays on the lift the person entered, because a change in the task is a different skill. That is the specificity already assumed by using their squat number for squat-pattern loads, not a 140 kg default.

## Small-muscle volume (2026-10-07)

Schoenfeld, Ogborn, and Krieger pooled 15 studies (34 groups). Each additional weekly set per muscle was associated with a larger hypertrophy effect (P = 0.002). Grouped means were 5.4% for fewer than 5 sets, 6.6% for 5–9, and 9.8% for 10 or more. The three-way split was a trend (P = 0.074), not a hard law. *J Sports Sci.* 2017;35(11):1073-1082. PMID [27433992](https://pubmed.ncbi.nlm.nih.gov/27433992/).

When building muscle is at least 40% of the goal mix, a beginner is given 10 hard sets for a muscle in the week. An intermediate or advanced lifter is given 16. Sixteen sits inside the 12–20 weekly sets that Baz-Valle and colleagues found useful for trained lifters’ quads and biceps, and below the 30–45 sets that grew more muscle but not more strength in trained men (Schoenfeld et al., Med Sci Sports Exerc. 2019). Between 25% and 40%, the targets are 5 for a beginner and 10 for a trained lifter. A strength-only mix keeps the existing set blend. Pressing and rowing sets count toward chest, shoulders, and back. Squat and hinge sets count toward quads and hamstrings. Direct arm, calf, and side-delt work is counted on its own, and a bench press does not replace a curl. The heavy lift uses the blended set count from the goal mix, and no exercise is given more than 5 sets. Five was the highest sets-per-exercise dose in Schoenfeld et al. 2019, and squat and bench strength did not differ between 1, 3, and 5 sets. A 50/50 muscle and strength mix blends the muscle rule of 3 primary sets with the strength rule of 4, which rounds to 4 working sets on the squat or deadlift. The rest of that day's muscle sets, if any remain, go to a second exercise for the same muscle: a leg extension after the squat, a leg curl after the hinge. A leg curl is hamstring work, so it is not the second squat. A carry keeps the accessory set count from the goal blend. Forearms on a carry are not filled up to the weekly arm target.

A hard bout is associated with a rise in muscle protein synthesis that is large at 24 hours and, in the biceps study of MacDougall and colleagues, back near the untrained arm by about 36 hours after 12 sets (*Can J Appl Physiol.* 1995;20(4):480-486. PMID [8563679](https://pubmed.ncbi.nlm.nih.gov/8563679/)). That early rise is a poor guide for a trained lifter. Damas and colleagues measured integrated myofibrillar synthesis across 10 weeks. The largest rise was in week 1, when muscle damage was also highest, and that rise was not correlated with fibre growth. By week 3 the rise was smaller, damage had fallen, and the synthesis response then was strongly correlated with later growth (r ≈ 0.9). *J Physiol.* 2016;594(18):5209-5222. PMID [27219125](https://pubmed.ncbi.nlm.nih.gov/27219125/). Dankel and colleagues hypothesised that, once that response is short, adding more sets inside the same session is a weak way for a trained lifter to progress, and a later session in the week is the repeat stimulus (*Sports Med.* 2017;47(5):799-805. PMID [27752983](https://pubmed.ncbi.nlm.nih.gov/27752983/)). That paper is a hypothesis. The outcome reviews above are what settled the split: same weekly sets, similar growth.

The efficient 50/50 shape is the overlap of those outcome reviews, not a second copy of a high-set day. Currier and colleagues ranked higher-load (>80% 1RM), multiple-set, three-times-weekly training highest for strength, and higher-load, multiple-set, twice-weekly training highest for hypertrophy, across 178 and 119 trials (*Br J Sports Med.* 2023;57(18):1211-1220. PMID [37414459](https://pubmed.ncbi.nlm.nih.gov/37414459/)). Ralston and colleagues classed fewer than 5 weekly sets per exercise as low, 5–9 as medium, and 10 or more as high. Medium and high beat low for strength. For well-trained lifters, either medium or high was a sufficient dose (*Sports Med.* 2017;47:2585-2601. PMID [28755103](https://pubmed.ncbi.nlm.nih.gov/28755103/)). The American College of Sports Medicine position stand recommends 3–6 sets per exercise for advanced hypertrophy work, in a split across 4–6 training days, with most repetitions in the 6–12 range (*Med Sci Sports Exerc.* 2009;41(3):687-708. PMID [19204579](https://pubmed.ncbi.nlm.nih.gov/19204579/)). A later ACSM synthesis of 137 reviews associated hypertrophy with about 10 or more weekly sets per muscle. Two exposures of about 8 sets, with 4 on the heavy lift, land in that overlap: about 16 for the week, inside 12–20, and 8 on the heavy lift across the two days, inside the medium strength band. Repeating an 8-set-per-exercise session on both days would push the week well past 20.

The weekly target does not grow because a muscle is trained twice. One session in the week is given the whole target. Two sessions split it, so a trained lifter with a target of 16 does about 16 sets on a once-weekly day and about 8 on each of two days. The heavy lift stays at the blended count either way. Schoenfeld, Grgic, and Krieger pooled 25 studies and found no significant difference in hypertrophy between higher and lower frequencies when weekly volume was the same. Where higher frequency was associated with more growth, those programs also did more weekly sets, and the gap between 1 and 3 or more days was modest. *J Sports Sci.* 2019;37(11):1286-1295. PMID [30558493](https://pubmed.ncbi.nlm.nih.gov/30558493/). An earlier 10-study review had reported an advantage for twice weekly over once weekly (*Sports Med.* 2016;46(11):1689-1697. PMID [27102172](https://pubmed.ncbi.nlm.nih.gov/27102172/)). The larger 2019 review did not confirm that once the week's sets were matched. For strength, Grgic and colleagues found higher frequencies associated with greater gains across 22 studies, with effect sizes of 0.74, 0.82, 0.93, and 1.08 for 1, 2, 3, and 4 or more days. In the studies that matched weekly volume, frequency had no significant effect (P = 0.421). *Sports Med.* 2018;48(5):1207-1220. PMID [29470825](https://pubmed.ncbi.nlm.nih.gov/29470825/).

The week is chosen from the days per week, the goal, and the once / twice / auto setting. Auto for a muscle or strength goal uses the twice-a-week week. Twice on five days is upper (press then row), squat day, push with no pull, pull with no press, then deadlift day. The first lift of the day keeps the entered baseline. A later slot in that day uses a variation, so the squat day does not also become a max deadlift. Push is not a second back-and-shoulders day.

Lateral raises are no longer an optional slot on a pull day (RA-007). The preview does not call a 12-rep target an AMRAP set. There is no AMRAP set. Progression stays double progression: top of the rep range at RPE 8 or easier adds weight next time. A blank RPE does not block that increase. Two sessions stuck on the same weight drop about 10% for the lifts in the performance seed, which now includes the direct curls, triceps, raises, and leg isolations the planner writes.

Weeks 1–4 keep the same days, sets, and loads. No week-by-week percent is cited, so none is applied. The first multi-joint exercise of a new session stores warm-up rows at 40%, 60%, and 80% of its working weight, 5 reps, rounded to the exercise step. Those rows are not working sets and are not written into `performed.sets`. An exercise marked disliked is removed before scoring.

Sheldon’s ectomorph, mesomorph, and endomorph labels are not used. A 2026 training study of untrained men found somatotype had limited practical value for predicting who gained muscle or strength from the same program (SportRxiv preprint, Heath–Carter somatotype, 9 weeks of training). Body type does not change the loads or the sets. The person’s entered lifts and goals do.

**Mode:** READ-ONLY source audit + A3 harness  
**Repo:** `C:\Reclaim` (`app/` product root)  
**Branch:** `fix/training-confident-ux` @ `cf12b4d`  
**Date:** 2026-09-19  
**Harness:** `app/src/lib/training/__tests__/routineVolumeMeasurement.test.ts` → `docs/training/ROUTINE_VOLUME_BASELINE.md`

## Harness numbers (VERIFIED, vitest this session)

| Measure | Result |
|---|---|
| Scenarios (goals × 2–6 days × full gym/home DB × once/twice) | 100 |
| Weeks 1–4 fingerprint identical (empty history) | **100/100** |
| History seed ids | **18** |
| Share of weekly sets whose ids are in the seed | **35.7%** |
| UI weekly-sets line omits `Core` token | **23/100** |
| Isolation/accessory tier in a required compound slot | **50/100** |
| Estimated duration > 60 min budget | **28/100** |
| `chooseExercise(horizontal_press)` muscle vs strength ranking identical | **true** (`scoreExercise` ignores goals) |
| Empty-history bench @ 8 reps | beginner &lt; intermediate &lt; advanced; 1RM 100 kg follows Epley |
| Unbucketed catalogue muscle tags | 16 including `core`, `quads`, `rear_deltoids`, `serratus_anterior` |

Nuance vs clone claim 8: Core is not *always* dropped — 77/100 lines include a Core token when `abs`/`obliques`/`transverse_abdominis` are primary. The mapping still drops the catalogue’s dominant `core` tag. **CONFIRM** the mapping bug; **do not** claim every week-line omits Core.

**Scope:** Engine, planner, selection/loading/progression, preview, Wearables projection, TrainingScreen / Setup call sites, catalogue + rules, performance seed, adapt/swap.  
**Not done:** Product source edits (except the measurement harness), runtime device smoke of generated sessions.

Evidence strength legend:

- **VERIFIED** — file opened / catalog analyzed in this audit
- **ASSERTED** — inferred from call graph / absence after search (coverage stated)

---

## Executive summary

The generator is a **template + intent-slot picker** with blended goal prescription (reps/sets/rest), intent/equipment-keyed default loads, and optional double-progression when last-set history exists for that exercise id. It is **not** a periodized 4-week loading model, **not** a weekly muscle-set volume allocator, and **not** a push:pull / quad:ham balancer. Setup never persists `experienceLevel`. History for progression is batched for **18 seed compound ids** only. `adaptSession` exists but is unused in product UI. Weeks 1–4 copy the same day structure; `buildSessionFromProgramDay` does not take week index.

---

## AS-IS architecture (observed)

```
TrainingSetupScreen
  → upsertTrainingProfile + buildFourWeekPlan + generateProgramDays
  → profile_snapshot (goals, equipment, injuries, baselines; no experienceLevel)

TrainingScreen / preview / WearablesProjectionService
  → buildSessionFromProgramDay(programDay, snapshot, options?)
       → buildSession(template, goals, constraints, userState, …)
            → chooseExercise / scoreExercise (+ primary-slot gate)
            → suggestLoading / deriveProgressionDecision
            → enrichRankedAlternatives (swap list)

startSessionMutation
  → createTrainingSession + createTrainingSessionItems (insert planned once)
```

**SHOULD-BE (critique, not authority):** A coherent routine layer would (1) persist experience and preferences into the snapshot used at generation, (2) periodize structure or loads across weeks, (3) allocate weekly sets per muscle with explicit balance constraints, (4) fetch performance for planned exercise ids (not a fixed 18), (5) keep all plan-build call sites on one input contract, (6) wire or delete `adaptSession`, (7) re-prescribe on swap.

---

## Clone claims — CONFIRM / REFUTE

### 1. Weeks 1–4 identical (planner copies week structure; weekIndex unused in `buildSessionFromProgramDay`)

**CONFIRM.**

- Planner builds one `weeklyDayPlans` map and shallow-copies it into weeks 1–4: `programPlanner.ts:71–87`.
- `generateProgramDays` varies **date / `week_index`** only; label/intents/template come from the same day plan: `programPlanner.ts:406–446`.
- `buildSessionFromProgramDay` signature has no week parameter; week does not affect selection or load: `engine/index.ts:1380–1427`.

### 2. History fetched only for 18 seed ids

**CONFIRM.**

- Fixed list length 18 in `trainingProgramPerformanceSeedIds.ts:2–21`.
- `loadTrainingPerformanceSeed` / `loadLastSessionPerformanceSeed` pass only that list: `trainingProgramPerformanceSeed.ts:24–52`.

### 3. `experienceLevel` never persisted (setup UI / profile / snapshot)

**CONFIRM.**

- Setup steps are goals → schedule → equipment → constraints → baselines → complete; no experience control: `TrainingSetupScreen.tsx:45`, `:156+`.
- `upsertTrainingProfile` / `TrainingProfileRow` have no experience field: `api.ts:2762–2782`, setup save `:383–397`.
- Program `profile_snapshot` omits `experienceLevel`: `TrainingSetupScreen.tsx:434–443`.
- Engine defaults missing snapshot field to `'intermediate'`: `engine/index.ts:1410`.

### 4. Defaults keyed by slot/intent, not exercise

**CONFIRM** (with small BY_ID exceptions).

- Cold-start defaults in `suggestLoading` are `ExperienceLevel × loadingIntentKey × equipment class`: `engine/index.ts:801–884`.
- `loadingIntentKey` inferred from intents (or thruster/carry overrides): `exerciseLoadingProfile.ts:226–247`, `:86–196`.
- Exercise-specific progression uses history / optional `estimated1RM[exercise.id]` when present: `engine/index.ts:776–794`.

### 5. Isolations mis-tagged into compound slots

**CONFIRM** (catalogue + partial mitigations).

- Examples (catalog): `dumbbell_flyes` / `cable_chest_flyes` → `horizontal_press`; `front_raises` → `vertical_press`; `rear_delt_flyes` → `horizontal_pull`; `leg_extensions` / `calf_raises` → `knee_dominant`; `nordic_curls` → `hip_hinge`; `shrugs` → `vertical_pull` (catalog sample + scripted scan of `exercises.v1.json`).
- Mitigations exist for some ids via primary-slot tiers / fit scores (`exerciseSessionRole.ts:38–54`, `exerciseSelectionRank.ts:11–57`) but tagging remains wrong at source; gate can still relax to accessory tiers: `engine/index.ts:972–1009`.

### 6. No weekly volume model (only optional isolation bump from session counts)

**CONFIRM.**

- `rules.v1.json` `volumeCaps` are **not referenced** by the engine (search of `engine/index.ts`).
- Only volume-ish mechanism: `lowFrequencyIsolationBump` when primary muscle appears in ≤1 planned session/week: `rules.v1.json:158–162`, `engine/index.ts:603–615`, `:1031–1035`.
- `weeklyVolumeSummary.ts` is **display + bump input**, not an allocator: `:31–72`.

### 7. Shoulder isolation allowed on pull days

**CONFIRM.**

- Pull template `optionalIntents` includes `shoulder_isolation`: `rules.v1.json:91–94`.
- Only one catalog exercise carries that intent (`lateral_raises`); other shoulder isolations are mistagged as press/pull (claim 5).

### 8. UI weekly-sets line drops core

**CONFIRM** (effective drop via mapping mismatch).

- Formatter includes bucket `Core` in `BUCKET_ORDER`: `weeklyVolumeSummary.ts:28`, `:68–71`.
- Maps only `abs` / `obliques` / `transverse_abdominis` → Core: `:23–26`.
- Catalogue core work overwhelmingly uses primary muscle `core` (and sometimes `rectus_abdominis`), which fall through to raw keys **not** in `BUCKET_ORDER`, so they never appear in the joined line: catalog usage counts from `exercises.v1.json` (`core`: 33).

### 9. `scoreExercise` ignores goals (`goalWeights` unused in body)

**CONFIRM.**

- Parameter accepted: `engine/index.ts:295–302`.
- Body never reads `goalWeights` (intent/equipment/injury/difficulty/preferences/compound/selectionHints only): `:307–430`.
- Goals **do** affect reps/sets/rest via `getRepRange` / `getSetsPerExercise` / `getRestSeconds` after selection: `:572–741`, `:1029–1037`.

---

## Plan-build call-site input parity

| Call site | Snapshot source | `weeklyMuscleSessionCounts` | `adaptiveTrainingEnabled` | Perf seed merge | Notes |
|-----------|-----------------|------------------------------|---------------------------|-----------------|-------|
| `TrainingScreen` week pass (`weekSessionVolume`) | `profile_snapshot` + seed | **No** (computes counts) | Yes | Yes | `TrainingScreen.tsx:439–462` |
| `TrainingScreen` `buildPlanForProgramDay` / start preview | same | **Yes** | Yes | Yes | `:465–478` |
| `TrainingScreen` `nextSession` | same | Yes | Yes | Yes | `:937–944`; deps omit `adaptiveTrainingEnabled` (`:954`) |
| `preview/dryRunTrainingGeneration` | mock snapshot | **No** | **No** | **No** | `preview/index.ts:132–147`; no `experienceLevel` |
| `WearablesProjectionService.projectTrainingNextAction` | raw `profile_snapshot` | **No** | **No** | **No** | `WearablesProjectionService.ts:60–67` |

**Verdict:** Call sites do **not** pass identical inputs. TrainingScreen two-pass (volume without bump → bump on start/next) is intentional but means week-line plans can differ slightly from started-session plans. Preview and Wearables omit weekly bump + adaptive bias + (Wearables) seed merge → duration/load can disagree with in-app next session.

Also: setup writes `muscle_frequency` / `includeSkillWork` into **profile.constraints.preferences**, but **omits preferences from `profile_snapshot`** (`TrainingSetupScreen.tsx:388–394` vs `:434–443`). Frequency still affects planner at create time via the `as any` profile passed to `buildFourWeekPlan` (`:409–420`); skill-work preference is lost for later session builds.

Hard-coded `timeBudgetMinutes: 60` in `buildSessionFromProgramDay` (`engine/index.ts:1399`) — not user schedule duration.

---

## History arrival vs started / guided sessions

**Trace:**

1. `lastPerfSeedQ` loads seed maps asynchronously (`TrainingScreen.tsx:227–231`).
2. Seed merge happens only in memory via `withProfileLastPerformance` (`:125–134`) into **new** `buildSessionFromProgramDay` calls (week volume, nextSession, day-press preview).
3. Persist path: `startSessionMutation` maps `plan.exercises` → `createTrainingSessionItems` **insert once** (`:555–567`, `api.ts:2224–2268`). No product caller rebuilds/deletes session items from a later generator pass (search: only TrainingScreen calls `createTrainingSessionItems`).
4. In-session swap updates the existing item’s `exercise_id` / planned blob; **copies prior set targets/weights** onto the new exercise (`TrainingSessionView.tsx:989–1052`) — does not re-run `suggestLoading`.
5. `pendingPlan` is set on day press and is **not** rebound when seed arrives (no effect syncing pending plan to `lastPerfSeedQ`).

**Verdict:**

- **REFUTE** that history arrival mutates an already **started** or **guided** session’s persisted items.
- **CONFIRM** that late seed arrival can change **pre-start** UI (next-session card, weekly sets line, a freshly opened preview) because those memos depend on `lastPerfSeedQ.data`.
- Guided transport / notifications operate on persisted items, not on live regenerations.

---

## Structured findings

### RA-001 — Four-week block is structural clone, not progression mesocycle

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | progression across four weeks |
| **FACT** | Same weekday always gets identical label/intents/template for weeks 1–4; session build ignores week index. `programPlanner.ts:71–87`, `engine/index.ts:1380–1427`. |
| **Evidence** | VERIFIED |
| **User impact** | Week 4 feels like week 1 aside from whatever double-progression history provides per exercise. No planned deload week / volume wave. |
| **Suggested later fix** | Pass `week_index` into build; apply week multipliers or template variants (e.g. intensity/volume/deload). |

### RA-002 — Performance history limited to 18 compounds

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | 1RM-based loading; progression across four weeks |
| **FACT** | Seed ids fixed at 18 compounds (`trainingProgramPerformanceSeedIds.ts:2–21`); fetch only those (`trainingProgramPerformanceSeed.ts:45–48`). Accessories/isolations cold-start from intent defaults. |
| **Evidence** | VERIFIED |
| **User impact** | Progression “sticks” mainly on seed lifts; swapped or accessory work resets to generic defaults. |
| **Suggested later fix** | Fetch last/recent performance for exercise ids present in the upcoming week’s plans (or all logged exercises). |

### RA-003 — Experience level not in setup / profile / snapshot

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | beginner safety |
| **FACT** | No setup UI or DB profile field; engine defaults to intermediate (`TrainingSetupScreen.tsx:45`, `api.ts:2762–2782`, `engine/index.ts:1410`). Rules define beginner maxExercises/preferMachines (`rules.v1.json:163–168`) but `preferMachines` / `complexityPenalty` unused by engine. |
| **Evidence** | VERIFIED |
| **User impact** | Beginners get intermediate exercise count and scoring; machine preference rule dead. |
| **Suggested later fix** | Add experience to setup → profile + snapshot; honor `experienceLevels.*` (or delete dead rule keys). |

### RA-004 — Cold-start loads by intent × equipment, not exercise

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | 1RM-based loading |
| **FACT** | Default table keyed by intent (`engine/index.ts:801–884`); 1RM path only if `estimated1RM[exercise.id]` (`:788–794`). Baselines from setup map to a few exercise ids then Epley. |
| **Evidence** | VERIFIED |
| **User impact** | Different exercises sharing an intent share one default kg; thruster special-cased (`:850–862`). |
| **Suggested later fix** | Per-exercise priors or broader baseline capture; keep intent defaults as fallback only. |

### RA-005 — Isolation / accessory intents polluted with compound tags

| Field | Value |
|-------|--------|
| **Class** | DATA |
| **Topic** | pattern coverage (squat, hinge, h/v push, h/v pull, carry, core); near-duplicates |
| **FACT** | Flyes/raises/extensions/curls/calves/shrugs tagged as compound intents in `exercises.v1.json` (see clone claim 5). Primary-slot overrides cover a subset (`exerciseSessionRole.ts:38–54`). |
| **Evidence** | VERIFIED |
| **User impact** | Isolations can occupy “main” slots when gates relax; pattern coverage looks fuller than coaching quality. |
| **Suggested later fix** | Retag catalogue intents; keep compound intents for true multi-joint lifts only. |

### RA-006 — No weekly set-volume allocator; caps unused

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | volume per muscle |
| **FACT** | Only optional +1 isolation set via session-count bump (`engine/index.ts:603–654`, `rules.v1.json:158–162`). `volumeCaps` in rules unused. |
| **Evidence** | VERIFIED |
| **User impact** | Cannot target e.g. 10–20 sets/muscle/week; volume emerges from template × maxExercises × goal sets. |
| **Suggested later fix** | Implement weekly set budget per muscle; enforce caps; drive optional slots from deficit. |

### RA-007 — Pull days may schedule shoulder isolation

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | pattern coverage; push:pull and quad:ham balance |
| **FACT** | `pull.optionalIntents` includes `shoulder_isolation` (`rules.v1.json:91–94`). |
| **Evidence** | VERIFIED |
| **User impact** | Lateral raises can appear on pull day; further shoulder work via mistagged press/pull isolations. |
| **Suggested later fix** | Remove shoulder isolation from pull optionals; place on push/upper only. |

### RA-008 — Weekly sets UI drops Core bucket

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | volume per muscle |
| **FACT** | `formatWeeklyMuscleSetLine` only emits `BUCKET_ORDER` keys; catalogue `core` / `rectus_abdominis` not mapped to Core (`weeklyVolumeSummary.ts:4–26`, `:68–71`). |
| **Evidence** | VERIFIED |
| **User impact** | Users never see Core in the weekly sets summary despite core exercises in plans. |
| **Suggested later fix** | Map `core` + `rectus_abdominis` → Core; optionally include unmapped leftovers. |

### RA-009 — Exercise scoring ignores goal weights

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | blended goals |
| **FACT** | `scoreExercise(..., goalWeights, ...)` never uses `goalWeights` (`engine/index.ts:295–430`). `determinePriority` also takes unused `goalWeights` (`:228–254`). |
| **Evidence** | VERIFIED |
| **User impact** | Goal blend changes prescription math, not which exercises win a slot (except via separate priorityIntents). |
| **Suggested later fix** | Bias selection by goal (e.g. strength → barbell compounds; conditioning → carry/conditioning intents). |

### RA-010 — Goals blend reps/sets/rest but not RIR targets

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | rep and RIR targets |
| **FACT** | Planned sets store `targetReps`, `suggestedWeight`, `restSeconds` only (`engine/index.ts:1052–1057`). Progression uses RPE caps (`progression.ts:219–227`, `:262–340`). No RIR field in plan. |
| **Evidence** | VERIFIED |
| **User impact** | No prescribed proximity-to-failure; RPE optional at log time. |
| **Suggested later fix** | Add target RIR/RPE by priority × goal into `PlannedSet`. |

### RA-011 — Rest is priority × goal only

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | rest |
| **FACT** | `getRestSeconds` blends `rules.goals[*].restSeconds[priority]` (`engine/index.ts:716–740`, `rules.v1.json:15–78`). No exercise- or load-specific rest. |
| **Evidence** | VERIFIED |
| **User impact** | Heavy hinge and light curl can share rest if same priority bucket. |
| **Suggested later fix** | Rest by loading profile / absolute load / intent family. |

### RA-012 — Warm-ups not part of session plan

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | warm-ups |
| **FACT** | Engine adds fixed 5 min warmup to duration estimate (`rules.v1.json:149–151`, `engine/index.ts:1243–1250`). UI can show optional % warm-up weights on ExerciseCard; not persisted as planned sets. |
| **Evidence** | VERIFIED |
| **User impact** | No programmed warm-up sets in plan/DB; guided flow may skip them. |
| **Suggested later fix** | Generate warm-up sets for primary compounds into planned payload. |

### RA-013 — Coach order exists; no fatigue-aware reorder mid-block

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | exercise order |
| **FACT** | `sortPlannedExercisesCoachOrder` by phase + movement family + tier (`exerciseSessionRole.ts:90–170`). Template arg unused (`_template`). |
| **Evidence** | VERIFIED |
| **User impact** | Order is deterministic family order, not individualized. |
| **Suggested later fix** | Optional template-specific order; respect user overrides. |

### RA-014 — Near-duplicates managed only by score / alreadySelected / tags

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | near-duplicates |
| **FACT** | Duplicate id penalty `-50` (`engine/index.ts:389–393`); swap pool expands by shared tags/muscles (`:479–491`). No synonym / pattern-family uniqueness beyond that. |
| **Evidence** | VERIFIED |
| **User impact** | Similar patterns (e.g. multiple vertical pulls) can co-occur across required+optional. |
| **Suggested later fix** | Pattern-family mutex per session; stronger substitution grouping. |

### RA-015 — No push:pull or quad:ham ratio model

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | push:pull and quad:ham balance |
| **FACT** | Intra-session only: skip optional candidates whose primary muscle already appears ≥2× (`engine/index.ts:1152–1160`). Splits imply rough balance but no measured ratio. |
| **Evidence** | VERIFIED |
| **User impact** | Asymmetric volume possible under equipment/injury constraints. |
| **Suggested later fix** | Weekly push vs pull and knee vs hinge set ratio checks with corrective optional picks. |

### RA-016 — Unilateral / dumbbell semantics partial

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | unilateral and dumbbell semantics |
| **FACT** | Unilateral deprioritized on required leg slots, favored on optional (`exerciseSelectionRank.ts:112–126`). Dumbbell display `per_dumbbell` (`exerciseLoadingProfile.ts:208–210`) but default kg table does not halve for DB. |
| **Evidence** | VERIFIED |
| **User impact** | Suggested kg may read as total or per-hand inconsistently vs UI suffix. |
| **Suggested later fix** | Generate load in display-mode units end-to-end. |

### RA-017 — Carry / conditioning units ad hoc

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | carry and conditioning units |
| **FACT** | Carry → meters from mid-rep-range formula (`engine/index.ts:681–711`); plank → seconds; conditioning template requires only `conditioning` (`rules.v1.json:116–119`). Many exercises tagged `conditioning` in catalogue (26). |
| **Evidence** | VERIFIED |
| **User impact** | “Reps” UI semantics overloaded; conditioning days thin if equipment filters wipe candidates. |
| **Suggested later fix** | First-class prescription units in planned sets; richer conditioning templates. |

### RA-018 — Injury filters are hard excludes on contraindications / forbidden intents

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | injury filters |
| **FACT** | Score zero if any contraindication ∩ injuries or forbidden intent (`engine/index.ts:347–361`). Setup maps UI constraints → engine injuries / `no_overhead` → `vertical_press` forbidden. No graded substitutions. |
| **Evidence** | VERIFIED |
| **User impact** | Safe but brittle — whole intents disappear rather than safer variants. |
| **Suggested later fix** | Soft penalties + preferred substitution tags per injury. |

### RA-019 — `adaptSession` dead in product

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | adaptSession |
| **FACT** | Implements time_pressure / fatigue set cuts (`engine/index.ts:1274–1367`). Callers: tests + `devHarness` only (search). Mutates exercise arrays in place. |
| **Evidence** | VERIFIED |
| **User impact** | No in-workout autoregulation from the engine path. |
| **Suggested later fix** | Wire to session UI with immutable copies, or remove to reduce dead surface. |

### RA-020 — Swap list ranked; swap apply does not re-prescribe

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | swap behaviour |
| **FACT** | `enrichRankedAlternatives` re-scores up to 12 alts (`engine/index.ts:454–528`); UI uses ids (`ReplaceExerciseDialog.tsx:29–38`). Apply copies old `targetReps` / `suggestedWeight` (`TrainingSessionView.tsx:989–1004`). Program scope still only updates session item (`:1076–1081`). |
| **Evidence** | VERIFIED |
| **User impact** | Swap to a different implement keeps prior load/reps; “Update program” does not change future program days’ exercise picks (days store intents only). |
| **Suggested later fix** | On swap, re-run `suggestLoading` + rep range for new exercise; persist hate/prefer overrides for program scope. |

### RA-021 — Catalogue coverage uneven

| Field | Value |
|-------|--------|
| **Class** | DATA |
| **Topic** | catalogue coverage |
| **FACT** | 137 exercises. Intent counts (approx): trunk_stability 27, conditioning 26, knee_dominant 21, vertical_press 18, … **shoulder_isolation 1**. MusclesPrimary includes inconsistent tokens (`core` vs `abs`, `traps` vs `upper_traps`, `shoulders`, `legs`, `full_body`). |
| **Evidence** | VERIFIED |
| **User impact** | Sparse true shoulder-isolation slot; volume bucketing / analytics noisy. |
| **Suggested later fix** | Normalize muscle ontology; expand shoulder_isolation / dedicated calf intents. |

### RA-022 — Frequency preference only shapes split choice at program create

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | frequency |
| **FACT** | `muscle_frequency_preference` drives `determineSplit` (`programPlanner.ts:50–69`, `:105–122`). Not re-evaluated per week; snapshot omits preference for later builds. |
| **Evidence** | VERIFIED |
| **User impact** | Changing frequency requires new program; infeasible once/twice falls back to auto with console warn. |
| **Suggested later fix** | Persist preference on snapshot; allow mid-block resplit with clear UX. |

### RA-023 — Duration estimate vs real time budget

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | duration vs time budget |
| **FACT** | Duration = 5 + Σ(8/5/3 per priority) + 5 (`engine/index.ts:1243–1250`). `timeBudgetMinutes` hard-coded 60 (`:1399`). Used by `adaptSession` time_pressure only (unused in app). |
| **Evidence** | VERIFIED |
| **User impact** | Estimated minutes can disagree with user availability; no trim at build time. |
| **Suggested later fix** | Build against user time budget (drop optionals first); persist budget on snapshot. |

### RA-024 — Plan-build input parity gaps

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | plan-build call-site input parity |
| **FACT** | See parity table above. Preview/Wearables omit weekly counts + adaptive; Wearables omits seed; `nextSession` deps miss `adaptiveTrainingEnabled` (`TrainingScreen.tsx:954`). |
| **Evidence** | VERIFIED |
| **User impact** | Preview / watch card / started session can disagree on load, bump sets, duration. |
| **Suggested later fix** | Single `buildPlanFromProgramDayContext()` helper mandatory for all call sites. |

### RA-025 — History arrival does not mutate started/guided items

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL (clarifying finding) |
| **Topic** | history arrival mutating started/guided sessions |
| **FACT** | Items inserted once at start (`TrainingScreen.tsx:555–567`, `api.ts:2255–2265`). Seed only feeds subsequent builds. No rebuild-of-items path found. |
| **Evidence** | VERIFIED |
| **User impact** | Safe for in-progress guided sessions; pre-start cards can still “jump” when seed resolves. |
| **Suggested later fix** | Freeze next-session preview until seed settled, or show loading state; never rewrite in-progress items from generator. |

### RA-026 — Pattern coverage depends on split, not an explicit checklist

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | pattern coverage (squat, hinge, h/v push, h/v pull, carry, core) |
| **FACT** | Coverage is whatever `determineSplit` puts in `intents` + template optionals (`programPlanner.ts:125–349`, `rules.v1.json:85–120`). e.g. default 3-day PPL has no carry/core required; 2-day FB includes carry on B only. |
| **Evidence** | VERIFIED |
| **User impact** | Users can miss hinge/carry/core for a whole week depending on frequency/goals. |
| **Suggested later fix** | Weekly coverage audit that injects missing patterns into optional slots. |

### RA-027 — Beginner safety incomplete beyond difficulty scoring

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | beginner safety |
| **FACT** | Difficulty match ±1 scoring (`engine/index.ts:363–377`); skill tier excluded unless `includeSkillWork` (`:325–331`) but preference often missing from snapshot (RA-003/parity). No absolute ban on advanced compounds for beginners. |
| **Evidence** | VERIFIED |
| **User impact** | Beginners can still land barbell compounds if equipment allows and score wins. |
| **Suggested later fix** | Hard beginner allow-list / machine bias when experience=beginner. |

### RA-028 — Blended goals work for prescription math only

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | blended goals |
| **FACT** | Weighted blend of rep/set/rest tables (`engine/index.ts:538–570`). Planner uses primary/secondary goal for split flavor (`programPlanner.ts:45–69`). Selection ignores blend (RA-009). |
| **Evidence** | VERIFIED |
| **User impact** | Multi-goal users get averaged reps, not goal-aware exercise mix. |
| **Suggested later fix** | Couple selection scoring to normalized goal vector. |

---

## Catalogue snapshot (AS-IS)

- **Count:** 137 exercises in `exercises.v1.json`.
- **Intents present:** carry, conditioning, elbow_extension, elbow_flexion, hip_hinge, horizontal_press, horizontal_pull, knee_dominant, shoulder_isolation, trunk_stability, vertical_press, vertical_pull.
- **musclesPrimary (unique):** adductors, anterior_deltoids, biceps, brachialis, calves, cardiovascular, core, erector_spinae, forearms, full_body, glutes, hamstrings, hip_abductors, hip_adductors, hip_flexors, lateral_deltoids, lats, legs, lower_pectorals, middle_traps, obliques, pectorals, quadriceps, rear_deltoids, rectus_abdominis, rhomboids, shoulders, transverse_abdominis, traps, triceps, upper_pectorals.
- **musclesSecondary (unique):** includes additional tokens (`quads`, `upper_back`, `serratus_anterior`, …) — ontology drift vs primary.
- **Sample row:** `barbell_bench_press` — intents `[horizontal_press]`, equipmentAll `[barbell, bench]`, primary `[pectorals, anterior_deltoids, triceps]` (`exercises.v1.json:2–16`).

## Rules snapshot (AS-IS)

- Goal tables for muscle / strength / fat / fitter: reps, sets, rest (`rules.v1.json:3–84`).
- Session templates required/optional intents (`:85–120`).
- Dead / unused by engine: `volumeCaps`, `exercisePriority`, `progressionRules` JSON block, `experienceLevels.preferMachines`, `complexityPenalty`, `conditioningWeight` (engine does not read these keys).

---

## SHOULD-BE vs AS-IS (ranked opportunities)

| Rank | Opportunity | Risk of inaction | Effort |
|------|-------------|------------------|--------|
| 1 | Unifyментировать/fix plan-build input parity helper (RA-024) | Preview/watch/session diverge | M |
| 2 | Persist experience + preferences on snapshot (RA-003) | Beginners underserved | S |
| 3 | Retag isolations; fix Core muscle map (RA-005, RA-008, RA-021) | Misleading plans/UI | M |
| 4 | History fetch for planned ids, not 18 seeds (RA-002) | Stalled progression | M |
| 5 | Weekly volume + balance model (RA-006, RA-015, RA-026) | Random weekly stimulus | L |
| 6 | Week-aware periodization (RA-001) | Flat 4-week feel | L |
| 7 | Re-prescribe on swap; wire or kill adaptSession (RA-019, RA-020) | Wrong loads after swap | M |

---

## Material files inspected

- `app/src/lib/training/engine/index.ts`
- `app/src/lib/training/programPlanner.ts`
- `app/src/lib/training/exerciseSelectionRank.ts`
- `app/src/lib/training/exerciseSessionRole.ts`
- `app/src/lib/training/exerciseLoadingProfile.ts`
- `app/src/lib/training/progression.ts`
- `app/src/lib/training/adaptiveLoadBias.ts`
- `app/src/lib/training/preview/index.ts`
- `app/src/wearables/WearablesProjectionService.ts`
- `app/src/screens/TrainingScreen.tsx`
- `app/src/screens/training/TrainingSetupScreen.tsx`
- `app/src/lib/training/catalog/exercises.v1.json`
- `app/src/lib/training/rules/rules.v1.json`
- `app/src/lib/training/weeklyVolumeSummary.ts`
- `app/src/lib/training/trainingProgramPerformanceSeed.ts`
- `app/src/lib/training/trainingProgramPerformanceSeedIds.ts`
- `app/src/lib/api.ts` (`createTrainingSessionItems`, `TrainingProfileRow`)
- `app/src/components/training/ReplaceExerciseDialog.tsx`
- `app/src/components/training/TrainingSessionView.tsx` (swap apply)
- `app/src/lib/training/types.ts` (`TrainingProfileSnapshot`)

**Commands:** catalog uniqueness script (node); ripgrep across `app/src` for build/adapt/experience/volume; `git branch` / `rev-parse`.

---

## Explicit non-claims

- Did not run the app on device or validate generated sessions visually.
- Did not treat docs/handover as evidence of runtime behavior.
- Recommendation ≠ implementation authority.
