# Android stop finding: baseline setup cannot enter 7 reps

2026-11-01, branch fix/training-confident-ux, documentation HEAD fa7b55f. Same installed working-weight release from bd69229; installation and matching installed APK SHA-256 remain as recorded in installation.json. No reinstall or provenance change during this continuation.

Operator confirmed current inputs: Advanced; Bench press 105 kg x 8; Squat 100 kg x 5; Deadlift 100 kg x 5; Overhead press 90 kg x 7. Preserve Strength, Monday-Friday, goals 40/40/10/10.

Observed actual setup: Strength; goals Build Muscle40 / Build Strength40 / Lose Fat10 / Get Fitter10. Schedule all Mon-Fri selected, Sat/Sun unselected. Equipment retained. Constraints screen initially Intermediate; selected Advanced (captured check mark), leaving constraints and skill work unchanged. Advanced selection is unsaved draft state only.

**STOP FINDING:** Strength Baselines offers exactly three rep chips, 3 / 5 / 8, for each lift. There is no custom rep input. Overhead press 90 kg x 7 cannot be faithfully entered via setup. Actual baseline-screen pixels inspected; accessibility text agrees. Read-only source corroboration: app/src/screens/training/TrainingSetupScreen.tsx, BASELINE_EXERCISES renderer maps `[3, 5, 8]` into Chips; adjacent TextInput is for weight only. No code edited and no substitute rep count chosen. Resolving faithful 7-rep entry in this UI requires a code change, outside the authorized verification task.

Stopped immediately before weight entry and before Save, in accordance with operator instruction. App remains on the baselines screen with Advanced in the unsaved draft. All five visible baseline weight fields were blank; no new stored baseline values asserted or written. No stored-value readback is claimed. No direct DB mutation or alternate write path used.

Five-day exercise/set/ceiling/working-weight/warning inventory, new-build review status, Session Preview, leg-press explanation, frozen session, notification/FGS, one-set persistence and Cancel & delete verification remain NOT RUN for these confirmed inputs. No session or set created; no cleanup required. Existing pre-save review screenshot is not acceptance of a new build. No source changes, migrations or EIF acceptance/completion. Runtime evidence only; no source harness rerun.

Evidence: setup-goals-next.png (Mon-Fri schedule), setup-advanced.png (selected Advanced), setup-baselines-before.png (blank weights and 3/5/8 chips). Equipment and original Intermediate screenshots are included as scoped setup context; the original Intermediate selection was changed only in the draft. Wrapper queue result is recorded below after execution. This is a blocked-input finding report, not approval or full journey completion.

Public wrapper lease, await-approval and automatic release succeeded under R20261101RELEASEVERIFY at16:51 UTC. All six scoped screenshots were hashed by the wrapper; no approval/accept/complete event. Existing N-0070 queue section is supplemented with a scope note.
