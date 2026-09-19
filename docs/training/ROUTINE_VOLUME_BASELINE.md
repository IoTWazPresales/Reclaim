# Routine volume baseline

**Generated:** 2026-09-19 by `routineVolumeMeasurement.test.ts`
**Path:** same two-pass `buildSessionFromProgramDay` as `TrainingScreen.weekSessionVolume` (pass 1 → muscle session counts → pass 2).
**Evidence class:** executable measurement (vitest). Hard volume bands are Stage C F6, not this file.

## Catalogue tags `weeklyVolumeSummary` cannot bucket

- `cardiovascular`
- `core`
- `full_body`
- `hip_abductors`
- `hip_adductors`
- `hip_flexors`
- `legs`
- `lower_pectorals`
- `middle_traps`
- `quads`
- `rear_deltoids`
- `rectus_abdominis`
- `serratus_anterior`
- `shoulders`
- `traps`
- `upper_back`
- `upper_pectorals`

## History production fetch share

Seed id count: **18** (`squat`, `front_squat`, `leg_press`, `deadlift`, `romanian_deadlift`, `hip_thrust`, `barbell_bench_press`, `dumbbell_bench_press`, `incline_bench_press`, `overhead_press`, `dumbbell_shoulder_press`, `lat_pulldown`, `pull_ups`, `chin_ups`, `cable_row`, `barbell_row`, `t_bar_row`, `farmer_walk`).
Share below is sets whose exercise id is in that seed (the only ids `loadTrainingPerformanceSeed` fetches).

## Clone-claim measurement (reconfirm, not trust)

| Claim | Result |
|---|---|
| Weeks 1–4 fingerprint identical (empty history) | **100/100** scenarios identical |
| History seed id count | **18** (expected 18) |
| Share of weekly sets whose ids are in the seed | **35.7%** |
| UI weekly-sets line omits Core | **23/100** scenarios have no `Core` token |
| Isolation/accessory tier in a required compound slot | **50/100** scenarios had ≥1 hit |
| Estimated duration > 60 min time budget | **28/100** scenarios |

## Per-scenario week-1 pass-2 volume

### `muscle|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `muscle|2d|full gym|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `muscle|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `muscle|2d|home dumbbells|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `muscle|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 21 · Shoulders 18 · Arms 22 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 13.5 · anterior_deltoids 11.0 · triceps 11.0 · lats 10.5 · lateral_deltoids 10.0 · traps 9.5 · rhomboids 9.0 · pectorals 8.5 · middle_traps 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · erector_spinae 6.0 · rear_deltoids 6.0 · hamstrings 4.5 · obliques 4.0 · brachialis 3.0 · hip_adductors 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · forearms 2.0 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 5 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 23/57
- max estimatedDurationMinutes: 56

### `muscle|3d|full gym|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 21 · Shoulders 18 · Arms 22 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 13.5 · anterior_deltoids 11.0 · triceps 11.0 · lats 10.5 · lateral_deltoids 10.0 · traps 9.5 · rhomboids 9.0 · pectorals 8.5 · middle_traps 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · erector_spinae 6.0 · rear_deltoids 6.0 · hamstrings 4.5 · obliques 4.0 · brachialis 3.0 · hip_adductors 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · forearms 2.0 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 5 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 23/57
- max estimatedDurationMinutes: 56

### `muscle|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 6 · Shoulders 16 · Arms 22 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 12.0 · traps 11.0 · lateral_deltoids 10.0 · anterior_deltoids 9.0 · glutes 8.5 · biceps 7.5 · core 7.5 · pectorals 7.5 · shoulders 7.0 · hamstrings 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 4.0 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · middle_traps 3.0 · quadriceps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_extension 6 · elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 11/58
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `muscle|3d|home dumbbells|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 6 · Shoulders 16 · Arms 22 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 12.0 · traps 11.0 · lateral_deltoids 10.0 · anterior_deltoids 9.0 · glutes 8.5 · biceps 7.5 · core 7.5 · pectorals 7.5 · shoulders 7.0 · hamstrings 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 4.0 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · middle_traps 3.0 · quadriceps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_extension 6 · elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 11/58
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `muscle|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 6 · Back 27 · Shoulders 34 · Arms 35 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 20.0 · anterior_deltoids 19.5 · biceps 19.0 · lateral_deltoids 18.0 · lats 13.5 · rhomboids 12.0 · middle_traps 10.5 · pectorals 10.0 · traps 9.5 · rear_deltoids 9.0 · erector_spinae 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · brachialis 5.0 · hamstrings 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · obliques 4.0 · hip_adductors 3.0 · quadriceps 3.0 · forearms 2.0 · quads 1.0
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · core 2 · lats 2 · middle_traps 2 · obliques 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 12 · elbow_flexion 10 · horizontal_pull 9 · elbow_extension 8 · hip_hinge 6 · horizontal_press 6 · knee_dominant 6 · shoulder_isolation 6 · vertical_pull 6 · trunk_stability 4 · carry 2
- sets in seed / total: 32/75
- max estimatedDurationMinutes: 56

### `muscle|4d|full gym|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 30 · Shoulders 21 · Arms 25 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 15.0 · lats 15.0 · glutes 14.0 · anterior_deltoids 13.0 · calves 12.0 · rhomboids 12.0 · triceps 12.0 · erector_spinae 10.5 · core 10.0 · lateral_deltoids 10.0 · traps 10.0 · hamstrings 9.0 · hip_adductors 6.0 · pectorals 6.0 · quadriceps 6.0 · middle_traps 4.5 · rear_deltoids 4.5 · forearms 4.0 · obliques 4.0 · brachialis 3.0 · serratus_anterior 3.0 · hip_flexors 2.0 · quads 2.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 28/74
- max estimatedDurationMinutes: 57

### `muscle|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 33 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 17.0 · anterior_deltoids 15.5 · lateral_deltoids 15.0 · biceps 11.5 · traps 11.0 · rear_deltoids 9.0 · rhomboids 9.0 · glutes 8.5 · pectorals 8.0 · core 7.5 · brachialis 7.0 · shoulders 7.0 · hamstrings 6.0 · middle_traps 4.5 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · quadriceps 3.0 · upper_traps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · brachialis 2 · core 2 · legs 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · triceps 2 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 12 · elbow_flexion 10 · horizontal_pull 9 · elbow_extension 8 · hip_hinge 6 · horizontal_press 6 · knee_dominant 6 · shoulder_isolation 6 · vertical_pull 6 · trunk_stability 4 · carry 2
- sets in seed / total: 14/75
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `muscle|4d|home dumbbells|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 3 · Shoulders 19 · Arms 24 · Legs 36 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · anterior_deltoids 14.0 · core 13.0 · traps 13.0 · hamstrings 12.0 · triceps 12.0 · shoulders 10.0 · lateral_deltoids 7.0 · biceps 6.0 · calves 6.0 · quadriceps 6.0 · cardiovascular 5.0 · pectorals 5.0 · brachialis 4.0 · forearms 4.0 · legs 4.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · quads 2.0 · transverse_abdominis 2.0 · middle_traps 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 16/74
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `muscle|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `muscle|5d|full gym|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `muscle|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `muscle|5d|home dumbbells|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `muscle|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `muscle|6d|full gym|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `muscle|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `muscle|6d|home dumbbells|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `strength|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 4 · Back 56 · Shoulders 28 · Arms 27 · Legs 32 · Core 3
- fractional sets/muscle (1 primary / 0.5 secondary): lats 28.0 · rhomboids 24.0 · middle_traps 20.0 · glutes 17.5 · anterior_deltoids 16.0 · biceps 16.0 · erector_spinae 16.0 · rear_deltoids 16.0 · triceps 16.0 · hamstrings 12.0 · lateral_deltoids 12.0 · calves 8.0 · quadriceps 8.0 · traps 7.0 · core 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · pectorals 4.0 · forearms 3.0 · obliques 3.0 · quads 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 16 · vertical_press 12 · hip_hinge 8 · knee_dominant 8 · vertical_pull 8 · horizontal_press 4 · carry 3 · trunk_stability 3
- sets in seed / total: 59/62
- max estimatedDurationMinutes: 71

