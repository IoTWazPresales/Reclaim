# Android verification after operator provenance acceptance - 2026-11-01

**Result: Monday-Friday saved; runtime verification stopped on confirmed load-unit finding RA-016. No session or set created. No product code changed.** Branch fix/training-confident-ux; installed release source-equivalent to 0cecd15. N-0070 remains open; no acceptance/completion or R12.

## Provenance basis and release finding

Operator explicitly accepted provenance by elimination: read-only EAS listing returned no published Android updates for runtime 1.0.5 across all branches; update requests are rejected because the installed build has no channel; the embedded bundle, source-identical to 0cecd15, is accepted as the only launchable code. This is an operator decision, not a claim of an explicit embedded-launch log. Installed APK hash, source-equivalent documentation-only child HEAD 35ce1e8 and preceding provenance evidence remain unchanged. Full reasoning: operator-provenance-decision.md; independent read-only observations: provenance-readonly-result.md.

**Release finding, not fixed:** updates enabled with no channel configured in this installed artifact; production OTA cannot be delivered with that configuration. Native logs confirm missing channel-name rejection. No EAS publication, channel update or application configuration change performed.

## Before-save report and change

Reported to operator before Save:
- Mode Strength.
- Goals: Build Muscle 40%, Build Strength 40%, Lose Fat 10%, Get Fitter 10%.
- Experience Intermediate; no selected injury constraints; skill work off.
- Equipment unchanged: barbell, squat rack, bench, dumbbells, cable machine, pull-up bar, kettlebells, floor/space, leg press, hack squat, T-bar row station, chest press machine, dip station, trap bar, EZ bar, Smith machine. Landmine/cardio equipment remain unselected.
- All five displayed baseline weights blank: Bench Press, Squat, Deadlift, Overhead Press, Barbell Row. Each displays default 5-rep selector. No baseline or reps entered/edited; prior history not rewritten. No hidden baseline state was asserted independently from DB.
- Only selected weekdays changed: Tue/Thu -> Mon/Tue/Wed/Thu/Fri. Weekends unselected. Evening time preference retained. Advanced options not edited.

Save tapped once. App returned to Training with new Upper/Lower/Push/Pull/Lower programme. Source console reports expectedDays=20, actualCount=20, match=true from returned inserted rows. This is app/API insert-return evidence, not a separate SQL count. Weekly review now unresolved, 33 warnings, 0 errors; earlier programme had missing diagnostics. Preview shows completed=0 and frozen planned=0, with separate provisional totals. No app crash observed during this journey.

## Captured prescriptions and fixture boundary

Actual previews captured for Monday, Tuesday, Wednesday, with screenshots plus accessibility dumps. Row inventory: observed-prescriptions.json. Working-set totals 16 / 13 / 17 respectively. Unspecified loads are shown as confirmation-required rather than calibrated zero. Source-cited warnings are visible. No exact five-day parity claim.

The older captured replay belongs to the same account but uses Advanced experience, different goal weights and nonempty baselines. Today's unchanged real setup uses Intermediate, 40/40/10/10 and empty visible baselines. Therefore its 68-set/20-warning receipt is not an equivalent current-input oracle. User profile was not changed to force the old fixture. Current review's 33 warnings are not called a defect solely for differing from that receipt.

## Stop finding: free-weight defaults ignore total-bar vs per-dumbbell convention

Wednesday preview explicitly displays **Dumbbell Bench Press: 3 sets, 60 kg, 7 reps, Per dumbbell**. Monday preview displays **Barbell Bench Press: 3 sets, 60 kg, 7 reps, Total bar weight**. These are different load conventions, not interchangeable kilograms.

Read-only source trace: engine/index.ts suggestLoading uses the Intermediate horizontal_press freeWeight=60 default for both. getExerciseLoadingProfile distinguishes total_bar vs per_dumbbell, but default selection has only bodyweight/machine/freeWeight buckets. With no own baseline/history in a pure control, suggestLoading returns 60 for each exercise, in those different display modes. Sanitized executed control: load-unit-probe.json. This control demonstrates the shared-default path; it is not asserted as an extraction of the running app's full current history.

Existing docs/training/ROUTINE_AUDIT.md RA-016 identifies this as WRONG-MODEL: dumbbell display is per dumbbell while default kg table does not account for that convention; suggested correction is generating load in display-mode units end-to-end. The current runtime reproduces that documented finding. No specific replacement weight or scientific policy is proposed. This is a load-generation/units issue requiring a code decision, not proof that the displayed kg is an own-evidence Epley ceiling.

Per operator instruction, STOPPED here. No Thursday/Friday continuation, session Start, Done, record editing or code correction performed. App remains on an unstarted preview. No test work exists to delete.

## Requested steps accounting

| Step | Result |
| --- | --- |
| 1 provenance | Accepted by explicit operator elimination decision; raw limitations preserved |
| 2 preconditions/settings | Strength and visible unchanged profile reported; no active-session banner observed |
| 3 save/weekly status | Monday-Friday Save succeeded; 20 returned day rows; unresolved/33 warnings/0 errors |
| 4 five-day parity | PARTIAL: Mon/Tue/Wed captured; old replay has different inputs; stopped on RA-016 |
| 5 ceiling vs working / confirmations / leg press | INCOMPLETE: confirmation wording observed; current governing-ceiling vs working-weight and leg-press checks not completed before stop |
| 6 frozen session / notification / FGS | NOT RUN; no session started |
| 7 one-set persistence / Cancel & delete | NOT RUN; zero sessions/sets created, no cleanup required |
| 8 evidence/approval queue | Scoped evidence and finding renders prepared; queue registration tracked below; not acceptance |

## Validation and preservation

Executed pure source probe successfully; reviewed actual finding pixels and matching accessibility text. Product sources untouched; no new implementation tests or full suite rerun for runtime-only verification. Prior 1492-test source harness remains historical, not fresh Android acceptance. No independent rendered review claimed. No broader nodes pursued. Raw personal Home renders/logs/XML and installed APK remain local, unstaged. Only scoped sanitized evidence is suitable for branch publication; no account/session/user identifiers retained in this report.

## Public wrapper queue result

Run R20261101ANDROIDVERIFY: public status read N-0070 in_progress/acceptance pending with no lease. Lease command exit 0; await-approval for review-renders exit 0. PROGRESS mutation log records lease acquire, stage note with two render hashes, and automatic lease release. Queue note is not visual approval or node acceptance. Pre-existing mixed generated ledger/runtime state remains unstaged; only scoped sanitized evidence/documentation is published. No complete command was run.
