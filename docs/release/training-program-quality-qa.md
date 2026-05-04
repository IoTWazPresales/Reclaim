# Training program quality — manual QA (Phase 1 + Phase 2)

Phase 1 improves **taxonomy-aligned loading**, **prescription semantics** (reps vs carry distance vs holds), **increment steps**, and **load labels** in preview/session UI.

Phase 2 improves **default exercise hierarchy** (primary vs accessory), **core/carry role fit**, **enriched swap suggestions** (stable exercise IDs plus tag/muscle-expanded pool), **2-day full-body A/B** weekly structure, **last-session performance seeding** for generated plans when history exists (generation never blocked), and **decision trace** tags (`selectionTags`, `rankedAlternativeIds`) for explainability.

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
