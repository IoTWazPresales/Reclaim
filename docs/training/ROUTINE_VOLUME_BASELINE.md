# Routine volume baseline

**Generated:** 2026-09-29 by `routineVolumeMeasurement.test.ts` (N-0022 remeasure: omitted experience is beginner).
**Path:** same two-pass `buildProgramDaySession` as `TrainingScreen.weekSessionVolume` (pass 1 → muscle session counts → pass 2). The wrapper delegates to the engine builder.
**Evidence class:** executable measurement (vitest). Hard volume bands are Stage C F6, not this file.

## Catalogue tags outside regional volume buckets

Unknown tags (the taxonomy test fails the build if this list is not empty):

_none_

Non-regional tags (known; not counted in Chest, Back, Shoulders, Arms, Legs, or Core):

- `cardiovascular`
- `full_body`

## History production fetch share

Seed id count: **31** (`squat`, `front_squat`, `leg_press`, `deadlift`, `romanian_deadlift`, `hip_thrust`, `barbell_bench_press`, `dumbbell_bench_press`, `incline_bench_press`, `overhead_press`, `dumbbell_shoulder_press`, `lat_pulldown`, `pull_ups`, `chin_ups`, `cable_row`, `barbell_row`, `t_bar_row`, `farmer_walk`, `barbell_curl`, `dumbbell_curl`, `hammer_curl`, `tricep_pushdown`, `overhead_tricep_extension`, `rope_tricep_pushdown`, `cable_overhead_extension`, `lateral_raises`, `face_pulls`, `leg_curls`, `leg_extensions`, `calf_raises`, `seated_calf_raise`).
Share below is sets whose exercise id is in that seed (the only ids `loadTrainingPerformanceSeed` fetches).

## Clone-claim measurement (reconfirm, not trust)

| Claim | Result |
|---|---|
| Weeks 1–4 fingerprint identical (empty history) | **100/100** scenarios identical |
| History seed id count | **31** (expected 18) |
| Share of weekly sets whose ids are in the seed | **74.5%** |
| UI weekly-sets line omits Core | **68/100** scenarios have no `Core` token |
| Isolation/accessory tier in a required compound slot | **78/100** scenarios had ≥1 hit |
| Estimated duration > 60 min time budget | **0/100** scenarios |

## Per-scenario week-1 pass-2 volume

### `muscle|2d|full gym|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 16 · Shoulders 15 · Arms 14 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · hamstrings 7.5 · anterior_deltoids 7.0 · erector_spinae 7.0 · biceps 6.5 · lats 6.5 · lateral_deltoids 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.0 · calves 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · elbow_extension 3 · elbow_flexion 3 · horizontal_pull 3 · shoulder_isolation 3 · vertical_press 3 · vertical_pull 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `muscle|2d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 16 · Shoulders 15 · Arms 14 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · hamstrings 7.5 · anterior_deltoids 7.0 · erector_spinae 7.0 · biceps 6.5 · lats 6.5 · lateral_deltoids 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.0 · calves 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · elbow_extension 3 · elbow_flexion 3 · horizontal_pull 3 · shoulder_isolation 3 · vertical_press 3 · vertical_pull 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `muscle|2d|home dumbbells|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 12 · Arms 9 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 7.0 · lateral_deltoids 6.0 · triceps 6.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.0 · biceps 3.0 · quadriceps 2.0 · brachialis 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · calves 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · elbow_flexion 3 · hip_hinge 3 · shoulder_isolation 3 · vertical_press 3 · knee_dominant 2
- sets in seed / total: 15/19
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `muscle|2d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 12 · Arms 9 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 7.0 · lateral_deltoids 6.0 · triceps 6.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.0 · biceps 3.0 · quadriceps 2.0 · brachialis 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · calves 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · elbow_flexion 3 · hip_hinge 3 · shoulder_isolation 3 · vertical_press 3 · knee_dominant 2
- sets in seed / total: 15/19
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `muscle|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 21 · Shoulders 9 · Arms 19 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · biceps 10.5 · anterior_deltoids 8.5 · lats 8.0 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · middle_traps 5.0 · hamstrings 4.5 · rear_deltoids 4.0 · lateral_deltoids 3.0 · quadriceps 3.0 · brachialis 2.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: horizontal_press 8 · elbow_extension 5 · elbow_flexion 5 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 30/35
- max estimatedDurationMinutes: 32

### `muscle|3d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 25 · Shoulders 21 · Arms 20 · Legs 35
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 16.0 · hamstrings 12.0 · triceps 12.0 · rhomboids 11.0 · anterior_deltoids 10.0 · erector_spinae 10.0 · biceps 9.5 · lats 9.5 · rear_deltoids 8.5 · pectorals 8.0 · quadriceps 8.0 · calves 7.5 · lateral_deltoids 6.0 · middle_traps 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · biceps 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · middle_traps 1
- sets/movement-pattern: knee_dominant 11 · hip_hinge 8 · horizontal_press 8 · horizontal_pull 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_extension 3 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 46/50
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `muscle|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 17 · Arms 16 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · anterior_deltoids 8.5 · pectorals 8.0 · glutes 6.0 · biceps 5.0 · rear_deltoids 5.0 · rhomboids 5.0 · hamstrings 3.0 · lateral_deltoids 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · brachialis 2.5 · middle_traps 2.5 · cardiovascular 1.5 · core 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · shoulders 1 · traps 1 · triceps 1
- sets/movement-pattern: horizontal_press 8 · elbow_extension 5 · elbow_flexion 5 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 14/35
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `muscle|3d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 3 · Shoulders 18 · Arms 12 · Legs 19
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 10.0 · triceps 9.0 · glutes 8.0 · pectorals 8.0 · hamstrings 7.0 · lateral_deltoids 6.0 · calves 4.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · quadriceps 2.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · triceps 2 · biceps 1 · calves 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: horizontal_press 8 · hip_hinge 6 · shoulder_isolation 6 · knee_dominant 5 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 24/31
- max estimatedDurationMinutes: 37
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `muscle|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 21 · Shoulders 15 · Arms 32 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · biceps 15.5 · anterior_deltoids 11.5 · lats 8.0 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · lateral_deltoids 6.0 · brachialis 5.0 · middle_traps 5.0 · hamstrings 4.5 · rear_deltoids 4.0 · quadriceps 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 8 · vertical_press 6 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 43/48
- max estimatedDurationMinutes: 32

### `muscle|4d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 31 · Shoulders 23 · Arms 23 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · triceps 15.0 · hamstrings 13.0 · rhomboids 13.0 · lats 11.5 · anterior_deltoids 11.0 · biceps 10.5 · rear_deltoids 10.5 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · calves 9.0 · middle_traps 8.0 · lateral_deltoids 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · erector_spinae 1
- sets/movement-pattern: knee_dominant 16 · horizontal_press 10 · hip_hinge 8 · horizontal_pull 8 · elbow_extension 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 53/62
- max estimatedDurationMinutes: 51
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3

### `muscle|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 13 · Shoulders 28 · Arms 29 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · biceps 10.0 · rear_deltoids 10.0 · rhomboids 10.0 · pectorals 8.0 · glutes 6.0 · lateral_deltoids 6.0 · brachialis 5.0 · middle_traps 5.0 · hamstrings 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · upper_traps 3.0 · cardiovascular 1.5 · core 1.5 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_pull 10 · horizontal_press 8 · vertical_press 6 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 22/53
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `muscle|4d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 3 · Shoulders 18 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · lateral_deltoids 6.0 · quadriceps 5.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · triceps 2 · biceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: knee_dominant 11 · horizontal_press 10 · hip_hinge 6 · shoulder_isolation 6 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 27/39
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `muscle|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 24 · Shoulders 15 · Arms 27 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · biceps 10.5 · lats 9.5 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · lateral_deltoids 6.0 · middle_traps 5.0 · hamstrings 4.5 · core 4.0 · rear_deltoids 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · brachialis 2.5 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: elbow_extension 10 · horizontal_press 8 · vertical_press 6 · elbow_flexion 5 · horizontal_pull 5 · trunk_stability 4 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 38/47
- max estimatedDurationMinutes: 32

### `muscle|5d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): rear_deltoids 3 · rhomboids 3 · triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 48
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3

### `muscle|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 13 · Shoulders 28 · Arms 24 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · rear_deltoids 10.0 · rhomboids 10.0 · pectorals 8.0 · glutes 6.0 · lateral_deltoids 6.0 · core 5.5 · biceps 5.0 · middle_traps 5.0 · transverse_abdominis 4.0 · hamstrings 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · upper_traps 3.0 · brachialis 2.5 · cardiovascular 1.5 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: elbow_extension 10 · horizontal_pull 10 · horizontal_press 8 · vertical_press 6 · elbow_flexion 5 · trunk_stability 4 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 17/52
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `muscle|5d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 9 · Shoulders 24 · Arms 15 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · lateral_deltoids 9.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · traps 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · traps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 10 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 33/51
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `muscle|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 30 · Shoulders 18 · Arms 38 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 22.0 · biceps 18.5 · anterior_deltoids 14.0 · lats 12.5 · rhomboids 11.0 · pectorals 10.0 · glutes 9.0 · hamstrings 6.0 · lateral_deltoids 6.0 · quadriceps 6.0 · rear_deltoids 5.5 · brachialis 5.0 · middle_traps 5.0 · serratus_anterior 4.5 · core 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · upper_traps 3.0 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 10 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · horizontal_pull 5 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 52/60
- max estimatedDurationMinutes: 32