### `strength|2d|full gym|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 4 · Back 56 · Shoulders 28 · Arms 27 · Legs 32 · Core 3
- fractional sets/muscle (1 primary / 0.5 secondary): lats 28.0 · rhomboids 24.0 · middle_traps 20.0 · glutes 17.5 · anterior_deltoids 16.0 · biceps 16.0 · erector_spinae 16.0 · rear_deltoids 16.0 · triceps 16.0 · hamstrings 12.0 · lateral_deltoids 12.0 · calves 8.0 · quadriceps 8.0 · traps 7.0 · core 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · pectorals 4.0 · forearms 3.0 · obliques 3.0 · quads 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 16 · vertical_press 12 · hip_hinge 8 · knee_dominant 8 · vertical_pull 8 · horizontal_press 4 · carry 3 · trunk_stability 3
- sets in seed / total: 59/62
- max estimatedDurationMinutes: 71

### `strength|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 4 · Back 16 · Shoulders 28 · Arms 19 · Legs 32
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.5 · anterior_deltoids 16.0 · rear_deltoids 16.0 · rhomboids 16.0 · triceps 16.0 · lateral_deltoids 12.0 · shoulders 11.0 · traps 11.0 · core 10.0 · hamstrings 8.0 · middle_traps 8.0 · quadriceps 8.0 · cardiovascular 5.5 · erector_spinae 4.0 · pectorals 4.0 · upper_traps 4.0 · forearms 3.0 · legs 3.0 · serratus_anterior 2.0 · quads 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 16 · vertical_press 12 · hip_hinge 8 · knee_dominant 8 · vertical_pull 8 · horizontal_press 4 · carry 3 · trunk_stability 3
- sets in seed / total: 23/62
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `strength|2d|home dumbbells|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 4 · Back 16 · Shoulders 28 · Arms 19 · Legs 32
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.5 · anterior_deltoids 16.0 · rear_deltoids 16.0 · rhomboids 16.0 · triceps 16.0 · lateral_deltoids 12.0 · shoulders 11.0 · traps 11.0 · core 10.0 · hamstrings 8.0 · middle_traps 8.0 · quadriceps 8.0 · cardiovascular 5.5 · erector_spinae 4.0 · pectorals 4.0 · upper_traps 4.0 · forearms 3.0 · legs 3.0 · serratus_anterior 2.0 · quads 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 16 · vertical_press 12 · hip_hinge 8 · knee_dominant 8 · vertical_pull 8 · horizontal_press 4 · carry 3 · trunk_stability 3
- sets in seed / total: 23/62
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `strength|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 28 · Shoulders 21 · Arms 26 · Legs 20 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 16.0 · anterior_deltoids 14.0 · lats 14.0 · traps 13.0 · triceps 13.0 · rhomboids 12.0 · pectorals 10.5 · lateral_deltoids 10.0 · middle_traps 10.0 · glutes 9.5 · core 9.0 · calves 8.0 · erector_spinae 8.0 · rear_deltoids 8.0 · hamstrings 6.0 · obliques 6.0 · hip_adductors 4.0 · quadriceps 4.0 · serratus_anterior 4.0 · brachialis 3.0 · forearms 3.0 · upper_traps 2.0 · quads 1.5
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: hip_hinge 8 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_flexion 6 · trunk_stability 6 · elbow_extension 5 · carry 3 · shoulder_isolation 2
- sets in seed / total: 31/70
- max estimatedDurationMinutes: 56

### `strength|3d|full gym|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 28 · Shoulders 21 · Arms 26 · Legs 20 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 16.0 · anterior_deltoids 14.0 · lats 14.0 · traps 13.0 · triceps 13.0 · rhomboids 12.0 · pectorals 10.5 · lateral_deltoids 10.0 · middle_traps 10.0 · glutes 9.5 · core 9.0 · calves 8.0 · erector_spinae 8.0 · rear_deltoids 8.0 · hamstrings 6.0 · obliques 6.0 · hip_adductors 4.0 · quadriceps 4.0 · serratus_anterior 4.0 · brachialis 3.0 · forearms 3.0 · upper_traps 2.0 · quads 1.5
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: hip_hinge 8 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_flexion 6 · trunk_stability 6 · elbow_extension 5 · carry 3 · shoulder_isolation 2
- sets in seed / total: 31/70
- max estimatedDurationMinutes: 56

### `strength|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 18 · Arms 25 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): traps 15.0 · triceps 12.0 · glutes 11.5 · anterior_deltoids 11.0 · core 11.0 · lateral_deltoids 10.0 · shoulders 10.0 · biceps 9.0 · pectorals 9.0 · hamstrings 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 5.0 · calves 4.0 · middle_traps 4.0 · quadriceps 4.0 · forearms 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · quads 1.5
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: hip_hinge 8 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_flexion 7 · trunk_stability 6 · elbow_extension 4 · carry 3 · shoulder_isolation 2
- sets in seed / total: 15/70
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `strength|3d|home dumbbells|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 18 · Arms 25 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): traps 15.0 · triceps 12.0 · glutes 11.5 · anterior_deltoids 11.0 · core 11.0 · lateral_deltoids 10.0 · shoulders 10.0 · biceps 9.0 · pectorals 9.0 · hamstrings 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 5.0 · calves 4.0 · middle_traps 4.0 · quadriceps 4.0 · forearms 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · quads 1.5
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: hip_hinge 8 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_flexion 7 · trunk_stability 6 · elbow_extension 4 · carry 3 · shoulder_isolation 2
- sets in seed / total: 15/70
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `strength|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 36 · Shoulders 41 · Arms 41 · Legs 20 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 25.0 · triceps 24.0 · biceps 22.0 · lateral_deltoids 19.0 · lats 18.0 · rhomboids 16.0 · middle_traps 14.0 · traps 13.0 · pectorals 12.0 · rear_deltoids 12.0 · erector_spinae 10.0 · glutes 9.5 · core 9.0 · calves 8.0 · hamstrings 6.0 · obliques 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · brachialis 5.0 · hip_adductors 4.0 · quadriceps 4.0 · forearms 3.0 · quads 1.5
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · core 2 · lats 2 · middle_traps 2 · obliques 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 16 · horizontal_pull 12 · elbow_flexion 10 · elbow_extension 8 · hip_hinge 8 · horizontal_press 8 · knee_dominant 8 · vertical_pull 8 · trunk_stability 6 · carry 3 · shoulder_isolation 3
- sets in seed / total: 43/90
- max estimatedDurationMinutes: 56

### `strength|4d|full gym|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 4 · Back 40 · Shoulders 25 · Arms 29 · Legs 40 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): lats 20.0 · glutes 19.0 · biceps 18.0 · anterior_deltoids 16.0 · calves 16.0 · rhomboids 16.0 · core 15.0 · erector_spinae 14.0 · traps 14.0 · triceps 13.0 · hamstrings 12.0 · lateral_deltoids 10.0 · hip_adductors 8.0 · quadriceps 8.0 · pectorals 6.5 · forearms 6.0 · middle_traps 6.0 · obliques 6.0 · rear_deltoids 6.0 · serratus_anterior 4.0 · brachialis 3.0 · hip_flexors 3.0 · quads 3.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 16 · knee_dominant 16 · vertical_press 12 · vertical_pull 12 · trunk_stability 9 · carry 6 · elbow_flexion 6 · elbow_extension 5 · horizontal_press 4 · horizontal_pull 4 · shoulder_isolation 2
- sets in seed / total: 38/92
- max estimatedDurationMinutes: 57

