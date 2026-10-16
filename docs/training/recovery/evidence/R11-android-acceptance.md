# R11 Android and persisted-programme reconciliation — 2026-10-16

**Result: bounded Android/live-read parity verified; full new-programme,
started/frozen-session and effective-guidance acceptance remains
UNABLE_TO_VERIFY. N-0071 remains open. R11 only; stop here.**

Work started at `fe8dd3c07220079999b789b7c8d061c37982ed38` on
`fix/training-confident-ux`. No application implementation, scientific rule,
schema, deployment or training-data write was performed. The retained account
was treated as the operator's profile: no Save, Start session, Done, adjustment,
finish, deletion or replacement was submitted. An optional account-scope question
received no answer; absence of an answer was not treated as disposable authority.

## Runtime established, rather than assumed unavailable

Initially ADB had no device and no working Metro was established. Started the
existing `Medium_Phone_API_36.1` AVD and used `npm run android` from `app/`.
The first boot took approximately 131 seconds. Current captures showed Google
Play services and System UI ANRs; accessibility initially returned a null root.
A bounded close/reopen reached the dev-client `SocketTimeoutException` screen.
Metro's first startup reported `Failed to construct transformer: Error: Failed
to start watch mode`; host `/status` checks timed out. These are observed startup
failures, not an established root cause or a training defect.

Cold-booted that same AVD with `-no-snapshot-load`, preserving disk/account data.
The current native build succeeded in 8m17s, but Expo's first launcher command
then exited because separately started Metro occupied 8081. Used canonical
`npm run android -- --no-bundler`: build succeeded in 1m34s, installed the newly
built current APK, and opened the localhost dev-client URL. Restarted only the
failed Metro process with `npm start`. ADB reverse and the canonical localhost
debug preference were prepared by the existing script. After `/status` first
returned HTTP 200 `packager-status:running`, reopening bundled 3,619 modules in
99.521s and reached signed-in Reclaim. No historical APK, uninstall, data clear,
native-project regeneration or GlobalProtect was used.

Final environment: booted `emulator-5554`, Android API 36.1 AVD, Reclaim
**1.0.5 / versionCode 15**, Metro localhost:8081 with reverse, existing auth
session refreshed. APK SHA256 and timestamped bounded commands are in
`R11-runtime-observations.json`. Emulator/Metro/app were retained at the end.

Runtime served the existing working tree, including its pre-existing
`engine/index.ts` change. It is **not an exact committed R10 runtime**. That edit
was neither changed nor staged. Committed R10 fixtures and source harness were
checked separately in the existing isolated committed snapshot. This limits
attribution of legacy selection behavior to the published product commit.

## Actual saved profile and persisted authority

Read through the already authenticated dev app's existing APIs using its local
Hermes inspector. `getTrainingProfile`, `getActiveProgramInstance` and
`getProgramDays` perform user-scoped live SELECTs. A bounded user-scoped session
SELECT and `getTrainingSession` supplied existing stored session items; no
credential/token was extracted. Existing query-cache history/settings were read
to reproduce the same projection used by TrainingScreen. New generation ran in
memory only. Raw API snapshots, identities and unrelated health data stay local;
the committed evidence contains bounded observations, aliases and hashes.

The retained profile revision is `2026-10-12T16:28:30.531276+00:00`.
Its goals are muscle **45.4918%**, strength **47.0628%**, fitter **7.44546%**,
fat loss **0%**. Android setup displays rounded 45/47/7/0 values and Monday–Friday;
advanced strength, skill off, twice preference and equipment selection agree
with the stored profile. Floor/space is not selected. Saved normalized own
baseline estimates differ from the R10 synthetic fixture. Legacy entered-rep
metadata is absent: setup reconstructs five-rep working inputs (bench105,
squat90, deadlift100, overhead80, row75 kg). Those displayed inputs must not be
misreported as preserved original entered repetitions. No setup value was edited
or saved; the final screen is baselines with Save, not proof of new-build save.

The active programme revision is `2026-10-12T16:28:32.155916+00:00`, starting
12 October. Its 20 persisted day rows map to four Monday–Friday weeks through
6 November. The stored plan has **no `programme.policyVersion`, weekly
compilation or per-day allocation**. It is a legacy saved programme, not an R09
versioned save. The current week is 12–18 October, with Upper / Lower Squat /
Push / Pull / Lower Deadlift. Android week labels/dates agree with these rows.

## Five Android previews versus current app projection

Every exercise row across all five previews was captured in current Android
accessibility trees, including scrolling. All **27 exercise rows** match the
same live-profile/history/settings projection in identity/order, working-set
count, repetitions and displayed kg, including bodyweight, per-dumbbell,
bar-total/cable units and explicit enter-a-weight rows. This comparison is
against current regenerated proposals for persisted day metadata, **not stored
started-session prescriptions**. No such current-programme snapshot exists.

| Day | Exercises / working sets | Estimated minutes | Selected observed prescription |
|---|---:|---:|---|
| Monday upper | 6 / 14 | 43 | Bench 3×7 at 100 kg; fly 1×13, load unspecified; row 3×7 at 62.5 kg |
| Tuesday lower | 4 / 10 | 37 | Squat 3×7 at 85 kg; hack 1×13; RDL 3×7, load unspecified |
| Wednesday push | 6 / 16 | 38 | Bench 3×7 at 100 kg; cable fly 1×13; OHP 3×7 at 75 kg |
| Thursday pull | 5 / 13 | 35 | Pull-ups 3×7 bodyweight; row 1×13 at 60 kg; curl 3×13 at 15 kg per dumbbell |
| Friday lower | 6 / 14 | 48 | Deadlift 3×7 at 95 kg; RDL 1×13; leg press 3×7, load unspecified |

Exact sets, weights/rest and validation results: `R11-live-reconciliation.json`.
Machine-checked Android row comparison: `R11-preview-comparison.json`.
Hierarchy text/bounds: `R11-android-accessibility.json`. Hierarchies include
offscreen/clipped nodes and do not imply that all rows were simultaneously
visible in a screenshot. Four reviewed screenshots cover the week, setup
baselines, preview summary and existing historical detail. A later navigation
capture sequence left the target surface; its unrelated captures were rejected,
excluded from publication, and Reclaim was restored before further checks.

The preview summary agrees with the app projection: **Completed 0; Frozen
planned 0; Provisional future Chest 8 / Back 32 / Shoulders 28 / Arms 25 / Legs 19;
Programme needs review**. Tuesday is `infeasible`, with `unavailable_slot` for
hip_hinge; the other days are legacy projections with the historical-context
warning. Tuesday is excluded from the provisional summary. Display bucket
totals use overlapping catalogue-primary regions and cannot be compared as
exclusive scheduling quotas against R10's four ten-set major-owner totals.
The preview still exposes Start session; it was not tapped to test start-time
rejection on this retained account.

## Representative regression is a different fixture

`R11-representative-five-day.json` extracts committed R10 evidence at
`589d527e615cae85869835681499b0e4d28fed3f`, preserving exact source hash and all
working prescriptions. It is the **synthetic** advanced/full-gym 46% muscle,
46% strength, **8% fat loss**, 0% fitter fixture, with floor available and its own
entered weights/reps. Its policy is `weekly-20261014-v2`; daily working sets are
16/13/17/14/16 (76 total), minutes43/45/38/35/48, and exclusive chest/back/quads/
hamstrings each 10. Bench is 3×7 at 82.5 kg on both chest days; Monday dumbbell flyes
and Wednesday cable flyes have two follow-up sets. All four recorded weeks are
identical absent new qualified history. Zero external load is interpreted using
the exercise's explicit reason, not universally as calibrated/bodyweight work.

The independent reviewer checked this extract directly against committed R10
data. It was not saved over the operator's programme and was not exercised as a
disposable Android save/start. Its difference from the actual profile is not
itself a parity defect. Requirement/scientific provenance stays in
`docs/training/ROUTINE_AUDIT.md`, `RUNNING_DESIGN.md` and `R10-requirements.json`.

## New build, frozen work, history and guidance

A pure in-memory new build from the retained snapshot/current cached canonical
history stamps `weekly-20261014-v2`, strategy `balanced-v1:5`. All five proposals
are rejected as infeasible; the whole-week validator reports
`invalid_load_evidence` for leg_press, plus explicit load/history warnings.
No rejected build was persisted. This is observed behavior, not a repaired
policy, an accepted-good programme or proof of Android save/start handling.

Live reads found **zero current-week frozen days and no open session**. All six
bounded saved sessions predate this programme. Creating a disposable session
under this retained account was not expressly authorized, so actual new-start,
frozen-prescription transition, canonical Android Done, persisted effective
adjustment and notification/FGS/Wear delivery remain **UNABLE_TO_VERIFY**. No
paired watch was used. No active guidance was manually scheduled or cancelled.

Current Android History and its detail view for the separately saved 1 October
session agree with canonical persisted work: **20 completed sets, 8 completed
exercises, 5,394 kg recorded volume**. Stored plan has 22 sets/9 items, so the
completed summary correctly does not count unperformed work. The first exercise
shows three 70 kg×7 sets; the stored row 70 kg hold explanation is displayed.
This verifies present rendering of historical data, not new frozen-session
acceptance or a new progression event. No historical screenshot substitutes for
current runtime evidence. R10's separate 80→82.5 recommendation/80 applied ceiling
and 100→95 effective adjustment remain source evidence, not Android observations.
The screen also shows the unusual **5,939-minute** historical duration, with
“Closed after a long pause” on its History card. That stored duration was observed,
not corrected or used as workout-time acceptance; no new cause is inferred.

The profile/programme revisions, six bounded planned/performed snapshots and
weekly summary were identical on live re-read after inspection; no open session
appeared. Evidence preserves per-session sanitized snapshot hashes.

## Verification and unresolved gates

Required harness against the unchanged committed R10 snapshot: types pass,
focused48/48, Git Bash dual-path 31/31, catalogue 357/0. The first full run stopped
advancing after a known volume assertion and was interrupted after more than
four minutes without log progress. Once runtime bundling settled, the full
verbose retry completed: **199 files, 1,374 passed / the same four established
baseline failures**, no new assertion identity. This is not a green full harness.
Wrapper pytest: 1 passed / 2 existing `LEASE_NOT_OWNER` failures. Gate/log hashes
are in `R11-gates.json`; raw logs remain local. These checks are not Android
evidence. Independent same-model separate-session review is recorded in
`R11-independent-review.md`; no qualified domain or different-model claim.

Public `status --node N-0071`, `lease N-0071` and `human-check` all failed with
**`LEASE_NOT_OWNER: R20261014R03`** before registration. No takeover, shared-runtime
inspection/repair, evidence ID, acceptance, completion or shipping approval was
attempted. The explicit UNABLE_TO_VERIFY manual queue entry links
`R11-human-verification.md`; it is **unregistered**, not a successful EIF event.

R10-P01 lower-body compound-follow-up versus isolation-only prose, D-P2-01–06,
support-slot specification, baseline harness debt and full N-0071 dependencies
remain visible. No scientific prescription was changed. Reproducible remaining
steps cover an expressly authorized disposable versioned save/start/reload,
frozen versus future proposal, effective phone/notification/Wear/FGS guidance and
independent persisted/pixel comparison. **R11 evidence checkpoint only; do not
claim N-0071 acceptance. Do not start R12 or another task.**