### `muscle|6d|full gym|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 45
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Push B:dumbbell_flyes@horizontal_press:tier3

### `muscle|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 16 · Shoulders 34 · Arms 32 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 22.0 · anterior_deltoids 14.0 · biceps 10.0 · pectorals 10.0 · rear_deltoids 10.0 · rhomboids 10.0 · glutes 9.0 · core 7.0 · lateral_deltoids 6.0 · quadriceps 6.0 · shoulders 6.0 · traps 6.0 · brachialis 5.0 · middle_traps 5.0 · transverse_abdominis 4.0 · cardiovascular 3.0 · hamstrings 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · transverse_abdominis 2 · traps 2 · triceps 2 · hamstrings 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 10 · horizontal_pull 10 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 25/65
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `muscle|6d|home dumbbells|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 7 · Back 9 · Shoulders 21 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 11.0 · lateral_deltoids 9.0 · calves 8.5 · hamstrings 8.5 · anterior_deltoids 8.0 · pectorals 7.0 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · triceps 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · traps 3.0 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · anterior_deltoids 1 · traps 1 · triceps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 7 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 30/48
- max estimatedDurationMinutes: 32
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Legs A (Squat):lunges@knee_dominant:tier3; Push B:dumbbell_flyes@horizontal_press:tier3; Legs B (Deadlift):lunges@knee_dominant:tier3

### `strength|2d|full gym|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 18 · Shoulders 19 · Arms 15 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · glutes 10.0 · anterior_deltoids 8.5 · erector_spinae 8.5 · hamstrings 7.5 · lateral_deltoids 7.0 · lats 7.0 · biceps 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.5 · calves 4.0 · middle_traps 4.0 · serratus_anterior 4.0 · traps 2.0 · upper_traps 2.0 · brachialis 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · horizontal_pull 4 · vertical_press 4 · elbow_extension 3 · elbow_flexion 3 · shoulder_isolation 3 · vertical_pull 1
- sets in seed / total: 31/33
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `strength|2d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 18 · Shoulders 19 · Arms 15 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · glutes 10.0 · anterior_deltoids 8.5 · erector_spinae 8.5 · hamstrings 7.5 · lateral_deltoids 7.0 · lats 7.0 · biceps 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.5 · calves 4.0 · middle_traps 4.0 · serratus_anterior 4.0 · traps 2.0 · upper_traps 2.0 · brachialis 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · horizontal_pull 4 · vertical_press 4 · elbow_extension 3 · elbow_flexion 3 · shoulder_isolation 3 · vertical_pull 1
- sets in seed / total: 31/33
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `strength|2d|home dumbbells|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 15 · Arms 11 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 8.5 · triceps 8.0 · lateral_deltoids 7.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.5 · biceps 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · brachialis 1.5 · quadriceps 1.0 · calves 0.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · hip_hinge 4 · vertical_press 4 · elbow_flexion 3 · shoulder_isolation 3 · knee_dominant 1
- sets in seed / total: 18/20
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `strength|2d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 15 · Arms 11 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 8.5 · triceps 8.0 · lateral_deltoids 7.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.5 · biceps 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · brachialis 1.5 · quadriceps 1.0 · calves 0.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · hip_hinge 4 · vertical_press 4 · elbow_flexion 3 · shoulder_isolation 3 · knee_dominant 1
- sets in seed / total: 18/20
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `strength|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 20 · Shoulders 12 · Arms 16 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 10.0 · anterior_deltoids 8.0 · biceps 8.0 · glutes 8.0 · lats 8.0 · rhomboids 8.0 · hamstrings 6.0 · lateral_deltoids 4.0 · middle_traps 4.0 · pectorals 4.0 · quadriceps 4.0 · rear_deltoids 4.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · brachialis 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: hip_hinge 4 · horizontal_press 4 · horizontal_pull 4 · knee_dominant 4 · vertical_press 4 · vertical_pull 4 · elbow_extension 2 · elbow_flexion 2
- sets in seed / total: 28/28
- max estimatedDurationMinutes: 29

### `strength|3d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 9 · Back 29 · Shoulders 26 · Arms 23 · Legs 39
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · triceps 15.0 · hamstrings 13.5 · anterior_deltoids 12.5 · erector_spinae 12.5 · rhomboids 12.0 · lats 11.0 · biceps 10.0 · rear_deltoids 9.5 · calves 9.0 · pectorals 9.0 · quadriceps 9.0 · middle_traps 7.5 · lateral_deltoids 7.0 · serratus_anterior 6.0 · traps 2.0 · upper_traps 2.0 · brachialis 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · biceps 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · middle_traps 1
- sets/movement-pattern: knee_dominant 12 · hip_hinge 9 · horizontal_press 9 · horizontal_pull 7 · shoulder_isolation 6 · vertical_pull 5 · vertical_press 4 · elbow_extension 3 · elbow_flexion 3
- sets in seed / total: 53/55
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `strength|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 7 · Shoulders 19 · Arms 12 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 10.0 · anterior_deltoids 8.0 · glutes 8.0 · hamstrings 4.0 · lateral_deltoids 4.0 · pectorals 4.0 · quadriceps 4.0 · shoulders 4.0 · traps 4.0 · rear_deltoids 3.0 · rhomboids 3.0 · biceps 2.0 · cardiovascular 2.0 · core 2.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · middle_traps 1.5 · brachialis 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · shoulders 1 · traps 1 · triceps 1
- sets/movement-pattern: hip_hinge 4 · horizontal_press 4 · knee_dominant 4 · vertical_press 4 · vertical_pull 4 · horizontal_pull 3 · elbow_extension 2 · elbow_flexion 2
- sets in seed / total: 14/27
- max estimatedDurationMinutes: 29
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `strength|3d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 9 · Back 3 · Shoulders 22 · Arms 15 · Legs 21
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 12.5 · triceps 12.0 · glutes 9.0 · pectorals 9.0 · hamstrings 8.5 · lateral_deltoids 7.0 · erector_spinae 4.0 · serratus_anterior 4.0 · calves 3.5 · biceps 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · upper_traps 2.0 · brachialis 1.5 · middle_traps 1.5 · quadriceps 1.0
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · triceps 2 · biceps 1 · calves 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: horizontal_press 9 · hip_hinge 8 · shoulder_isolation 6 · knee_dominant 4 · vertical_press 4 · elbow_flexion 3 · horizontal_pull 3
- sets in seed / total: 29/34
- max estimatedDurationMinutes: 37
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `strength|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 4 · Back 32 · Shoulders 20 · Arms 22 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 14.0 · anterior_deltoids 12.0 · biceps 12.0 · lats 12.0 · rhomboids 12.0 · glutes 8.0 · lateral_deltoids 8.0 · middle_traps 8.0 · hamstrings 6.0 · rear_deltoids 6.0 · pectorals 4.0 · quadriceps 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · brachialis 2.0 · erector_spinae 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 8 · elbow_flexion 4 · hip_hinge 4 · horizontal_press 4 · knee_dominant 4 · vertical_pull 4 · elbow_extension 2
- sets in seed / total: 38/38
- max estimatedDurationMinutes: 32

### `strength|4d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 32 · Shoulders 27 · Arms 26 · Legs 44
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 19.0 · triceps 18.0 · hamstrings 14.0 · anterior_deltoids 13.0 · rhomboids 13.0 · lats 12.0 · erector_spinae 11.0 · biceps 10.5 · rear_deltoids 10.5 · calves 10.0 · pectorals 10.0 · quadriceps 10.0 · middle_traps 8.5 · lateral_deltoids 7.0 · serratus_anterior 6.0 · traps 2.0 · upper_traps 2.0 · brachialis 1.5
- frequency (sessions containing primary muscle): triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · erector_spinae 1
- sets/movement-pattern: knee_dominant 16 · horizontal_press 10 · hip_hinge 9 · horizontal_pull 8 · elbow_extension 6 · shoulder_isolation 6 · vertical_pull 5 · vertical_press 4 · elbow_flexion 3
- sets in seed / total: 57/64
- max estimatedDurationMinutes: 51
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3