### `strength|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 12 · Shoulders 31 · Arms 37 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 19.0 · triceps 16.0 · lateral_deltoids 15.0 · traps 15.0 · biceps 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · glutes 11.5 · core 11.0 · shoulders 10.0 · brachialis 9.0 · pectorals 9.0 · hamstrings 8.0 · legs 6.0 · middle_traps 6.0 · cardiovascular 5.0 · calves 4.0 · quadriceps 4.0 · upper_traps 4.0 · forearms 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · quads 1.5
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · brachialis 2 · core 2 · legs 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · triceps 2 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 16 · elbow_flexion 12 · horizontal_pull 12 · hip_hinge 8 · horizontal_press 8 · knee_dominant 8 · vertical_pull 8 · trunk_stability 6 · elbow_extension 4 · carry 3 · shoulder_isolation 3
- sets in seed / total: 19/88
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `strength|4d|home dumbbells|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 4 · Back 4 · Shoulders 22 · Arms 27 · Legs 48 · Core 3
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 23.0 · core 19.0 · traps 18.0 · anterior_deltoids 17.0 · hamstrings 16.0 · shoulders 14.0 · triceps 11.0 · calves 8.0 · quadriceps 8.0 · biceps 7.0 · cardiovascular 7.0 · forearms 6.0 · lateral_deltoids 6.0 · legs 6.0 · brachialis 5.0 · pectorals 5.0 · erector_spinae 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · quads 3.0 · transverse_abdominis 3.0 · middle_traps 2.0 · serratus_anterior 2.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 16 · knee_dominant 16 · vertical_press 12 · vertical_pull 12 · trunk_stability 9 · elbow_flexion 7 · carry 6 · horizontal_press 4 · horizontal_pull 4 · elbow_extension 3 · shoulder_isolation 2
- sets in seed / total: 22/91
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `strength|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 44 · Shoulders 41 · Arms 46 · Legs 32 · Core 9
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 25.0 · biceps 24.0 · triceps 24.0 · lats 22.0 · core 21.0 · rhomboids 20.0 · glutes 19.0 · lateral_deltoids 19.0 · middle_traps 16.0 · traps 16.0 · rear_deltoids 14.0 · erector_spinae 12.0 · pectorals 12.0 · quadriceps 12.0 · obliques 9.0 · hamstrings 8.0 · hip_adductors 8.0 · calves 6.0 · forearms 6.0 · hip_flexors 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · brachialis 4.0 · quads 3.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 16 · trunk_stability 15 · hip_hinge 12 · horizontal_pull 12 · knee_dominant 12 · vertical_pull 12 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 8 · carry 6 · shoulder_isolation 3
- sets in seed / total: 54/112
- max estimatedDurationMinutes: 56

### `strength|5d|full gym|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 44 · Shoulders 41 · Arms 46 · Legs 32 · Core 9
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 25.0 · biceps 24.0 · triceps 24.0 · lats 22.0 · core 21.0 · rhomboids 20.0 · glutes 19.0 · lateral_deltoids 19.0 · middle_traps 16.0 · traps 16.0 · rear_deltoids 14.0 · erector_spinae 12.0 · pectorals 12.0 · quadriceps 12.0 · obliques 9.0 · hamstrings 8.0 · hip_adductors 8.0 · calves 6.0 · forearms 6.0 · hip_flexors 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · brachialis 4.0 · quads 3.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 16 · trunk_stability 15 · hip_hinge 12 · horizontal_pull 12 · knee_dominant 12 · vertical_pull 12 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 8 · carry 6 · shoulder_isolation 3
- sets in seed / total: 54/112
- max estimatedDurationMinutes: 56

### `strength|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 12 · Shoulders 31 · Arms 34 · Legs 40 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): core 23.0 · glutes 23.0 · traps 22.0 · anterior_deltoids 19.0 · triceps 16.0 · lateral_deltoids 15.0 · shoulders 13.0 · hamstrings 12.0 · quadriceps 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · biceps 11.0 · legs 9.0 · pectorals 9.0 · cardiovascular 6.5 · brachialis 6.0 · forearms 6.0 · middle_traps 6.0 · transverse_abdominis 6.0 · upper_traps 4.0 · quads 3.0 · erector_spinae 2.0 · serratus_anterior 2.0
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 16 · trunk_stability 15 · hip_hinge 12 · horizontal_pull 12 · knee_dominant 12 · vertical_pull 12 · elbow_flexion 9 · horizontal_press 8 · carry 6 · elbow_extension 4 · shoulder_isolation 3
- sets in seed / total: 22/109
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `strength|5d|home dumbbells|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 12 · Shoulders 31 · Arms 34 · Legs 40 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): core 23.0 · glutes 23.0 · traps 22.0 · anterior_deltoids 19.0 · triceps 16.0 · lateral_deltoids 15.0 · shoulders 13.0 · hamstrings 12.0 · quadriceps 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · biceps 11.0 · legs 9.0 · pectorals 9.0 · cardiovascular 6.5 · brachialis 6.0 · forearms 6.0 · middle_traps 6.0 · transverse_abdominis 6.0 · upper_traps 4.0 · quads 3.0 · erector_spinae 2.0 · serratus_anterior 2.0
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 16 · trunk_stability 15 · hip_hinge 12 · horizontal_pull 12 · knee_dominant 12 · vertical_pull 12 · elbow_flexion 9 · horizontal_press 8 · carry 6 · elbow_extension 4 · shoulder_isolation 3
- sets in seed / total: 22/109
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `strength|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 16 · Back 52 · Shoulders 42 · Arms 50 · Legs 36 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 32.0 · anterior_deltoids 27.0 · lats 26.0 · core 24.0 · rhomboids 24.0 · traps 24.0 · triceps 24.0 · lateral_deltoids 20.0 · middle_traps 20.0 · pectorals 20.0 · glutes 19.0 · rear_deltoids 16.0 · erector_spinae 12.0 · obliques 12.0 · quadriceps 12.0 · calves 10.0 · hamstrings 8.0 · hip_adductors 8.0 · serratus_anterior 8.0 · brachialis 6.0 · forearms 6.0 · hip_flexors 6.0 · upper_traps 4.0 · quads 3.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: trunk_stability 18 · horizontal_press 16 · horizontal_pull 16 · knee_dominant 16 · vertical_press 16 · vertical_pull 16 · elbow_flexion 12 · hip_hinge 12 · elbow_extension 8 · carry 6 · shoulder_isolation 4
- sets in seed / total: 58/140
- max estimatedDurationMinutes: 57

### `strength|6d|full gym|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 16 · Back 52 · Shoulders 42 · Arms 50 · Legs 36 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 32.0 · anterior_deltoids 27.0 · lats 26.0 · core 24.0 · rhomboids 24.0 · traps 24.0 · triceps 24.0 · lateral_deltoids 20.0 · middle_traps 20.0 · pectorals 20.0 · glutes 19.0 · rear_deltoids 16.0 · erector_spinae 12.0 · obliques 12.0 · quadriceps 12.0 · calves 10.0 · hamstrings 8.0 · hip_adductors 8.0 · serratus_anterior 8.0 · brachialis 6.0 · forearms 6.0 · hip_flexors 6.0 · upper_traps 4.0 · quads 3.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: trunk_stability 18 · horizontal_press 16 · horizontal_pull 16 · knee_dominant 16 · vertical_press 16 · vertical_pull 16 · elbow_flexion 12 · hip_hinge 12 · elbow_extension 8 · carry 6 · shoulder_isolation 4
- sets in seed / total: 58/140
- max estimatedDurationMinutes: 57

