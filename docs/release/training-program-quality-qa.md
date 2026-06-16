# Training program quality — manual QA (Phase 1–3)

Phase 1 improves **taxonomy-aligned loading**, **prescription semantics** (reps vs carry distance vs holds), **increment steps**, and **load labels** in preview/session UI.

Phase 2 improves **default exercise hierarchy** (primary vs accessory), **core/carry role fit**, **enriched swap suggestions** (stable exercise IDs plus tag/muscle-expanded pool), **2-day full-body A/B** weekly structure, **last-session performance seeding** for generated plans when history exists (generation never blocked), and **decision trace** tags (`selectionTags`, `rankedAlternativeIds`) for explainability.

Phase 3 (session quality) adds **primary-slot role tiers** (so isolation/skill/mobility patterns do not win main compound slots on score alone), **progressive gate relaxation** with `decisionTrace.primarySlotGateNote` when equipment is limited, **deterministic coach ordering** of the final session list (`coachOrderingNote` when reordered), and **swap alternative ordering** that prefers the same role tier for compound slots.

## Session preview load labels

1. Start any generated session and open **session preview**.
2. Confirm each exercise line reads like `N sets · …` with **non-ambiguous** load text (not bare `reps @ Xkg` only).
3. For **barbell** movements, text should imply **total bar** where relevant.

## Dumbbell and unilateral exercises

1. Pick **lateral raises**: preview should show **moderate** kg unless baselines/history drive otherwise.
2. **Exercise card**: confirm **per dumbbell / per hand** hints where applicable.

## Bodyweight / assisted exercises

1. **Pull-ups / push-ups**: preview shows **Bodyweight · N reps** when planned load is 0.
2. **Assisted** variants: lines mention **assist** semantics where applicable.

## Carries

1. **Farmer’s walk**: preview includes **meters per set** and **kg/hand**, not plain reps.

## 1 kg increments

1. **Dumbbell curl** (or similar): edit-weight steps use **1 kg** where Phase 1 defines dumbbell-class increments.

## Known bad outputs (regression checks)

| Issue | Check |
|--------|--------|
| Lateral raise loaded like OHP | Isolation-range loads cold default without history. |
| Thruster ~ squat max | Thruster **below** straight squat defaults. |
| Close-grip bench ~ triceps isolation | Tracks bench-scale loading without baseline. |
| Farmer’s walk as generic reps | Shows **distance**. |
| 21s as first default curl | **21s** not first pick for elbow flexion. |
| Upright row / shrugs as main vertical press / pull | **Upright row** and **shrugs** should not win default **vertical_press** / **vertical_pull** when true presses / pulls are available. |
| Flyes as main horizontal press | **Chest fly** patterns should not win default **horizontal_press** when pressing options exist. |
| Nordic / Cossack as main hinge / squat | **Nordic curl** and **Cossack squat** should not be the first **hip_hinge** / **knee_dominant** pick when standard hinge / squat options exist. |
| Handstand as default overhead | **Handstand** / planche should not outrank standard overhead pressing when available. |
| T-bar row shown as cable stack | **T-bar row** load line should read as **bar / total bar**, not generic cable stack. |

## Coach ordering (session sequence)

1. Open a **pull** session preview — **vertical pull** (e.g. pull-ups / pulldown) should appear **before** isolation **elbow flexion** when both are in the plan.
2. Main **compound** patterns should appear **before** arms-only isolation when both are generated.

## Primary role gates (main lift slots)

1. With **full gym** equipment, **horizontal_press** should default to a **press** pattern, not chest fly / pec isolation.
2. **vertical_pull** should default to **lat / pull-up / pulldown** class movements, not **shrugs**.
3. **vertical_press** should default to **shoulder press** class movements, not **upright row** or skill-only overhead when presses exist.

## Fallback behavior (limited equipment)

1. **Dumbbell-only** / **no rack**: session still builds; `decisionTrace` may show **primarySlotGateNote** when the engine relaxes tier gates.
2. **Bodyweight / minimal**: verify sessions still complete without empty required slots where the catalog allows.

## Swap alternatives (Replace exercise)

1. Open **Replace exercise** on a **main compound** slot — alternatives should list **same-role** compounds **before** obvious isolation/skill options where possible (`rankedAlternativeIds` order).

## Core subtype behavior

1. Multiple **trunk_stability** slots should still favor **subtype variety** (anti-rotation vs anti-extension vs flexion) when catalog allows.

## T-bar / load semantics

1. **T-bar row**: preview load wording should match **barbell-style** loading, not cable stack.

## Training setup — equipment keys (engine contract)

1. Equipment chips use the **same string IDs** the engine / `exercises.v1.json` expect (e.g. `rack`, `leg_press_machine`, `cable_machine`, `t_bar_row_machine`, `hack_squat_machine`). Select every item you have; **cable machine** covers lat pulldown-style work (no separate `lat_pulldown` equipment key in the catalog).
2. **Preview** and **live session** generation both use `normalizeEquipmentIds` + the same `buildSessionFromProgramDay` path; behavior should match.
3. **Session plans** read **`profile_snapshot` on the active program** (not the live profile row alone). After equipment changes, **re-save training setup** so a new program is created and today’s sessions use the new `equipment_access` snapshot.
4. For manual QA of new equipment, **re-run setup** (or ensure the active program was created after the change); stale programs keep the old snapshot until replaced.

## 50% strength / 50% muscle generated plan

1. Set **~50% build strength / ~50% build muscle**.
2. Preview a session — main slots should favor **progression-friendly** compounds when equipment allows.
3. Open **Replace exercise** — multiple logical swaps (IDs-backed list).

## 2-day plan quality

1. Set **2 days/week**.
2. Confirm **Full Body A / Full Body B** labels and that the **week** covers squat, hinge, horizontal push, pulls (horizontal + vertical), core (A), and carry (B).

## 3-day / 4-day plan quality

1. **3-day**: Push/Pull/Legs or Full Body variants still expose horizontal press on appropriate days.
2. **4-day**: Upper/Lower ×2 still shows horizontal press on upper templates.

## Bulgarian split squat vs squat logic

1. With **rack + barbell** or **leg press**, **main knee_dominant** slot should **not** default Bulgarian split squat; Bulgarian may still appear as **accessory** / optional unilateral work.

## Pallof / plank / hanging leg raise roles

1. **Pallof** — anti-rotation style trunk work; **plank / dead bug / ab wheel** — anti-extension; **hanging leg raise / cable crunch** — flexion. Sessions should **vary core subtype** when multiple trunk slots exist.

## Upper day horizontal push coverage

1. **Upper** / **push** days include **horizontal_press** in required intents for strength–hypertrophy programming.

## Previous performance influencing load

1. After completing sessions, open **day preview** — seeded compounds may show loads informed by **cached last performance** when available; offline / no history still generates a plan.

## Decision trace / preview

1. Optional dev inspection: `decisionTrace.selectionTags` and `rankedAlternativeIds` populated for preview/swaps.

## Screenshot checklist

1. One **session preview** screenshot and one **Replace exercise** sheet with **multiple** alternatives.

## Automated tests

```bash
cd app
npm run typecheck
npx vitest run src/lib/training/__tests__/programQualityGolden.test.ts src/lib/training/engine/engine.test.ts src/lib/training/preview/__tests__/preview.test.ts src/lib/training/__tests__/exerciseLoadingProfile.test.ts
```

## Deferred (concrete)

- **Intent-level** last-performance fallback when the exercise id changes but the programmed intent does not (`getLastPerformanceForIntent` remains stubbed in `lastPerformance.ts`).