### `strength|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 4 · Back 10 · Shoulders 30 · Arms 18 · Legs 16
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 14.0 · anterior_deltoids 12.0 · glutes 8.0 · lateral_deltoids 8.0 · rear_deltoids 6.0 · rhomboids 6.0 · biceps 4.0 · hamstrings 4.0 · pectorals 4.0 · quadriceps 4.0 · shoulders 4.0 · traps 4.0 · upper_traps 4.0 · middle_traps 3.0 · brachialis 2.0 · cardiovascular 2.0 · core 2.0 · erector_spinae 2.0 · serratus_anterior 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: vertical_press 8 · horizontal_pull 6 · elbow_flexion 4 · hip_hinge 4 · horizontal_press 4 · knee_dominant 4 · vertical_pull 4 · elbow_extension 2
- sets in seed / total: 20/36
- max estimatedDurationMinutes: 29
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `strength|4d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 3 · Shoulders 22 · Arms 15 · Legs 32
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 13.0 · glutes 13.0 · triceps 12.0 · hamstrings 10.5 · pectorals 10.0 · calves 8.5 · lateral_deltoids 7.0 · quadriceps 5.0 · erector_spinae 4.0 · serratus_anterior 4.0 · biceps 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · upper_traps 2.0 · brachialis 1.5 · middle_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · triceps 2 · biceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: knee_dominant 11 · horizontal_press 10 · hip_hinge 8 · shoulder_isolation 6 · vertical_press 4 · elbow_flexion 3 · horizontal_pull 3
- sets in seed / total: 32/42
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `strength|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 36 · Shoulders 20 · Arms 20 · Legs 16 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): lats 14.0 · triceps 14.0 · anterior_deltoids 12.0 · rhomboids 12.0 · biceps 10.0 · glutes 8.0 · lateral_deltoids 8.0 · middle_traps 8.0 · core 6.0 · hamstrings 6.0 · rear_deltoids 6.0 · transverse_abdominis 6.0 · erector_spinae 4.0 · pectorals 4.0 · quadriceps 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · calves 2.0 · traps 2.0 · brachialis 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_pull 8 · vertical_press 8 · trunk_stability 6 · hip_hinge 4 · horizontal_press 4 · knee_dominant 4 · vertical_pull 4 · elbow_extension 2 · elbow_flexion 2
- sets in seed / total: 36/42
- max estimatedDurationMinutes: 29

### `strength|5d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 38 · Shoulders 33 · Arms 29 · Legs 44
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 19.0 · triceps 18.0 · rhomboids 16.0 · hamstrings 14.0 · biceps 13.5 · rear_deltoids 13.5 · anterior_deltoids 13.0 · lats 12.0 · erector_spinae 11.0 · calves 10.0 · lateral_deltoids 10.0 · middle_traps 10.0 · pectorals 10.0 · quadriceps 10.0 · serratus_anterior 6.0 · traps 5.0 · brachialis 3.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): rear_deltoids 3 · rhomboids 3 · triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 9 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 4
- sets in seed / total: 66/76
- max estimatedDurationMinutes: 48
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3

### `strength|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 10 · Shoulders 30 · Arms 16 · Legs 16 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 14.0 · anterior_deltoids 12.0 · core 8.0 · glutes 8.0 · lateral_deltoids 8.0 · rear_deltoids 6.0 · rhomboids 6.0 · transverse_abdominis 6.0 · hamstrings 4.0 · pectorals 4.0 · quadriceps 4.0 · shoulders 4.0 · traps 4.0 · upper_traps 4.0 · middle_traps 3.0 · biceps 2.0 · cardiovascular 2.0 · erector_spinae 2.0 · serratus_anterior 2.0 · brachialis 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: vertical_press 8 · horizontal_pull 6 · trunk_stability 6 · hip_hinge 4 · horizontal_press 4 · knee_dominant 4 · vertical_pull 4 · elbow_extension 2 · elbow_flexion 2
- sets in seed / total: 18/40
- max estimatedDurationMinutes: 29
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `strength|5d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 9 · Shoulders 28 · Arms 18 · Legs 32
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 13.0 · glutes 13.0 · triceps 12.0 · hamstrings 10.5 · lateral_deltoids 10.0 · pectorals 10.0 · calves 8.5 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · quadriceps 5.0 · erector_spinae 4.0 · serratus_anterior 4.0 · brachialis 3.0 · middle_traps 3.0 · traps 3.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · traps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 10 · hip_hinge 8 · elbow_flexion 6 · horizontal_pull 6 · vertical_press 4 · vertical_pull 3
- sets in seed / total: 38/54
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `strength|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 44 · Shoulders 24 · Arms 30 · Legs 24 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): lats 18.0 · triceps 18.0 · anterior_deltoids 16.0 · biceps 16.0 · rhomboids 16.0 · glutes 12.0 · hamstrings 8.0 · lateral_deltoids 8.0 · middle_traps 8.0 · pectorals 8.0 · quadriceps 8.0 · rear_deltoids 8.0 · core 6.0 · serratus_anterior 6.0 · transverse_abdominis 6.0 · erector_spinae 4.0 · upper_traps 4.0 · brachialis 2.0 · calves 2.0 · traps 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: horizontal_press 8 · horizontal_pull 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · trunk_stability 6 · elbow_flexion 4 · hip_hinge 4 · elbow_extension 2
- sets in seed / total: 50/56
- max estimatedDurationMinutes: 31

### `strength|6d|full gym|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 38 · Shoulders 33 · Arms 29 · Legs 44
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 19.0 · triceps 18.0 · rhomboids 16.0 · hamstrings 14.0 · biceps 13.5 · rear_deltoids 13.5 · anterior_deltoids 13.0 · lats 12.0 · erector_spinae 11.0 · calves 10.0 · lateral_deltoids 10.0 · middle_traps 10.0 · pectorals 10.0 · quadriceps 10.0 · serratus_anterior 6.0 · traps 5.0 · brachialis 3.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 9 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 4
- sets in seed / total: 66/76
- max estimatedDurationMinutes: 45
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Push B:dumbbell_flyes@horizontal_press:tier3

### `strength|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 14 · Shoulders 38 · Arms 22 · Legs 24 · Core 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 18.0 · anterior_deltoids 16.0 · glutes 12.0 · core 10.0 · lateral_deltoids 8.0 · pectorals 8.0 · quadriceps 8.0 · shoulders 8.0 · traps 8.0 · rear_deltoids 6.0 · rhomboids 6.0 · transverse_abdominis 6.0 · biceps 4.0 · cardiovascular 4.0 · hamstrings 4.0 · serratus_anterior 4.0 · upper_traps 4.0 · middle_traps 3.0 · brachialis 2.0 · erector_spinae 2.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · transverse_abdominis 2 · traps 2 · triceps 2 · hamstrings 1
- sets/movement-pattern: horizontal_press 8 · knee_dominant 8 · vertical_press 8 · vertical_pull 8 · horizontal_pull 6 · trunk_stability 6 · elbow_flexion 4 · hip_hinge 4 · elbow_extension 2
- sets in seed / total: 24/54
- max estimatedDurationMinutes: 31
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `strength|6d|home dumbbells|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 24 · Arms 14 · Legs 32
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · hamstrings 10.5 · lateral_deltoids 10.0 · anterior_deltoids 9.0 · calves 8.5 · triceps 8.0 · biceps 6.0 · pectorals 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · quadriceps 5.0 · erector_spinae 4.0 · brachialis 3.0 · middle_traps 3.0 · traps 3.0 · serratus_anterior 2.0 · upper_traps 2.0
- frequency (sessions containing primary muscle): biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · anterior_deltoids 1 · traps 1 · triceps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · hip_hinge 8 · elbow_flexion 6 · horizontal_press 6 · horizontal_pull 6 · vertical_press 4 · vertical_pull 3
- sets in seed / total: 34/50
- max estimatedDurationMinutes: 32
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Legs A (Squat):lunges@knee_dominant:tier3; Push B:dumbbell_flyes@horizontal_press:tier3; Legs B (Deadlift):lunges@knee_dominant:tier3

### `fat|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 32 · Shoulders 9 · Arms 14 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · lats 12.0 · rhomboids 12.0 · biceps 9.0 · hamstrings 9.0 · anterior_deltoids 6.0 · middle_traps 6.0 · quadriceps 6.0 · rear_deltoids 6.0 · triceps 6.0 · core 4.0 · erector_spinae 3.0 · lateral_deltoids 3.0 · pectorals 3.0 · forearms 2.0 · transverse_abdominis 2.0 · traps 2.0 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · hamstrings 2 · lats 2 · middle_traps 2 · quadriceps 2 · rhomboids 2 · triceps 2 · forearms 1 · lateral_deltoids 1 · pectorals 1 · transverse_abdominis 1 · traps 1
- sets/movement-pattern: hip_hinge 6 · horizontal_pull 6 · knee_dominant 6 · vertical_pull 6 · horizontal_press 3 · vertical_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 32/34
- max estimatedDurationMinutes: 55