### `strength|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 16 · Back 16 · Shoulders 36 · Arms 46 · Legs 44 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): traps 30.0 · core 28.0 · glutes 23.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · shoulders 20.0 · triceps 20.0 · biceps 18.0 · pectorals 17.0 · rear_deltoids 16.0 · rhomboids 16.0 · hamstrings 12.0 · legs 12.0 · quadriceps 12.0 · brachialis 10.0 · cardiovascular 10.0 · middle_traps 8.0 · forearms 6.0 · transverse_abdominis 6.0 · calves 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · quads 3.0 · erector_spinae 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: trunk_stability 18 · horizontal_press 16 · horizontal_pull 16 · knee_dominant 16 · vertical_press 16 · vertical_pull 16 · elbow_flexion 14 · hip_hinge 12 · carry 6 · elbow_extension 4 · shoulder_isolation 4
- sets in seed / total: 26/138
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `strength|6d|home dumbbells|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 16 · Back 16 · Shoulders 36 · Arms 46 · Legs 44 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): traps 30.0 · core 28.0 · glutes 23.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · shoulders 20.0 · triceps 20.0 · biceps 18.0 · pectorals 17.0 · rear_deltoids 16.0 · rhomboids 16.0 · hamstrings 12.0 · legs 12.0 · quadriceps 12.0 · brachialis 10.0 · cardiovascular 10.0 · middle_traps 8.0 · forearms 6.0 · transverse_abdominis 6.0 · calves 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · quads 3.0 · erector_spinae 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: trunk_stability 18 · horizontal_press 16 · horizontal_pull 16 · knee_dominant 16 · vertical_press 16 · vertical_pull 16 · elbow_flexion 14 · hip_hinge 12 · carry 6 · elbow_extension 4 · shoulder_isolation 4
- sets in seed / total: 26/138
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fat|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `fat|2d|full gym|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `fat|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fat|2d|home dumbbells|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fat|3d|full gym|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 3 · Back 24 · Shoulders 21 · Arms 25 · Legs 24 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 16.0 · anterior_deltoids 14.0 · glutes 13.0 · erector_spinae 12.0 · lats 12.0 · hamstrings 10.5 · biceps 10.0 · lateral_deltoids 9.0 · rhomboids 9.0 · middle_traps 7.5 · rear_deltoids 7.5 · core 6.0 · pectorals 5.0 · traps 5.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · obliques 4.0 · full_body 3.0 · quadriceps 3.0 · brachialis 2.0 · forearms 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · obliques 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1 · traps 1
- sets/movement-pattern: hip_hinge 9 · vertical_press 9 · horizontal_pull 6 · elbow_extension 4 · elbow_flexion 4 · trunk_stability 4 · conditioning 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3 · carry 2
- sets in seed / total: 35/50
- max estimatedDurationMinutes: 64

### `fat|3d|full gym|twice`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Full Body Conditioning[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 33 · Shoulders 27 · Arms 32 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 21.0 · anterior_deltoids 18.0 · erector_spinae 16.5 · lats 16.5 · glutes 16.0 · biceps 13.5 · hamstrings 13.5 · lateral_deltoids 12.0 · rhomboids 12.0 · middle_traps 10.5 · rear_deltoids 10.5 · traps 6.5 · calves 6.0 · core 6.0 · pectorals 6.0 · serratus_anterior 6.0 · upper_traps 6.0 · obliques 4.0 · brachialis 3.0 · full_body 3.0 · quadriceps 3.0 · forearms 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 3 · biceps 3 · erector_spinae 3 · glutes 3 · hamstrings 3 · lateral_deltoids 3 · lats 3 · middle_traps 3 · rear_deltoids 3 · rhomboids 3 · triceps 3 · core 2 · obliques 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1 · traps 1
- sets/movement-pattern: hip_hinge 12 · vertical_press 12 · horizontal_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 4 · conditioning 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3 · carry 2
- sets in seed / total: 44/63
- max estimatedDurationMinutes: 64

### `fat|3d|home dumbbells|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 3 · Back 6 · Shoulders 21 · Arms 22 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 16.0 · anterior_deltoids 14.0 · glutes 13.0 · shoulders 10.0 · core 9.0 · hamstrings 9.0 · lateral_deltoids 9.0 · rear_deltoids 6.0 · rhomboids 6.0 · cardiovascular 5.0 · pectorals 5.0 · traps 5.0 · biceps 4.0 · legs 4.0 · erector_spinae 3.0 · full_body 3.0 · middle_traps 3.0 · quadriceps 3.0 · upper_traps 3.0 · brachialis 2.0 · forearms 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): shoulders 3 · anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · rear_deltoids 2 · rhomboids 2 · traps 2 · triceps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: hip_hinge 9 · vertical_press 9 · horizontal_pull 6 · elbow_extension 4 · elbow_flexion 4 · trunk_stability 4 · conditioning 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3 · carry 2
- sets in seed / total: 17/50
- max estimatedDurationMinutes: 64
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fat|3d|home dumbbells|twice`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Full Body Conditioning[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 9 · Shoulders 27 · Arms 29 · Legs 30
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 21.0 · anterior_deltoids 18.0 · glutes 16.0 · hamstrings 12.0 · lateral_deltoids 12.0 · shoulders 10.0 · core 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · biceps 6.0 · pectorals 6.0 · cardiovascular 5.0 · traps 5.0 · erector_spinae 4.5 · middle_traps 4.5 · upper_traps 4.5 · legs 4.0 · brachialis 3.0 · full_body 3.0 · quadriceps 3.0 · forearms 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 3 · biceps 3 · glutes 3 · hamstrings 3 · lateral_deltoids 3 · rear_deltoids 3 · rhomboids 3 · shoulders 3 · triceps 3 · core 2 · legs 2 · traps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: hip_hinge 12 · vertical_press 12 · horizontal_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 4 · conditioning 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3 · carry 2
- sets in seed / total: 23/63
- max estimatedDurationMinutes: 64
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fat|4d|full gym|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 30 · Shoulders 21 · Arms 25 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 15.0 · lats 15.0 · glutes 14.0 · anterior_deltoids 13.0 · calves 12.0 · rhomboids 12.0 · triceps 12.0 · erector_spinae 10.5 · core 10.0 · lateral_deltoids 10.0 · traps 10.0 · hamstrings 9.0 · hip_adductors 6.0 · pectorals 6.0 · quadriceps 6.0 · middle_traps 4.5 · rear_deltoids 4.5 · forearms 4.0 · obliques 4.0 · brachialis 3.0 · serratus_anterior 3.0 · hip_flexors 2.0 · quads 2.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 28/74
- max estimatedDurationMinutes: 57

### `fat|4d|full gym|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 30 · Shoulders 21 · Arms 25 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 15.0 · lats 15.0 · glutes 14.0 · anterior_deltoids 13.0 · calves 12.0 · rhomboids 12.0 · triceps 12.0 · erector_spinae 10.5 · core 10.0 · lateral_deltoids 10.0 · traps 10.0 · hamstrings 9.0 · hip_adductors 6.0 · pectorals 6.0 · quadriceps 6.0 · middle_traps 4.5 · rear_deltoids 4.5 · forearms 4.0 · obliques 4.0 · brachialis 3.0 · serratus_anterior 3.0 · hip_flexors 2.0 · quads 2.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 28/74
- max estimatedDurationMinutes: 57

