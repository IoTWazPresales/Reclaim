# Training program quality — manual QA (Phase 1)

Phase 1 improves **taxonomy-aligned loading**, **prescription semantics** (reps vs carry distance vs holds), **increment steps**, and **load labels** in preview/session UI. Use this checklist after changing the training engine, catalog, or display helpers.

## Session preview load labels

1. Start any generated session and open **session preview**.
2. Confirm each exercise line reads like `N sets · …` with **non-ambiguous** load text (not bare `reps @ Xkg` only).
3. For **barbell** movements, text should imply **total bar** where relevant (notes section may mention total bar weight).

## Dumbbell and unilateral exercises

1. Pick **lateral raises** (or another dumbbell isolation): preview should show **moderate** kg (not ~40 kg at intermediate defaults unless baselines drive it).
2. **Set focus / exercise card**: confirm **per dumbbell / per hand** hints appear where applicable.

## Bodyweight / assisted exercises

1. **Pull-ups / push-ups**: preview/summary should show **Bodyweight · N reps** when planned external load is 0.
2. **Assisted pull-ups / assisted dips**: lines should mention **assist** and that **lower assistance weight = easier** where that mode applies.

## Carries

1. **Farmer’s walk**: preview line should include **meters per set** and **kg/hand**, not “N reps” as if it were a standard rep exercise.

## 1 kg increments

1. Open **dumbbell curl** (or another dumbbell exercise) **edit weight** in the exercise card: small step buttons should match **1 kg** steps for dumbbell-class movements.

## Known bad outputs (regression checks)

| Issue | Check |
|--------|--------|
| Lateral raise loaded like OHP | Lateral raise suggested load should stay in **isolation** range (≈6–20 kg cold default without history). |
| Thruster ~ squat max | Thruster default should be **well below** straight squat defaults for the same level. |
| Close-grip bench ~ triceps isolation | Close-grip bench should track **bench-scale** loading when no custom baseline. |
| Farmer’s walk as 3×9 “reps” | Session lines should show **distance**, not generic reps. |
| 21s as first default curl | For elbow-flexion selection, **21s should not rank first** among alternatives. |

## 50% strength / 50% muscle sessions

1. Set goals to **~50% build strength / ~50% build muscle** in onboarding or profile.
2. Generate a **push** or **upper** day; confirm **horizontal press** still appears in required slots and **shoulder isolation** can appear from optional pool without poisoning vertical press loading.

## Log markers

No special runtime log markers for Phase 1; engine remains deterministic. Optional: inspect `decisionTrace` in dev tools for exercise rows.

## Deferred (not Phase 1)

- **Default exercise hierarchy** (e.g. back squat always preferred when equipment allows).
- **Swap UX** and broader substitution search.
- **Previous-session progression** wired into `buildSessionFromProgramDay`.
- **2-day program structure** and weekly variety beyond template optional intents.

## Automated tests

Run:

```bash
cd app
npm run typecheck
npx vitest run src/lib/training/__tests__/exerciseLoadingProfile.test.ts src/lib/training/engine/engine.test.ts
```