### `fat|2d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 16 · Shoulders 15 · Arms 14 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · hamstrings 7.5 · anterior_deltoids 7.0 · erector_spinae 7.0 · biceps 6.5 · lats 6.5 · lateral_deltoids 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.0 · calves 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · elbow_extension 3 · elbow_flexion 3 · horizontal_pull 3 · shoulder_isolation 3 · vertical_press 3 · vertical_pull 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `fat|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 12 · Shoulders 19 · Arms 8 · Legs 24 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 13.0 · traps 8.0 · core 7.0 · anterior_deltoids 6.0 · hamstrings 6.0 · quadriceps 6.0 · shoulders 6.0 · triceps 6.0 · rear_deltoids 4.0 · rhomboids 4.0 · cardiovascular 3.0 · erector_spinae 3.0 · lateral_deltoids 3.0 · pectorals 3.0 · forearms 2.0 · middle_traps 2.0 · transverse_abdominis 2.0 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · lateral_deltoids 1 · pectorals 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 6 · knee_dominant 6 · vertical_pull 6 · horizontal_pull 4 · horizontal_press 3 · vertical_press 3 · carry 2 · trunk_stability 2
- sets in seed / total: 14/32
- max estimatedDurationMinutes: 52
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fat|2d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 12 · Arms 9 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 7.0 · lateral_deltoids 6.0 · triceps 6.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.0 · biceps 3.0 · quadriceps 2.0 · brachialis 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · calves 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · elbow_flexion 3 · hip_hinge 3 · shoulder_isolation 3 · vertical_press 3 · knee_dominant 2
- sets in seed / total: 15/19
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `fat|3d|full gym|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 3 · Back 8 · Shoulders 9 · Arms 11 · Legs 12 · Core 10
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 7.0 · anterior_deltoids 6.0 · core 6.0 · triceps 6.0 · hamstrings 4.5 · transverse_abdominis 4.0 · biceps 3.0 · lateral_deltoids 3.0 · lats 3.0 · pectorals 3.0 · quadriceps 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · cardiovascular 2.0 · forearms 2.0 · full_body 2.0 · traps 2.0 · erector_spinae 1.5 · rear_deltoids 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · cardiovascular 1 · forearms 1 · full_body 1 · hamstrings 1 · lateral_deltoids 1 · lats 1 · pectorals 1 · quadriceps 1 · rhomboids 1 · traps 1
- sets/movement-pattern: trunk_stability 4 · hip_hinge 3 · horizontal_press 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3 · carry 2 · conditioning 2
- sets in seed / total: 17/23
- max estimatedDurationMinutes: 34

### `fat|3d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 25 · Shoulders 21 · Arms 20 · Legs 35
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 16.0 · hamstrings 12.0 · triceps 12.0 · rhomboids 11.0 · anterior_deltoids 10.0 · erector_spinae 10.0 · biceps 9.5 · lats 9.5 · rear_deltoids 8.5 · pectorals 8.0 · quadriceps 8.0 · calves 7.5 · lateral_deltoids 6.0 · middle_traps 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · biceps 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · middle_traps 1
- sets/movement-pattern: knee_dominant 11 · hip_hinge 8 · horizontal_press 8 · horizontal_pull 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_extension 3 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 46/50
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `fat|3d|home dumbbells|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 3 · Back 5 · Shoulders 12 · Arms 8 · Legs 12 · Core 10
- fractional sets/muscle (1 primary / 0.5 secondary): core 7.5 · glutes 7.0 · anterior_deltoids 6.0 · triceps 6.0 · traps 5.0 · transverse_abdominis 4.0 · cardiovascular 3.5 · hamstrings 3.0 · lateral_deltoids 3.0 · pectorals 3.0 · quadriceps 3.0 · shoulders 3.0 · forearms 2.0 · full_body 2.0 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · quads 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · transverse_abdominis 2 · traps 2 · triceps 2 · cardiovascular 1 · forearms 1 · full_body 1 · hamstrings 1 · lateral_deltoids 1 · pectorals 1 · quadriceps 1 · shoulders 1
- sets/movement-pattern: trunk_stability 4 · hip_hinge 3 · horizontal_press 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3 · carry 2 · conditioning 2
- sets in seed / total: 11/23
- max estimatedDurationMinutes: 34
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fat|3d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 3 · Shoulders 18 · Arms 12 · Legs 19
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 10.0 · triceps 9.0 · glutes 8.0 · pectorals 8.0 · hamstrings 7.0 · lateral_deltoids 6.0 · calves 4.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · quadriceps 2.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · triceps 2 · biceps 1 · calves 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: horizontal_press 8 · hip_hinge 6 · shoulder_isolation 6 · knee_dominant 5 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 24/31
- max estimatedDurationMinutes: 37
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `fat|4d|full gym|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 18 · Shoulders 9 · Arms 13 · Legs 24 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 12.0 · hamstrings 9.0 · triceps 8.0 · lats 7.5 · biceps 6.5 · anterior_deltoids 6.0 · quadriceps 6.0 · rhomboids 6.0 · erector_spinae 4.5 · lateral_deltoids 3.0 · middle_traps 3.0 · pectorals 3.0 · rear_deltoids 3.0 · serratus_anterior 3.0 · core 2.0 · transverse_abdominis 2.0 · calves 1.5 · traps 1.5 · upper_traps 1.5 · brachialis 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · glutes 2 · hamstrings 2 · lats 2 · quadriceps 2 · rhomboids 2 · triceps 2 · core 1 · erector_spinae 1 · lateral_deltoids 1 · middle_traps 1 · pectorals 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 6 · knee_dominant 6 · horizontal_press 3 · horizontal_pull 3 · vertical_press 3 · vertical_pull 3 · elbow_extension 2 · elbow_flexion 2 · trunk_stability 2
- sets in seed / total: 28/30
- max estimatedDurationMinutes: 31

### `fat|4d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 31 · Shoulders 23 · Arms 23 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · triceps 15.0 · hamstrings 13.0 · rhomboids 13.0 · lats 11.5 · anterior_deltoids 11.0 · biceps 10.5 · rear_deltoids 10.5 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · calves 9.0 · middle_traps 8.0 · lateral_deltoids 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · erector_spinae 1
- sets/movement-pattern: knee_dominant 16 · horizontal_press 10 · hip_hinge 8 · horizontal_pull 8 · elbow_extension 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 53/62
- max estimatedDurationMinutes: 51
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3

### `fat|4d|home dumbbells|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 3 · Back 5 · Shoulders 17 · Arms 11 · Legs 24 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 12.0 · triceps 8.0 · anterior_deltoids 6.0 · hamstrings 6.0 · quadriceps 6.0 · shoulders 6.0 · core 5.0 · biceps 3.0 · cardiovascular 3.0 · erector_spinae 3.0 · lateral_deltoids 3.0 · pectorals 3.0 · traps 3.0 · rear_deltoids 2.0 · rhomboids 2.0 · transverse_abdominis 2.0 · brachialis 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · middle_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · hamstrings 2 · quadriceps 2 · shoulders 2 · triceps 2 · biceps 1 · core 1 · lateral_deltoids 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1 · traps 1
- sets/movement-pattern: hip_hinge 6 · knee_dominant 6 · elbow_flexion 3 · horizontal_press 3 · vertical_press 3 · vertical_pull 3 · elbow_extension 2 · horizontal_pull 2 · trunk_stability 2
- sets in seed / total: 15/30
- max estimatedDurationMinutes: 31
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fat|4d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 3 · Shoulders 18 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · lateral_deltoids 6.0 · quadriceps 5.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · triceps 2 · biceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: knee_dominant 11 · horizontal_press 10 · hip_hinge 6 · shoulder_isolation 6 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 27/39
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `fat|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 3 · Back 27 · Shoulders 15 · Arms 19 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 13.0 · lats 10.5 · anterior_deltoids 9.0 · biceps 9.0 · rhomboids 9.0 · glutes 6.0 · lateral_deltoids 6.0 · middle_traps 6.0 · hamstrings 4.5 · rear_deltoids 4.5 · core 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · pectorals 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · brachialis 1.5 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_pull 6 · vertical_press 6 · elbow_extension 4 · trunk_stability 4 · elbow_flexion 3 · hip_hinge 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 31/35
- max estimatedDurationMinutes: 29

### `fat|5d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): rear_deltoids 3 · rhomboids 3 · triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 48
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3

### `fat|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 3 · Back 7 · Shoulders 22 · Arms 16 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 13.0 · anterior_deltoids 9.0 · glutes 6.0 · lateral_deltoids 6.0 · core 5.5 · rear_deltoids 4.0 · rhomboids 4.0 · transverse_abdominis 4.0 · biceps 3.0 · hamstrings 3.0 · pectorals 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · upper_traps 3.0 · middle_traps 2.0 · brachialis 1.5 · cardiovascular 1.5 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: vertical_press 6 · elbow_extension 4 · horizontal_pull 4 · trunk_stability 4 · elbow_flexion 3 · hip_hinge 3 · horizontal_press 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 15/33
- max estimatedDurationMinutes: 29
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fat|5d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 9 · Shoulders 24 · Arms 15 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · lateral_deltoids 9.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · traps 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · traps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 10 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 33/51
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `fat|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 33 · Shoulders 18 · Arms 26 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 16.0 · lats 13.5 · biceps 13.0 · anterior_deltoids 12.0 · rhomboids 12.0 · glutes 9.0 · hamstrings 6.0 · lateral_deltoids 6.0 · middle_traps 6.0 · pectorals 6.0 · quadriceps 6.0 · rear_deltoids 6.0 · serratus_anterior 4.5 · core 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · upper_traps 3.0 · brachialis 2.0 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: horizontal_press 6 · horizontal_pull 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 4 · elbow_flexion 4 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 41/45
- max estimatedDurationMinutes: 31

### `fat|6d|full gym|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 45
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Push B:dumbbell_flyes@horizontal_press:tier3