### `fat|4d|home dumbbells|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 3 · Shoulders 19 · Arms 24 · Legs 36 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · anterior_deltoids 14.0 · core 13.0 · traps 13.0 · hamstrings 12.0 · triceps 12.0 · shoulders 10.0 · lateral_deltoids 7.0 · biceps 6.0 · calves 6.0 · quadriceps 6.0 · cardiovascular 5.0 · pectorals 5.0 · brachialis 4.0 · forearms 4.0 · legs 4.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · quads 2.0 · transverse_abdominis 2.0 · middle_traps 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 16/74
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fat|4d|home dumbbells|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 3 · Shoulders 19 · Arms 24 · Legs 36 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · anterior_deltoids 14.0 · core 13.0 · traps 13.0 · hamstrings 12.0 · triceps 12.0 · shoulders 10.0 · lateral_deltoids 7.0 · biceps 6.0 · calves 6.0 · quadriceps 6.0 · cardiovascular 5.0 · pectorals 5.0 · brachialis 4.0 · forearms 4.0 · legs 4.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · quads 2.0 · transverse_abdominis 2.0 · middle_traps 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 16/74
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fat|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `fat|5d|full gym|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `fat|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fat|5d|home dumbbells|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fat|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `fat|6d|full gym|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `fat|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fat|6d|home dumbbells|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fitter|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 28 · Shoulders 14 · Arms 14 · Legs 16 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 14.0 · rhomboids 12.0 · middle_traps 10.0 · glutes 9.0 · anterior_deltoids 8.0 · biceps 8.0 · erector_spinae 8.0 · rear_deltoids 8.0 · triceps 8.0 · hamstrings 6.0 · lateral_deltoids 6.0 · calves 4.0 · core 4.0 · quadriceps 4.0 · traps 4.0 · serratus_anterior 3.0 · upper_traps 3.0 · forearms 2.0 · obliques 2.0 · pectorals 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 6 · hip_hinge 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2
- sets in seed / total: 30/32
- max estimatedDurationMinutes: 71

### `fitter|2d|full gym|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 28 · Shoulders 14 · Arms 14 · Legs 16 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 14.0 · rhomboids 12.0 · middle_traps 10.0 · glutes 9.0 · anterior_deltoids 8.0 · biceps 8.0 · erector_spinae 8.0 · rear_deltoids 8.0 · triceps 8.0 · hamstrings 6.0 · lateral_deltoids 6.0 · calves 4.0 · core 4.0 · quadriceps 4.0 · traps 4.0 · serratus_anterior 3.0 · upper_traps 3.0 · forearms 2.0 · obliques 2.0 · pectorals 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 6 · hip_hinge 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2
- sets in seed / total: 30/32
- max estimatedDurationMinutes: 71

### `fitter|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 8 · Shoulders 14 · Arms 10 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 9.0 · anterior_deltoids 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · triceps 8.0 · core 6.0 · lateral_deltoids 6.0 · shoulders 6.0 · traps 6.0 · hamstrings 4.0 · middle_traps 4.0 · quadriceps 4.0 · cardiovascular 3.0 · erector_spinae 2.0 · forearms 2.0 · legs 2.0 · pectorals 2.0 · upper_traps 2.0 · quads 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 6 · hip_hinge 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2
- sets in seed / total: 12/32
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fitter|2d|home dumbbells|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 8 · Shoulders 14 · Arms 10 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 9.0 · anterior_deltoids 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · triceps 8.0 · core 6.0 · lateral_deltoids 6.0 · shoulders 6.0 · traps 6.0 · hamstrings 4.0 · middle_traps 4.0 · quadriceps 4.0 · cardiovascular 3.0 · erector_spinae 2.0 · forearms 2.0 · legs 2.0 · pectorals 2.0 · upper_traps 2.0 · quads 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 6 · hip_hinge 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2
- sets in seed / total: 12/32
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fitter|3d|full gym|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 2 · Back 16 · Shoulders 14 · Arms 18 · Legs 16 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 10.0 · anterior_deltoids 9.0 · glutes 9.0 · biceps 8.0 · erector_spinae 8.0 · lats 8.0 · hamstrings 7.0 · core 6.0 · lateral_deltoids 6.0 · rhomboids 6.0 · middle_traps 5.0 · rear_deltoids 5.0 · obliques 4.0 · traps 4.0 · calves 3.0 · pectorals 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · brachialis 2.0 · forearms 2.0 · full_body 2.0 · quadriceps 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · obliques 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1 · traps 1
- sets/movement-pattern: hip_hinge 6 · vertical_press 6 · elbow_flexion 4 · horizontal_pull 4 · trunk_stability 4 · carry 2 · conditioning 2 · elbow_extension 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 24/36
- max estimatedDurationMinutes: 64

### `fitter|3d|full gym|twice`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Full Body Conditioning[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 22 · Shoulders 18 · Arms 23 · Legs 20 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 13.0 · anterior_deltoids 11.5 · biceps 11.0 · erector_spinae 11.0 · glutes 11.0 · lats 11.0 · hamstrings 9.0 · lateral_deltoids 8.0 · rhomboids 8.0 · middle_traps 7.0 · rear_deltoids 7.0 · core 6.0 · traps 5.0 · calves 4.0 · obliques 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · pectorals 3.5 · brachialis 3.0 · forearms 2.0 · full_body 2.0 · quadriceps 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 3 · biceps 3 · erector_spinae 3 · glutes 3 · hamstrings 3 · lateral_deltoids 3 · lats 3 · middle_traps 3 · rear_deltoids 3 · rhomboids 3 · triceps 3 · core 2 · obliques 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1 · traps 1
- sets/movement-pattern: hip_hinge 8 · vertical_press 8 · elbow_flexion 6 · horizontal_pull 6 · trunk_stability 4 · elbow_extension 3 · carry 2 · conditioning 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 30/45
- max estimatedDurationMinutes: 64

### `fitter|3d|home dumbbells|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 2 · Back 4 · Shoulders 14 · Arms 16 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 10.0 · anterior_deltoids 9.0 · glutes 9.0 · core 8.0 · shoulders 8.0 · hamstrings 6.0 · lateral_deltoids 6.0 · biceps 4.0 · cardiovascular 4.0 · legs 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · traps 4.0 · pectorals 3.0 · brachialis 2.0 · erector_spinae 2.0 · forearms 2.0 · full_body 2.0 · middle_traps 2.0 · quadriceps 2.0 · upper_traps 2.0 · quads 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): shoulders 3 · anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · rear_deltoids 2 · rhomboids 2 · traps 2 · triceps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: hip_hinge 6 · vertical_press 6 · elbow_flexion 4 · horizontal_pull 4 · trunk_stability 4 · carry 2 · conditioning 2 · elbow_extension 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 12/36
- max estimatedDurationMinutes: 64
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fitter|3d|home dumbbells|twice`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Full Body Conditioning[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 6 · Shoulders 18 · Arms 21 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 13.0 · anterior_deltoids 11.5 · glutes 11.0 · core 8.0 · hamstrings 8.0 · lateral_deltoids 8.0 · shoulders 8.0 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · cardiovascular 4.0 · legs 4.0 · traps 4.0 · pectorals 3.5 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · upper_traps 3.0 · forearms 2.0 · full_body 2.0 · quadriceps 2.0 · quads 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 3 · biceps 3 · glutes 3 · hamstrings 3 · lateral_deltoids 3 · rear_deltoids 3 · rhomboids 3 · shoulders 3 · triceps 3 · core 2 · legs 2 · traps 2 · forearms 1 · full_body 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: hip_hinge 8 · vertical_press 8 · elbow_flexion 6 · horizontal_pull 6 · trunk_stability 4 · elbow_extension 3 · carry 2 · conditioning 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 16/45
- max estimatedDurationMinutes: 64
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fitter|4d|full gym|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 20 · Shoulders 14 · Arms 20 · Legs 20 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 12.0 · core 10.0 · glutes 10.0 · lats 10.0 · anterior_deltoids 9.0 · calves 8.0 · rhomboids 8.0 · traps 8.0 · triceps 8.0 · erector_spinae 7.0 · hamstrings 6.0 · lateral_deltoids 6.0 · forearms 4.0 · hip_adductors 4.0 · obliques 4.0 · pectorals 4.0 · quadriceps 4.0 · brachialis 3.0 · middle_traps 3.0 · rear_deltoids 3.0 · hip_flexors 2.0 · quads 2.0 · serratus_anterior 2.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 8 · knee_dominant 8 · elbow_flexion 6 · trunk_stability 6 · vertical_press 6 · vertical_pull 6 · carry 4 · elbow_extension 4 · horizontal_press 2 · horizontal_pull 2 · shoulder_isolation 2
- sets in seed / total: 20/54
- max estimatedDurationMinutes: 57

### `fitter|4d|full gym|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 20 · Shoulders 14 · Arms 20 · Legs 20 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 12.0 · core 10.0 · glutes 10.0 · lats 10.0 · anterior_deltoids 9.0 · calves 8.0 · rhomboids 8.0 · traps 8.0 · triceps 8.0 · erector_spinae 7.0 · hamstrings 6.0 · lateral_deltoids 6.0 · forearms 4.0 · hip_adductors 4.0 · obliques 4.0 · pectorals 4.0 · quadriceps 4.0 · brachialis 3.0 · middle_traps 3.0 · rear_deltoids 3.0 · hip_flexors 2.0 · quads 2.0 · serratus_anterior 2.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 8 · knee_dominant 8 · elbow_flexion 6 · trunk_stability 6 · vertical_press 6 · vertical_pull 6 · carry 4 · elbow_extension 4 · horizontal_press 2 · horizontal_pull 2 · shoulder_isolation 2
- sets in seed / total: 20/54
- max estimatedDurationMinutes: 57

### `fitter|4d|home dumbbells|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 2 · Shoulders 12 · Arms 19 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): core 12.0 · glutes 12.0 · traps 10.0 · anterior_deltoids 9.0 · hamstrings 8.0 · shoulders 8.0 · triceps 7.0 · biceps 6.0 · brachialis 4.0 · calves 4.0 · cardiovascular 4.0 · forearms 4.0 · lateral_deltoids 4.0 · legs 4.0 · quadriceps 4.0 · pectorals 3.0 · erector_spinae 2.0 · quads 2.0 · rear_deltoids 2.0 · rhomboids 2.0 · transverse_abdominis 2.0 · middle_traps 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 8 · knee_dominant 8 · elbow_flexion 6 · trunk_stability 6 · vertical_press 6 · vertical_pull 6 · carry 4 · elbow_extension 3 · horizontal_press 2 · horizontal_pull 2 · shoulder_isolation 2
- sets in seed / total: 12/53
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fitter|4d|home dumbbells|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 2 · Shoulders 12 · Arms 19 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): core 12.0 · glutes 12.0 · traps 10.0 · anterior_deltoids 9.0 · hamstrings 8.0 · shoulders 8.0 · triceps 7.0 · biceps 6.0 · brachialis 4.0 · calves 4.0 · cardiovascular 4.0 · forearms 4.0 · lateral_deltoids 4.0 · legs 4.0 · quadriceps 4.0 · pectorals 3.0 · erector_spinae 2.0 · quads 2.0 · rear_deltoids 2.0 · rhomboids 2.0 · transverse_abdominis 2.0 · middle_traps 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 8 · knee_dominant 8 · elbow_flexion 6 · trunk_stability 6 · vertical_press 6 · vertical_pull 6 · carry 4 · elbow_extension 3 · horizontal_press 2 · horizontal_pull 2 · shoulder_isolation 2
- sets in seed / total: 12/53
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fitter|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 22 · Shoulders 23 · Arms 30 · Legs 16 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 16.0 · anterior_deltoids 14.0 · core 14.0 · triceps 14.0 · lateral_deltoids 11.0 · lats 11.0 · glutes 10.0 · rhomboids 10.0 · traps 9.0 · middle_traps 8.0 · pectorals 7.0 · rear_deltoids 7.0 · erector_spinae 6.0 · obliques 6.0 · quadriceps 6.0 · brachialis 4.0 · forearms 4.0 · hamstrings 4.0 · hip_adductors 4.0 · hip_flexors 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: trunk_stability 10 · elbow_flexion 8 · vertical_press 8 · elbow_extension 6 · hip_hinge 6 · horizontal_pull 6 · knee_dominant 6 · vertical_pull 6 · carry 4 · horizontal_press 4 · shoulder_isolation 3
- sets in seed / total: 28/67
- max estimatedDurationMinutes: 56

### `fitter|5d|full gym|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 22 · Shoulders 23 · Arms 30 · Legs 16 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 16.0 · anterior_deltoids 14.0 · core 14.0 · triceps 14.0 · lateral_deltoids 11.0 · lats 11.0 · glutes 10.0 · rhomboids 10.0 · traps 9.0 · middle_traps 8.0 · pectorals 7.0 · rear_deltoids 7.0 · erector_spinae 6.0 · obliques 6.0 · quadriceps 6.0 · brachialis 4.0 · forearms 4.0 · hamstrings 4.0 · hip_adductors 4.0 · hip_flexors 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: trunk_stability 10 · elbow_flexion 8 · vertical_press 8 · elbow_extension 6 · hip_hinge 6 · horizontal_pull 6 · knee_dominant 6 · vertical_pull 6 · carry 4 · horizontal_press 4 · shoulder_isolation 3
- sets in seed / total: 28/67
- max estimatedDurationMinutes: 56

### `fitter|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 6 · Shoulders 17 · Arms 24 · Legs 20 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): core 15.0 · glutes 12.0 · traps 12.0 · anterior_deltoids 10.0 · triceps 10.0 · biceps 9.0 · lateral_deltoids 9.0 · shoulders 8.0 · hamstrings 6.0 · legs 6.0 · quadriceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 5.0 · pectorals 5.0 · cardiovascular 4.0 · forearms 4.0 · transverse_abdominis 4.0 · middle_traps 3.0 · quads 2.0 · upper_traps 2.0 · erector_spinae 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: trunk_stability 10 · elbow_flexion 8 · vertical_press 8 · hip_hinge 6 · horizontal_pull 6 · knee_dominant 6 · vertical_pull 6 · carry 4 · elbow_extension 4 · horizontal_press 4 · shoulder_isolation 3
- sets in seed / total: 12/65
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fitter|5d|home dumbbells|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 6 · Shoulders 17 · Arms 24 · Legs 20 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): core 15.0 · glutes 12.0 · traps 12.0 · anterior_deltoids 10.0 · triceps 10.0 · biceps 9.0 · lateral_deltoids 9.0 · shoulders 8.0 · hamstrings 6.0 · legs 6.0 · quadriceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 5.0 · pectorals 5.0 · cardiovascular 4.0 · forearms 4.0 · transverse_abdominis 4.0 · middle_traps 3.0 · quads 2.0 · upper_traps 2.0 · erector_spinae 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: trunk_stability 10 · elbow_flexion 8 · vertical_press 8 · hip_hinge 6 · horizontal_pull 6 · knee_dominant 6 · vertical_pull 6 · carry 4 · elbow_extension 4 · horizontal_press 4 · shoulder_isolation 3
- sets in seed / total: 12/65
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fitter|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 26 · Shoulders 24 · Arms 34 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 22.0 · core 16.0 · anterior_deltoids 15.0 · triceps 14.0 · lats 13.0 · traps 13.0 · lateral_deltoids 12.0 · rhomboids 12.0 · pectorals 11.0 · glutes 10.0 · middle_traps 10.0 · obliques 8.0 · rear_deltoids 8.0 · brachialis 6.0 · erector_spinae 6.0 · quadriceps 6.0 · calves 5.0 · forearms 4.0 · hamstrings 4.0 · hip_adductors 4.0 · hip_flexors 4.0 · serratus_anterior 4.0 · quads 2.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · trunk_stability 12 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_extension 6 · hip_hinge 6 · carry 4 · shoulder_isolation 4
- sets in seed / total: 30/84
- max estimatedDurationMinutes: 57