### `fat|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 10 · Shoulders 28 · Arms 20 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 16.0 · anterior_deltoids 12.0 · glutes 9.0 · core 7.0 · lateral_deltoids 6.0 · pectorals 6.0 · quadriceps 6.0 · shoulders 6.0 · traps 6.0 · biceps 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · transverse_abdominis 4.0 · cardiovascular 3.0 · hamstrings 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · brachialis 2.0 · middle_traps 2.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · transverse_abdominis 2 · traps 2 · triceps 2 · hamstrings 1
- sets/movement-pattern: horizontal_press 6 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · elbow_extension 4 · elbow_flexion 4 · horizontal_pull 4 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 19/43
- max estimatedDurationMinutes: 31
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fat|6d|home dumbbells|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 7 · Back 9 · Shoulders 21 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 11.0 · lateral_deltoids 9.0 · calves 8.5 · hamstrings 8.5 · anterior_deltoids 8.0 · pectorals 7.0 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · triceps 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · traps 3.0 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · anterior_deltoids 1 · traps 1 · triceps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 7 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 30/48
- max estimatedDurationMinutes: 32
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Legs A (Squat):lunges@knee_dominant:tier3; Push B:dumbbell_flyes@horizontal_press:tier3; Legs B (Deadlift):lunges@knee_dominant:tier3

### `fitter|2d|full gym|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 22 · Shoulders 6 · Arms 10 · Legs 16 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 9.0 · lats 8.0 · rhomboids 8.0 · biceps 6.0 · hamstrings 6.0 · anterior_deltoids 4.0 · core 4.0 · middle_traps 4.0 · quadriceps 4.0 · rear_deltoids 4.0 · triceps 4.0 · erector_spinae 2.0 · forearms 2.0 · lateral_deltoids 2.0 · pectorals 2.0 · transverse_abdominis 2.0 · traps 2.0 · quads 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · hamstrings 2 · lats 2 · middle_traps 2 · quadriceps 2 · rhomboids 2 · triceps 2 · forearms 1 · lateral_deltoids 1 · pectorals 1 · transverse_abdominis 1 · traps 1
- sets/movement-pattern: hip_hinge 4 · horizontal_pull 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2 · vertical_press 2
- sets in seed / total: 22/24
- max estimatedDurationMinutes: 55

### `fitter|2d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 3 · Back 10 · Shoulders 11 · Arms 11 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 7.0 · glutes 6.0 · biceps 5.0 · lateral_deltoids 5.0 · anterior_deltoids 4.5 · erector_spinae 4.5 · hamstrings 4.5 · lats 4.0 · pectorals 3.0 · quadriceps 3.0 · rhomboids 3.0 · rear_deltoids 2.5 · calves 2.0 · middle_traps 2.0 · serratus_anterior 2.0 · brachialis 1.5 · traps 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: elbow_extension 3 · elbow_flexion 3 · hip_hinge 3 · horizontal_press 3 · knee_dominant 3 · shoulder_isolation 3 · horizontal_pull 2 · vertical_press 2 · vertical_pull 1
- sets in seed / total: 21/23
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `fitter|2d|home dumbbells|once`

- templates: Full Body A[full_body] / Full Body B[full_body]
- week1==week4: true
- UI line: Chest 2 · Back 10 · Shoulders 14 · Arms 6 · Legs 16 · Core 6
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 9.0 · core 6.0 · traps 6.0 · anterior_deltoids 4.0 · hamstrings 4.0 · quadriceps 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · shoulders 4.0 · triceps 4.0 · cardiovascular 2.0 · erector_spinae 2.0 · forearms 2.0 · lateral_deltoids 2.0 · middle_traps 2.0 · pectorals 2.0 · transverse_abdominis 2.0 · quads 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · hamstrings 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · traps 2 · triceps 2 · forearms 1 · lateral_deltoids 1 · pectorals 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 4 · horizontal_pull 4 · knee_dominant 4 · vertical_pull 4 · carry 2 · horizontal_press 2 · trunk_stability 2 · vertical_press 2
- sets in seed / total: 10/24
- max estimatedDurationMinutes: 52
- isolation-in-compound: Full Body A:shrugs@vertical_pull:tier3; Full Body B:shrugs@vertical_pull:tier3

### `fitter|2d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 3 · Shoulders 9 · Arms 7 · Legs 6
- fractional sets/muscle (1 primary / 0.5 secondary): lateral_deltoids 5.0 · anterior_deltoids 4.5 · triceps 4.0 · biceps 3.0 · glutes 3.0 · pectorals 3.0 · hamstrings 2.5 · brachialis 1.5 · erector_spinae 1.0 · quadriceps 1.0 · serratus_anterior 1.0 · upper_traps 1.0 · calves 0.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: elbow_flexion 3 · horizontal_press 3 · shoulder_isolation 3 · hip_hinge 2 · vertical_press 2 · knee_dominant 1
- sets in seed / total: 12/14
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `fitter|3d|full gym|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 2 · Back 6 · Shoulders 6 · Arms 8 · Legs 8 · Core 10
- fractional sets/muscle (1 primary / 0.5 secondary): core 6.0 · glutes 5.0 · anterior_deltoids 4.0 · transverse_abdominis 4.0 · triceps 4.0 · hamstrings 3.0 · biceps 2.0 · cardiovascular 2.0 · forearms 2.0 · full_body 2.0 · lateral_deltoids 2.0 · lats 2.0 · pectorals 2.0 · quadriceps 2.0 · rhomboids 2.0 · serratus_anterior 2.0 · traps 2.0 · erector_spinae 1.0 · quads 1.0 · rear_deltoids 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · cardiovascular 1 · forearms 1 · full_body 1 · hamstrings 1 · lateral_deltoids 1 · lats 1 · pectorals 1 · quadriceps 1 · rhomboids 1 · traps 1
- sets/movement-pattern: trunk_stability 4 · carry 2 · conditioning 2 · hip_hinge 2 · horizontal_press 2 · knee_dominant 2 · vertical_press 2 · vertical_pull 2
- sets in seed / total: 12/18
- max estimatedDurationMinutes: 34

### `fitter|3d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 17 · Shoulders 16 · Arms 15 · Legs 23
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · rhomboids 8.0 · hamstrings 7.5 · biceps 7.0 · anterior_deltoids 6.5 · erector_spinae 6.5 · rear_deltoids 6.5 · calves 6.0 · lats 6.0 · lateral_deltoids 5.0 · pectorals 5.0 · quadriceps 5.0 · middle_traps 4.5 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · biceps 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · middle_traps 1
- sets/movement-pattern: knee_dominant 8 · shoulder_isolation 6 · hip_hinge 5 · horizontal_press 5 · horizontal_pull 5 · elbow_extension 3 · elbow_flexion 3 · vertical_pull 3 · vertical_press 2
- sets in seed / total: 35/37
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `fitter|3d|home dumbbells|once`

- templates: Full Body Strength[full_body] / Full Body Power[full_body] / Conditioning[conditioning]
- week1==week4: true
- UI line: Chest 2 · Back 4 · Shoulders 8 · Arms 6 · Legs 8 · Core 10
- fractional sets/muscle (1 primary / 0.5 secondary): core 7.0 · glutes 5.0 · anterior_deltoids 4.0 · transverse_abdominis 4.0 · traps 4.0 · triceps 4.0 · cardiovascular 3.0 · forearms 2.0 · full_body 2.0 · hamstrings 2.0 · lateral_deltoids 2.0 · pectorals 2.0 · quadriceps 2.0 · shoulders 2.0 · erector_spinae 1.0 · quads 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · transverse_abdominis 2 · traps 2 · triceps 2 · cardiovascular 1 · forearms 1 · full_body 1 · hamstrings 1 · lateral_deltoids 1 · pectorals 1 · quadriceps 1 · shoulders 1
- sets/movement-pattern: trunk_stability 4 · carry 2 · conditioning 2 · hip_hinge 2 · horizontal_press 2 · knee_dominant 2 · vertical_press 2 · vertical_pull 2
- sets in seed / total: 8/18
- max estimatedDurationMinutes: 34
- isolation-in-compound: Full Body Strength:shrugs@vertical_pull:tier3

### `fitter|3d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 3 · Shoulders 14 · Arms 9 · Legs 13
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 6.5 · triceps 6.0 · glutes 5.0 · lateral_deltoids 5.0 · pectorals 5.0 · hamstrings 4.5 · calves 3.5 · biceps 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · brachialis 1.5 · middle_traps 1.5 · quadriceps 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · triceps 2 · biceps 1 · calves 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: shoulder_isolation 6 · horizontal_press 5 · hip_hinge 4 · knee_dominant 4 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 2
- sets in seed / total: 19/24
- max estimatedDurationMinutes: 37
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `fitter|4d|full gym|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 12 · Shoulders 6 · Arms 9 · Legs 16 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 8.0 · hamstrings 6.0 · biceps 5.0 · lats 5.0 · triceps 5.0 · anterior_deltoids 4.0 · quadriceps 4.0 · rhomboids 4.0 · erector_spinae 3.0 · core 2.0 · lateral_deltoids 2.0 · middle_traps 2.0 · pectorals 2.0 · rear_deltoids 2.0 · serratus_anterior 2.0 · transverse_abdominis 2.0 · brachialis 1.0 · calves 1.0 · traps 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · glutes 2 · hamstrings 2 · lats 2 · quadriceps 2 · rhomboids 2 · triceps 2 · core 1 · erector_spinae 1 · lateral_deltoids 1 · middle_traps 1 · pectorals 1 · transverse_abdominis 1
- sets/movement-pattern: hip_hinge 4 · knee_dominant 4 · elbow_flexion 2 · horizontal_press 2 · horizontal_pull 2 · trunk_stability 2 · vertical_press 2 · vertical_pull 2 · elbow_extension 1
- sets in seed / total: 19/21
- max estimatedDurationMinutes: 31

### `fitter|4d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 6 · Back 20 · Shoulders 17 · Arms 18 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 12.0 · glutes 11.0 · rhomboids 9.0 · calves 8.0 · hamstrings 8.0 · biceps 7.5 · rear_deltoids 7.5 · anterior_deltoids 7.0 · lats 7.0 · erector_spinae 6.0 · pectorals 6.0 · quadriceps 6.0 · middle_traps 5.5 · lateral_deltoids 5.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · erector_spinae 1
- sets/movement-pattern: knee_dominant 12 · elbow_extension 6 · horizontal_press 6 · horizontal_pull 6 · shoulder_isolation 6 · hip_hinge 5 · elbow_flexion 3 · vertical_pull 3 · vertical_press 2
- sets in seed / total: 41/46
- max estimatedDurationMinutes: 51
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3