### `fitter|6d|full gym|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 26 · Shoulders 24 · Arms 34 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 22.0 · core 16.0 · anterior_deltoids 15.0 · triceps 14.0 · lats 13.0 · traps 13.0 · lateral_deltoids 12.0 · rhomboids 12.0 · pectorals 11.0 · glutes 10.0 · middle_traps 10.0 · obliques 8.0 · rear_deltoids 8.0 · brachialis 6.0 · erector_spinae 6.0 · quadriceps 6.0 · calves 5.0 · forearms 4.0 · hamstrings 4.0 · hip_adductors 4.0 · hip_flexors 4.0 · serratus_anterior 4.0 · quads 2.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · trunk_stability 12 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · elbow_extension 6 · hip_hinge 6 · carry 4 · shoulder_isolation 4
- sets in seed / total: 30/84
- max estimatedDurationMinutes: 57

### `fitter|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 20 · Arms 32 · Legs 22 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): core 18.0 · traps 16.0 · biceps 14.0 · glutes 12.0 · lateral_deltoids 12.0 · shoulders 12.0 · triceps 12.0 · anterior_deltoids 11.0 · pectorals 9.0 · brachialis 8.0 · legs 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · cardiovascular 6.0 · hamstrings 6.0 · quadriceps 6.0 · forearms 4.0 · middle_traps 4.0 · transverse_abdominis 4.0 · calves 2.0 · quads 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · erector_spinae 1.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · trunk_stability 12 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · hip_hinge 6 · carry 4 · elbow_extension 4 · shoulder_isolation 4
- sets in seed / total: 14/82
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fitter|6d|home dumbbells|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 20 · Arms 32 · Legs 22 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): core 18.0 · traps 16.0 · biceps 14.0 · glutes 12.0 · lateral_deltoids 12.0 · shoulders 12.0 · triceps 12.0 · anterior_deltoids 11.0 · pectorals 9.0 · brachialis 8.0 · legs 8.0 · rear_deltoids 8.0 · rhomboids 8.0 · cardiovascular 6.0 · hamstrings 6.0 · quadriceps 6.0 · forearms 4.0 · middle_traps 4.0 · transverse_abdominis 4.0 · calves 2.0 · quads 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · erector_spinae 1.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · trunk_stability 12 · horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · hip_hinge 6 · carry 4 · elbow_extension 4 · shoulder_isolation 4
- sets in seed / total: 14/82
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `blend|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `blend|2d|full gym|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): lats 21.0 · rhomboids 18.0 · middle_traps 15.0 · glutes 13.0 · anterior_deltoids 12.0 · biceps 12.0 · erector_spinae 12.0 · rear_deltoids 12.0 · triceps 12.0 · hamstrings 9.0 · lateral_deltoids 9.0 · calves 6.0 · quadriceps 6.0 · traps 5.0 · serratus_anterior 4.5 · upper_traps 4.5 · core 4.0 · pectorals 3.0 · forearms 2.0 · obliques 2.0 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · erector_spinae 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · forearms 1 · obliques 1 · pectorals 1 · traps 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 44/46
- max estimatedDurationMinutes: 71

### `blend|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `blend|2d|home dumbbells|twice`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 21 · Arms 14 · Legs 24
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · anterior_deltoids 12.0 · rear_deltoids 12.0 · rhomboids 12.0 · triceps 12.0 · lateral_deltoids 9.0 · shoulders 8.0 · traps 8.0 · core 7.0 · hamstrings 6.0 · middle_traps 6.0 · quadriceps 6.0 · cardiovascular 4.0 · erector_spinae 3.0 · pectorals 3.0 · upper_traps 3.0 · forearms 2.0 · legs 2.0 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · legs 1 · pectorals 1
- sets/movement-pattern: horizontal_pull 12 · vertical_press 9 · hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 17/46
- max estimatedDurationMinutes: 71
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `blend|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 21 · Shoulders 18 · Arms 22 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 13.5 · anterior_deltoids 11.0 · triceps 11.0 · lats 10.5 · lateral_deltoids 10.0 · traps 9.5 · rhomboids 9.0 · pectorals 8.5 · middle_traps 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · erector_spinae 6.0 · rear_deltoids 6.0 · hamstrings 4.5 · obliques 4.0 · brachialis 3.0 · hip_adductors 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · forearms 2.0 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 5 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 23/57
- max estimatedDurationMinutes: 56

### `blend|3d|full gym|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 21 · Shoulders 18 · Arms 22 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 13.5 · anterior_deltoids 11.0 · triceps 11.0 · lats 10.5 · lateral_deltoids 10.0 · traps 9.5 · rhomboids 9.0 · pectorals 8.5 · middle_traps 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · erector_spinae 6.0 · rear_deltoids 6.0 · hamstrings 4.5 · obliques 4.0 · brachialis 3.0 · hip_adductors 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · forearms 2.0 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · obliques 2 · anterior_deltoids 1 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 5 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 23/57
- max estimatedDurationMinutes: 56

### `blend|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 6 · Shoulders 16 · Arms 22 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 12.0 · traps 11.0 · lateral_deltoids 10.0 · anterior_deltoids 9.0 · glutes 8.5 · biceps 7.5 · core 7.5 · pectorals 7.5 · shoulders 7.0 · hamstrings 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 4.0 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · middle_traps 3.0 · quadriceps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_extension 6 · elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 11/58
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `blend|3d|home dumbbells|twice`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 6 · Shoulders 16 · Arms 22 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 12.0 · traps 11.0 · lateral_deltoids 10.0 · anterior_deltoids 9.0 · glutes 8.5 · biceps 7.5 · core 7.5 · pectorals 7.5 · shoulders 7.0 · hamstrings 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · brachialis 4.0 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · middle_traps 3.0 · quadriceps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): traps 3 · biceps 2 · core 2 · lateral_deltoids 2 · legs 2 · shoulders 2 · anterior_deltoids 1 · brachialis 1 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: elbow_extension 6 · elbow_flexion 6 · hip_hinge 6 · horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · shoulder_isolation 4 · trunk_stability 4 · carry 2
- sets in seed / total: 11/58
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `blend|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 6 · Back 27 · Shoulders 34 · Arms 35 · Legs 15 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 20.0 · anterior_deltoids 19.5 · biceps 19.0 · lateral_deltoids 18.0 · lats 13.5 · rhomboids 12.0 · middle_traps 10.5 · pectorals 10.0 · traps 9.5 · rear_deltoids 9.0 · erector_spinae 7.5 · glutes 7.0 · calves 6.0 · core 6.0 · brachialis 5.0 · hamstrings 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · obliques 4.0 · hip_adductors 3.0 · quadriceps 3.0 · forearms 2.0 · quads 1.0
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · core 2 · lats 2 · middle_traps 2 · obliques 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · forearms 1 · glutes 1 · hamstrings 1 · hip_adductors 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 12 · elbow_flexion 10 · horizontal_pull 9 · elbow_extension 8 · hip_hinge 6 · horizontal_press 6 · knee_dominant 6 · shoulder_isolation 6 · vertical_pull 6 · trunk_stability 4 · carry 2
- sets in seed / total: 32/75
- max estimatedDurationMinutes: 56

### `blend|4d|full gym|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 30 · Shoulders 21 · Arms 25 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 15.0 · lats 15.0 · glutes 14.0 · anterior_deltoids 13.0 · calves 12.0 · rhomboids 12.0 · triceps 12.0 · erector_spinae 10.5 · core 10.0 · lateral_deltoids 10.0 · traps 10.0 · hamstrings 9.0 · hip_adductors 6.0 · pectorals 6.0 · quadriceps 6.0 · middle_traps 4.5 · rear_deltoids 4.5 · forearms 4.0 · obliques 4.0 · brachialis 3.0 · serratus_anterior 3.0 · hip_flexors 2.0 · quads 2.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · erector_spinae 2 · forearms 2 · glutes 2 · hamstrings 2 · hip_adductors 2 · lateral_deltoids 2 · lats 2 · obliques 2 · quadriceps 2 · rhomboids 2 · triceps 2 · hip_flexors 1 · middle_traps 1 · pectorals 1 · rear_deltoids 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 28/74
- max estimatedDurationMinutes: 57