### `fitter|4d|home dumbbells|once`

- templates: Upper Strength[upper] / Lower Power[lower] / Upper Hypertrophy[upper] / Lower Strength[lower]
- week1==week4: true
- UI line: Chest 2 · Back 4 · Shoulders 12 · Arms 7 · Legs 16 · Core 4
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 8.0 · triceps 5.0 · anterior_deltoids 4.0 · core 4.0 · hamstrings 4.0 · quadriceps 4.0 · shoulders 4.0 · biceps 2.0 · cardiovascular 2.0 · erector_spinae 2.0 · lateral_deltoids 2.0 · pectorals 2.0 · rear_deltoids 2.0 · rhomboids 2.0 · transverse_abdominis 2.0 · traps 2.0 · brachialis 1.0 · middle_traps 1.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · hamstrings 2 · quadriceps 2 · shoulders 2 · triceps 2 · biceps 1 · core 1 · lateral_deltoids 1 · pectorals 1 · rear_deltoids 1 · rhomboids 1 · transverse_abdominis 1 · traps 1
- sets/movement-pattern: hip_hinge 4 · knee_dominant 4 · elbow_flexion 2 · horizontal_press 2 · horizontal_pull 2 · trunk_stability 2 · vertical_press 2 · vertical_pull 2 · elbow_extension 1
- sets in seed / total: 10/21
- max estimatedDurationMinutes: 31
- isolation-in-compound: Upper Strength:shrugs@vertical_pull:tier3

### `fitter|4d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 6 · Back 3 · Shoulders 14 · Arms 9 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): calves 7.5 · anterior_deltoids 7.0 · glutes 7.0 · pectorals 6.0 · triceps 6.0 · hamstrings 5.5 · lateral_deltoids 5.0 · biceps 3.0 · quadriceps 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · triceps 2 · biceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: knee_dominant 9 · horizontal_press 6 · shoulder_isolation 6 · hip_hinge 4 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 2
- sets in seed / total: 22/30
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `fitter|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 2 · Back 18 · Shoulders 10 · Arms 12 · Legs 8 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 8.0 · lats 7.0 · anterior_deltoids 6.0 · biceps 6.0 · rhomboids 6.0 · core 4.0 · glutes 4.0 · lateral_deltoids 4.0 · middle_traps 4.0 · transverse_abdominis 4.0 · hamstrings 3.0 · rear_deltoids 3.0 · erector_spinae 2.0 · pectorals 2.0 · quadriceps 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · brachialis 1.0 · calves 1.0 · traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_pull 4 · trunk_stability 4 · vertical_press 4 · elbow_extension 2 · elbow_flexion 2 · hip_hinge 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 20/24
- max estimatedDurationMinutes: 29

### `fitter|5d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 6 · Back 26 · Shoulders 23 · Arms 21 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): rhomboids 12.0 · triceps 12.0 · glutes 11.0 · biceps 10.5 · rear_deltoids 10.5 · calves 8.0 · hamstrings 8.0 · lateral_deltoids 8.0 · anterior_deltoids 7.0 · lats 7.0 · middle_traps 7.0 · erector_spinae 6.0 · pectorals 6.0 · quadriceps 6.0 · traps 4.0 · brachialis 3.0 · serratus_anterior 3.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): rear_deltoids 3 · rhomboids 3 · triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 12 · shoulder_isolation 12 · horizontal_pull 9 · elbow_extension 6 · elbow_flexion 6 · horizontal_press 6 · vertical_pull 6 · hip_hinge 5 · vertical_press 2
- sets in seed / total: 50/58
- max estimatedDurationMinutes: 48
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3

### `fitter|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 2 · Back 6 · Shoulders 16 · Arms 10 · Legs 8 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 8.0 · anterior_deltoids 6.0 · core 5.0 · glutes 4.0 · lateral_deltoids 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · transverse_abdominis 4.0 · biceps 2.0 · hamstrings 2.0 · middle_traps 2.0 · pectorals 2.0 · quadriceps 2.0 · shoulders 2.0 · traps 2.0 · upper_traps 2.0 · brachialis 1.0 · cardiovascular 1.0 · erector_spinae 1.0 · serratus_anterior 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: horizontal_pull 4 · trunk_stability 4 · vertical_press 4 · elbow_extension 2 · elbow_flexion 2 · hip_hinge 2 · horizontal_press 2 · knee_dominant 2 · vertical_pull 2
- sets in seed / total: 10/24
- max estimatedDurationMinutes: 29
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `fitter|5d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 6 · Back 9 · Shoulders 20 · Arms 12 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): lateral_deltoids 8.0 · calves 7.5 · anterior_deltoids 7.0 · glutes 7.0 · biceps 6.0 · pectorals 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · triceps 6.0 · hamstrings 5.5 · brachialis 3.0 · middle_traps 3.0 · quadriceps 3.0 · traps 3.0 · erector_spinae 2.0 · serratus_anterior 2.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · traps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 9 · elbow_flexion 6 · horizontal_press 6 · horizontal_pull 6 · hip_hinge 4 · vertical_pull 3 · vertical_press 2
- sets in seed / total: 28/42
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `fitter|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 22 · Shoulders 12 · Arms 18 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): biceps 10.0 · triceps 10.0 · lats 9.0 · anterior_deltoids 8.0 · rhomboids 8.0 · glutes 6.0 · core 4.0 · hamstrings 4.0 · lateral_deltoids 4.0 · middle_traps 4.0 · pectorals 4.0 · quadriceps 4.0 · rear_deltoids 4.0 · transverse_abdominis 4.0 · serratus_anterior 3.0 · brachialis 2.0 · erector_spinae 2.0 · upper_traps 2.0 · calves 1.0 · traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_flexion 4 · horizontal_press 4 · horizontal_pull 4 · knee_dominant 4 · trunk_stability 4 · vertical_press 4 · vertical_pull 4 · elbow_extension 2 · hip_hinge 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 31

### `fitter|6d|full gym|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 6 · Back 26 · Shoulders 23 · Arms 21 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): rhomboids 12.0 · triceps 12.0 · glutes 11.0 · biceps 10.5 · rear_deltoids 10.5 · calves 8.0 · hamstrings 8.0 · lateral_deltoids 8.0 · anterior_deltoids 7.0 · lats 7.0 · middle_traps 7.0 · erector_spinae 6.0 · pectorals 6.0 · quadriceps 6.0 · traps 4.0 · brachialis 3.0 · serratus_anterior 3.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 12 · shoulder_isolation 12 · horizontal_pull 9 · elbow_extension 6 · elbow_flexion 6 · horizontal_press 6 · vertical_pull 6 · hip_hinge 5 · vertical_press 2
- sets in seed / total: 50/58
- max estimatedDurationMinutes: 45
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Push B:dumbbell_flyes@horizontal_press:tier3

### `fitter|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 8 · Shoulders 20 · Arms 14 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 10.0 · anterior_deltoids 8.0 · core 6.0 · glutes 6.0 · biceps 4.0 · lateral_deltoids 4.0 · pectorals 4.0 · quadriceps 4.0 · rear_deltoids 4.0 · rhomboids 4.0 · shoulders 4.0 · transverse_abdominis 4.0 · traps 4.0 · brachialis 2.0 · cardiovascular 2.0 · hamstrings 2.0 · middle_traps 2.0 · serratus_anterior 2.0 · upper_traps 2.0 · erector_spinae 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · transverse_abdominis 2 · traps 2 · triceps 2 · hamstrings 1
- sets/movement-pattern: elbow_flexion 4 · horizontal_press 4 · horizontal_pull 4 · knee_dominant 4 · trunk_stability 4 · vertical_press 4 · vertical_pull 4 · elbow_extension 2 · hip_hinge 2
- sets in seed / total: 14/32
- max estimatedDurationMinutes: 31
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `fitter|6d|home dumbbells|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 4 · Back 9 · Shoulders 18 · Arms 10 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): lateral_deltoids 8.0 · calves 7.5 · glutes 7.0 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · hamstrings 5.5 · anterior_deltoids 5.0 · pectorals 4.0 · triceps 4.0 · brachialis 3.0 · middle_traps 3.0 · quadriceps 3.0 · traps 3.0 · erector_spinae 2.0 · serratus_anterior 1.0 · upper_traps 1.0
- frequency (sessions containing primary muscle): biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · anterior_deltoids 1 · traps 1 · triceps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 9 · elbow_flexion 6 · horizontal_pull 6 · hip_hinge 4 · horizontal_press 4 · vertical_pull 3 · vertical_press 2
- sets in seed / total: 26/40
- max estimatedDurationMinutes: 32
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Legs A (Squat):lunges@knee_dominant:tier3; Push B:dumbbell_flyes@horizontal_press:tier3; Legs B (Deadlift):lunges@knee_dominant:tier3

### `blend|2d|full gym|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 16 · Shoulders 15 · Arms 14 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · hamstrings 7.5 · anterior_deltoids 7.0 · erector_spinae 7.0 · biceps 6.5 · lats 6.5 · lateral_deltoids 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.0 · calves 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · elbow_extension 3 · elbow_flexion 3 · horizontal_pull 3 · shoulder_isolation 3 · vertical_press 3 · vertical_pull 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `blend|2d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Back 16 · Shoulders 15 · Arms 14 · Legs 20
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 10.0 · triceps 9.0 · hamstrings 7.5 · anterior_deltoids 7.0 · erector_spinae 7.0 · biceps 6.5 · lats 6.5 · lateral_deltoids 6.0 · pectorals 5.0 · quadriceps 5.0 · rhomboids 5.0 · rear_deltoids 4.0 · calves 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: hip_hinge 5 · horizontal_press 5 · knee_dominant 5 · elbow_extension 3 · elbow_flexion 3 · horizontal_pull 3 · shoulder_isolation 3 · vertical_press 3 · vertical_pull 2
- sets in seed / total: 28/32
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `blend|2d|home dumbbells|once`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 12 · Arms 9 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 7.0 · lateral_deltoids 6.0 · triceps 6.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.0 · biceps 3.0 · quadriceps 2.0 · brachialis 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · calves 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · elbow_flexion 3 · hip_hinge 3 · shoulder_isolation 3 · vertical_press 3 · knee_dominant 2
- sets in seed / total: 15/19
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `blend|2d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Press)[full_body]
- week1==week4: true
- UI line: Chest 5 · Shoulders 12 · Arms 9 · Legs 10
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 7.0 · lateral_deltoids 6.0 · triceps 6.0 · glutes 5.0 · pectorals 5.0 · hamstrings 4.0 · biceps 3.0 · quadriceps 2.0 · brachialis 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5 · calves 1.0
- frequency (sessions containing primary muscle): anterior_deltoids 2 · glutes 2 · lateral_deltoids 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: horizontal_press 5 · elbow_flexion 3 · hip_hinge 3 · shoulder_isolation 3 · vertical_press 3 · knee_dominant 2
- sets in seed / total: 15/19
- max estimatedDurationMinutes: 32
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `blend|3d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 21 · Shoulders 9 · Arms 19 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · biceps 10.5 · anterior_deltoids 8.5 · lats 8.0 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · middle_traps 5.0 · hamstrings 4.5 · rear_deltoids 4.0 · lateral_deltoids 3.0 · quadriceps 3.0 · brachialis 2.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · lats 1 · middle_traps 1 · pectorals 1 · quadriceps 1 · rhomboids 1 · triceps 1
- sets/movement-pattern: horizontal_press 8 · elbow_extension 5 · elbow_flexion 5 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 30/35
- max estimatedDurationMinutes: 32

### `blend|3d|full gym|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 25 · Shoulders 21 · Arms 20 · Legs 35
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 16.0 · hamstrings 12.0 · triceps 12.0 · rhomboids 11.0 · anterior_deltoids 10.0 · erector_spinae 10.0 · biceps 9.5 · lats 9.5 · rear_deltoids 8.5 · pectorals 8.0 · quadriceps 8.0 · calves 7.5 · lateral_deltoids 6.0 · middle_traps 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · biceps 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · calves 1 · erector_spinae 1 · middle_traps 1
- sets/movement-pattern: knee_dominant 11 · hip_hinge 8 · horizontal_press 8 · horizontal_pull 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_extension 3 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 46/50
- max estimatedDurationMinutes: 53
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3

### `blend|3d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 8 · Shoulders 17 · Arms 16 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 11.0 · anterior_deltoids 8.5 · pectorals 8.0 · glutes 6.0 · biceps 5.0 · rear_deltoids 5.0 · rhomboids 5.0 · hamstrings 3.0 · lateral_deltoids 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · brachialis 2.5 · middle_traps 2.5 · cardiovascular 1.5 · core 1.5 · erector_spinae 1.5 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 1 · biceps 1 · glutes 1 · hamstrings 1 · lateral_deltoids 1 · pectorals 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1 · shoulders 1 · traps 1 · triceps 1
- sets/movement-pattern: horizontal_press 8 · elbow_extension 5 · elbow_flexion 5 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 14/35
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `blend|3d|home dumbbells|twice`

- templates: Full Body (Squat/Bench)[full_body] / Full Body (Hinge/Shoulders)[full_body] / Full Body (Squat/Chest)[full_body]
- week1==week4: true
- UI line: Chest 8 · Back 3 · Shoulders 18 · Arms 12 · Legs 19
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 10.0 · triceps 9.0 · glutes 8.0 · pectorals 8.0 · hamstrings 7.0 · lateral_deltoids 6.0 · calves 4.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · quadriceps 2.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): glutes 3 · anterior_deltoids 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · triceps 2 · biceps 1 · calves 1 · quadriceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: horizontal_press 8 · hip_hinge 6 · shoulder_isolation 6 · knee_dominant 5 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 24/31
- max estimatedDurationMinutes: 37
- isolation-in-compound: Full Body (Squat/Bench):dumbbell_flyes@horizontal_press:tier3; Full Body (Squat/Bench):lunges@knee_dominant:tier3

### `blend|4d|full gym|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 21 · Shoulders 15 · Arms 32 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · biceps 15.5 · anterior_deltoids 11.5 · lats 8.0 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · lateral_deltoids 6.0 · brachialis 5.0 · middle_traps 5.0 · hamstrings 4.5 · rear_deltoids 4.0 · quadriceps 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 8 · vertical_press 6 · horizontal_pull 5 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 43/48
- max estimatedDurationMinutes: 32

### `blend|4d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 31 · Shoulders 23 · Arms 23 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · triceps 15.0 · hamstrings 13.0 · rhomboids 13.0 · lats 11.5 · anterior_deltoids 11.0 · biceps 10.5 · rear_deltoids 10.5 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · calves 9.0 · middle_traps 8.0 · lateral_deltoids 6.0 · serratus_anterior 4.5 · brachialis 1.5 · traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · erector_spinae 1
- sets/movement-pattern: knee_dominant 16 · horizontal_press 10 · hip_hinge 8 · horizontal_pull 8 · elbow_extension 6 · shoulder_isolation 6 · vertical_pull 5 · elbow_flexion 3 · vertical_press 3
- sets in seed / total: 53/62
- max estimatedDurationMinutes: 51
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3

### `blend|4d|home dumbbells|once`

- templates: Push (Chest/Shoulders/Triceps)[push] / Pull (Back/Biceps)[pull] / Legs (Quads/Hamstrings/Glutes)[legs] / Upper (Arms Focus)[upper]
- week1==week4: true
- UI line: Chest 8 · Back 13 · Shoulders 28 · Arms 29 · Legs 12
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · biceps 10.0 · rear_deltoids 10.0 · rhomboids 10.0 · pectorals 8.0 · glutes 6.0 · lateral_deltoids 6.0 · brachialis 5.0 · middle_traps 5.0 · hamstrings 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · upper_traps 3.0 · cardiovascular 1.5 · core 1.5 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · glutes 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_pull 10 · horizontal_press 8 · vertical_press 6 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 22/53
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back/Biceps):shrugs@vertical_pull:tier3

### `blend|4d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Upper (Shoulders/Back)[upper] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 3 · Shoulders 18 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · lateral_deltoids 6.0 · quadriceps 5.0 · biceps 3.0 · erector_spinae 3.0 · rear_deltoids 3.0 · rhomboids 3.0 · serratus_anterior 3.0 · brachialis 1.5 · middle_traps 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · triceps 2 · biceps 1 · rear_deltoids 1 · rhomboids 1
- sets/movement-pattern: knee_dominant 11 · horizontal_press 10 · hip_hinge 6 · shoulder_isolation 6 · elbow_flexion 3 · horizontal_pull 3 · vertical_press 3
- sets in seed / total: 27/39
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Upper (Shoulders/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `blend|5d|full gym|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 24 · Shoulders 15 · Arms 27 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · biceps 10.5 · lats 9.5 · pectorals 8.0 · rhomboids 8.0 · glutes 6.0 · lateral_deltoids 6.0 · middle_traps 5.0 · hamstrings 4.5 · core 4.0 · rear_deltoids 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · quadriceps 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · brachialis 2.5 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · erector_spinae 1 · hamstrings 1 · pectorals 1 · quadriceps 1
- sets/movement-pattern: elbow_extension 10 · horizontal_press 8 · vertical_press 6 · elbow_flexion 5 · horizontal_pull 5 · trunk_stability 4 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 38/47
- max estimatedDurationMinutes: 32

### `blend|5d|full gym|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): rear_deltoids 3 · rhomboids 3 · triceps 3 · anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 48
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3