### `blend|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 33 · Legs 18
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 17.0 · anterior_deltoids 15.5 · lateral_deltoids 15.0 · biceps 11.5 · traps 11.0 · rear_deltoids 9.0 · rhomboids 9.0 · glutes 8.5 · pectorals 8.0 · core 7.5 · brachialis 7.0 · shoulders 7.0 · hamstrings 6.0 · middle_traps 4.5 · legs 4.0 · cardiovascular 3.5 · calves 3.0 · quadriceps 3.0 · upper_traps 3.0 · forearms 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · quads 1.0
- frequency (sessions containing primary muscle): biceps 3 · lateral_deltoids 3 · traps 3 · anterior_deltoids 2 · brachialis 2 · core 2 · legs 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · triceps 2 · calves 1 · forearms 1 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: vertical_press 12 · elbow_flexion 10 · horizontal_pull 9 · elbow_extension 8 · hip_hinge 6 · horizontal_press 6 · knee_dominant 6 · shoulder_isolation 6 · vertical_pull 6 · trunk_stability 4 · carry 2
- sets in seed / total: 14/75
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `blend|4d|home dumbbells|twice`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 3 · Shoulders 19 · Arms 24 · Legs 36 · Core 2
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · anterior_deltoids 14.0 · core 13.0 · traps 13.0 · hamstrings 12.0 · triceps 12.0 · shoulders 10.0 · lateral_deltoids 7.0 · biceps 6.0 · calves 6.0 · quadriceps 6.0 · cardiovascular 5.0 · pectorals 5.0 · brachialis 4.0 · forearms 4.0 · legs 4.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · quads 2.0 · transverse_abdominis 2.0 · middle_traps 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): traps 4 · anterior_deltoids 2 · biceps 2 · calves 2 · core 2 · forearms 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · legs 2 · quadriceps 2 · shoulders 2 · triceps 2 · brachialis 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 12 · knee_dominant 12 · vertical_press 9 · vertical_pull 9 · elbow_extension 6 · elbow_flexion 6 · trunk_stability 6 · carry 4 · shoulder_isolation 4 · horizontal_press 3 · horizontal_pull 3
- sets in seed / total: 16/74
- max estimatedDurationMinutes: 57
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `blend|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `blend|5d|full gym|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 34 · Arms 38 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 20.0 · triceps 20.0 · anterior_deltoids 19.5 · lateral_deltoids 18.0 · lats 16.5 · rhomboids 15.0 · core 14.0 · glutes 14.0 · middle_traps 12.0 · traps 11.5 · rear_deltoids 10.5 · pectorals 10.0 · erector_spinae 9.0 · quadriceps 9.0 · hamstrings 6.0 · hip_adductors 6.0 · obliques 6.0 · calves 4.5 · serratus_anterior 4.5 · upper_traps 4.5 · brachialis 4.0 · forearms 4.0 · hip_flexors 4.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 4 · biceps 3 · core 3 · lateral_deltoids 3 · obliques 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · hamstrings 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 40/90
- max estimatedDurationMinutes: 56

### `blend|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `blend|5d|home dumbbells|twice`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 27 · Arms 31 · Legs 30 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 17.0 · triceps 17.0 · traps 16.0 · anterior_deltoids 15.5 · core 15.5 · lateral_deltoids 15.0 · biceps 9.5 · hamstrings 9.0 · quadriceps 9.0 · rear_deltoids 9.0 · rhomboids 9.0 · shoulders 9.0 · pectorals 8.0 · legs 6.0 · brachialis 5.0 · cardiovascular 4.5 · middle_traps 4.5 · forearms 4.0 · transverse_abdominis 4.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): traps 5 · biceps 3 · core 3 · lateral_deltoids 3 · legs 3 · shoulders 3 · anterior_deltoids 2 · forearms 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · brachialis 1 · pectorals 1
- sets/movement-pattern: vertical_press 12 · trunk_stability 10 · hip_hinge 9 · horizontal_pull 9 · knee_dominant 9 · vertical_pull 9 · elbow_extension 8 · elbow_flexion 8 · horizontal_press 6 · shoulder_isolation 6 · carry 4
- sets in seed / total: 16/90
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `blend|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `blend|6d|full gym|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 39 · Shoulders 36 · Arms 42 · Legs 27 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 27.0 · anterior_deltoids 21.0 · lateral_deltoids 20.0 · triceps 20.0 · lats 19.5 · rhomboids 18.0 · traps 17.5 · core 16.0 · pectorals 16.0 · middle_traps 15.0 · glutes 14.0 · rear_deltoids 12.0 · erector_spinae 9.0 · quadriceps 9.0 · obliques 8.0 · calves 7.5 · brachialis 6.0 · hamstrings 6.0 · hip_adductors 6.0 · serratus_anterior 6.0 · forearms 4.0 · hip_flexors 4.0 · upper_traps 3.0 · quads 2.0
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · obliques 4 · anterior_deltoids 2 · forearms 2 · glutes 2 · hip_adductors 2 · hip_flexors 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 43/113
- max estimatedDurationMinutes: 57

### `blend|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `blend|6d|home dumbbells|twice`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 12 · Back 12 · Shoulders 32 · Arms 40 · Legs 33 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): traps 22.0 · lateral_deltoids 20.0 · triceps 20.0 · core 19.0 · anterior_deltoids 17.0 · glutes 17.0 · biceps 15.0 · pectorals 14.0 · shoulders 14.0 · rear_deltoids 12.0 · rhomboids 12.0 · hamstrings 9.0 · quadriceps 9.0 · brachialis 8.0 · legs 8.0 · cardiovascular 7.0 · middle_traps 6.0 · forearms 4.0 · transverse_abdominis 4.0 · calves 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · quads 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): traps 6 · biceps 4 · core 4 · lateral_deltoids 4 · legs 4 · shoulders 4 · anterior_deltoids 2 · brachialis 2 · forearms 2 · glutes 2 · hamstrings 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · calves 1
- sets/movement-pattern: elbow_flexion 12 · horizontal_press 12 · horizontal_pull 12 · knee_dominant 12 · trunk_stability 12 · vertical_press 12 · vertical_pull 12 · hip_hinge 9 · elbow_extension 8 · shoulder_isolation 8 · carry 4
- sets in seed / total: 19/113
- max estimatedDurationMinutes: 58
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

## Empty-history loads per experience (barbell_bench_press @ 8 reps)

- beginner: **20 kg**
- intermediate: **60 kg**
- advanced: **100 kg**
- intermediate + explicit 1RM 100 kg via Epley: **80 kg** (formula rounded 80)

## Reactive double progression (synthetic history)

- decideDoubleProgression on 3×8 @ 60 kg range 6–8: action **increase**, next **62.5** (+2.5kg — you hit 3×8 last time.)
- muscle|3d|full gym|once barbell_bench_press empty vs history: 60 → 60

## scoreExercise vs goals

- chooseExercise(horizontal_press) muscle vs strength ranking identical: **true**
- muscle top5: barbell_bench_press, dumbbell_bench_press, close_grip_bench_press, dumbbell_flyes, push_ups
- strength top5: barbell_bench_press, dumbbell_bench_press, close_grip_bench_press, dumbbell_flyes, push_ups