### `blend|5d|home dumbbells|once`

- templates: Push (Chest Focus)[push] / Pull (Back Focus)[pull] / Legs (Quad Focus)[legs] / Upper (Shoulders/Arms)[upper] / Legs (Posterior Chain)[legs]
- week1==week4: true
- UI line: Chest 8 · Back 13 · Shoulders 28 · Arms 24 · Legs 12 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 19.0 · anterior_deltoids 11.5 · rear_deltoids 10.0 · rhomboids 10.0 · pectorals 8.0 · glutes 6.0 · lateral_deltoids 6.0 · core 5.5 · biceps 5.0 · middle_traps 5.0 · transverse_abdominis 4.0 · hamstrings 3.0 · quadriceps 3.0 · shoulders 3.0 · traps 3.0 · upper_traps 3.0 · brachialis 2.5 · cardiovascular 1.5 · erector_spinae 1.5 · serratus_anterior 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · core 2 · glutes 2 · lateral_deltoids 2 · rear_deltoids 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · biceps 1 · hamstrings 1 · pectorals 1 · quadriceps 1 · shoulders 1 · traps 1
- sets/movement-pattern: elbow_extension 10 · horizontal_pull 10 · horizontal_press 8 · vertical_press 6 · elbow_flexion 5 · trunk_stability 4 · hip_hinge 3 · knee_dominant 3 · vertical_pull 3
- sets in seed / total: 17/52
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull (Back Focus):shrugs@vertical_pull:tier3

### `blend|5d|home dumbbells|twice`

- templates: Upper (Chest/Back)[upper] / Lower (Squat)[lower] / Push (Chest/Shoulders)[push] / Pull (Back/Arms)[pull] / Lower (Deadlift)[lower]
- week1==week4: true
- UI line: Chest 10 · Back 9 · Shoulders 24 · Arms 15 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): anterior_deltoids 11.0 · glutes 11.0 · pectorals 10.0 · lateral_deltoids 9.0 · triceps 9.0 · calves 8.5 · hamstrings 8.5 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · serratus_anterior 3.0 · traps 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · traps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 10 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 33/51
- max estimatedDurationMinutes: 35
- isolation-in-compound: Upper (Chest/Back):dumbbell_flyes@horizontal_press:tier3; Lower (Squat):lunges@knee_dominant:tier3; Push (Chest/Shoulders):dumbbell_flyes@horizontal_press:tier3; Pull (Back/Arms):shrugs@vertical_pull:tier3; Lower (Deadlift):lunges@knee_dominant:tier3

### `blend|6d|full gym|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 30 · Shoulders 18 · Arms 38 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 22.0 · biceps 18.5 · anterior_deltoids 14.0 · lats 12.5 · rhomboids 11.0 · pectorals 10.0 · glutes 9.0 · hamstrings 6.0 · lateral_deltoids 6.0 · quadriceps 6.0 · rear_deltoids 5.5 · brachialis 5.0 · middle_traps 5.0 · serratus_anterior 4.5 · core 4.0 · transverse_abdominis 4.0 · erector_spinae 3.0 · upper_traps 3.0 · calves 1.5 · traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rhomboids 2 · transverse_abdominis 2 · triceps 2 · erector_spinae 1 · hamstrings 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 10 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · horizontal_pull 5 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 52/60
- max estimatedDurationMinutes: 32

### `blend|6d|full gym|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 37 · Shoulders 29 · Arms 26 · Legs 42
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 18.0 · rhomboids 16.0 · triceps 15.0 · biceps 13.5 · rear_deltoids 13.5 · hamstrings 13.0 · lats 11.5 · anterior_deltoids 11.0 · pectorals 10.0 · quadriceps 10.0 · erector_spinae 9.5 · middle_traps 9.5 · calves 9.0 · lateral_deltoids 9.0 · serratus_anterior 4.5 · traps 4.5 · brachialis 3.0 · upper_traps 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · lats 2 · middle_traps 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · triceps 2 · erector_spinae 1 · traps 1
- sets/movement-pattern: knee_dominant 16 · shoulder_isolation 12 · horizontal_pull 11 · horizontal_press 10 · hip_hinge 8 · vertical_pull 8 · elbow_extension 6 · elbow_flexion 6 · vertical_press 3
- sets in seed / total: 62/74
- max estimatedDurationMinutes: 45
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Push B:dumbbell_flyes@horizontal_press:tier3

### `blend|6d|home dumbbells|once`

- templates: Push A (Strength)[push] / Pull A (Strength)[pull] / Legs A (Quad Focus)[legs] / Push B (Hypertrophy)[push] / Pull B (Hypertrophy)[pull] / Legs B (Posterior)[legs]
- week1==week4: true
- UI line: Chest 10 · Back 16 · Shoulders 34 · Arms 32 · Legs 18 · Core 8
- fractional sets/muscle (1 primary / 0.5 secondary): triceps 22.0 · anterior_deltoids 14.0 · biceps 10.0 · pectorals 10.0 · rear_deltoids 10.0 · rhomboids 10.0 · glutes 9.0 · core 7.0 · lateral_deltoids 6.0 · quadriceps 6.0 · shoulders 6.0 · traps 6.0 · brachialis 5.0 · middle_traps 5.0 · transverse_abdominis 4.0 · cardiovascular 3.0 · hamstrings 3.0 · serratus_anterior 3.0 · upper_traps 3.0 · erector_spinae 1.5
- frequency (sessions containing primary muscle): anterior_deltoids 2 · biceps 2 · core 2 · glutes 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · shoulders 2 · transverse_abdominis 2 · traps 2 · triceps 2 · hamstrings 1
- sets/movement-pattern: elbow_extension 10 · elbow_flexion 10 · horizontal_press 10 · horizontal_pull 10 · knee_dominant 6 · vertical_press 6 · vertical_pull 6 · trunk_stability 4 · hip_hinge 3
- sets in seed / total: 25/65
- max estimatedDurationMinutes: 32
- isolation-in-compound: Pull A (Strength):shrugs@vertical_pull:tier3; Pull B (Hypertrophy):shrugs@vertical_pull:tier3

### `blend|6d|home dumbbells|twice`

- templates: Push A[push] / Pull A[pull] / Legs A (Squat)[legs] / Push B[push] / Pull B[pull] / Legs B (Deadlift)[legs]
- week1==week4: true
- UI line: Chest 7 · Back 9 · Shoulders 21 · Arms 12 · Legs 28
- fractional sets/muscle (1 primary / 0.5 secondary): glutes 11.0 · lateral_deltoids 9.0 · calves 8.5 · hamstrings 8.5 · anterior_deltoids 8.0 · pectorals 7.0 · biceps 6.0 · rear_deltoids 6.0 · rhomboids 6.0 · triceps 6.0 · quadriceps 5.0 · brachialis 3.0 · erector_spinae 3.0 · middle_traps 3.0 · traps 3.0 · serratus_anterior 1.5 · upper_traps 1.5
- frequency (sessions containing primary muscle): biceps 2 · calves 2 · glutes 2 · hamstrings 2 · lateral_deltoids 2 · pectorals 2 · quadriceps 2 · rear_deltoids 2 · rhomboids 2 · anterior_deltoids 1 · traps 1 · triceps 1
- sets/movement-pattern: shoulder_isolation 12 · knee_dominant 11 · horizontal_press 7 · elbow_flexion 6 · hip_hinge 6 · horizontal_pull 6 · vertical_press 3 · vertical_pull 3
- sets in seed / total: 30/48
- max estimatedDurationMinutes: 32
- isolation-in-compound: Push A:dumbbell_flyes@horizontal_press:tier3; Pull A:shrugs@vertical_pull:tier3; Legs A (Squat):lunges@knee_dominant:tier3; Push B:dumbbell_flyes@horizontal_press:tier3; Legs B (Deadlift):lunges@knee_dominant:tier3

## Empty-history loads per experience (barbell_bench_press @ 8 reps)

- beginner: **20 kg**
- intermediate: **60 kg**
- advanced: **100 kg**
- intermediate + explicit 1RM 100 kg via Epley: **80 kg** (formula rounded 80)

## Reactive double progression (synthetic history)

- decideDoubleProgression on 3×8 @ 60 kg range 6–8: action **increase**, next **62.5** (+2.5kg — you hit 3×8 last time.)
- muscle|3d|full gym|once barbell_bench_press empty vs history: 20 → 60

## scoreExercise vs goals

- chooseExercise(horizontal_press) muscle vs strength ranking identical: **true**
- muscle top5: barbell_bench_press, dumbbell_bench_press, close_grip_bench_press, push_ups, dumbbell_flyes
- strength top5: barbell_bench_press, dumbbell_bench_press, close_grip_bench_press, push_ups, dumbbell_flyes
