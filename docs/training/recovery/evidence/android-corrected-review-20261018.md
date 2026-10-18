# Separate Android evidence review — 2026-10-18

**Corrected Android programme verification: UNABLE_TO_VERIFY.** The published
renders substantiate a loading failure and Android ANR, not corrected programme
presentation. This is a separate same-model review session using the
verification-controller evidence-verification contract; no different-model or
domain acceptance is claimed.

## Primary evidence inspected

I independently opened the actual published
[loading PNG](android-corrected-loading-20261018.png) and
[ANR PNG](android-corrected-anr-20261018.png), read the
[receipt](android-corrected-receipt-20261018.json), and recomputed both PNG hashes.
They match the receipt:

- Loading: `e8d37b79d487a94cb3bcc81b39235851c6ccc9d20d17f9012cedcbc17f2f9b28`.
- ANR: `cfa2f4d04c8c1d6638f3873fa9bcd90d8ef9dca7ff9d7d0541d2f4fce45c782d`.

The loading image visibly says “There was a problem loading the project” and
shows `java.net.SocketTimeoutException: timeout`, with Reload and Go To Home.
The final image shows “Reclaim isn't responding”, Close app and Wait over that
loading error. The receipt's selected accessibility text and bounds agree with
the visible screens. The Android ANR tree describes the foreground dialog only;
the background loading text remains visible in the PNG. No published screen
contains a user identity, token, profile rows or health measurements.

I also inspected the private initial Training PNG and XML. They show a retained
calendar, a next-session Preview and a four-week programme card. They contain no
exercise prescriptions or warning diagnostics. Loaded corrected JavaScript was
not established for that view. Its existence cannot prove that the corrected
validator was loaded, that a corrected new programme was rendered, or that its
prescriptions and warning state were accurate. The later private Tuesday capture
shows an ANR, not a Tuesday session preview. The initial calendar remains private.

## Source-only findings

I read `buildProgramDaySession.ts`, the TrainingScreen confirmation/mutation
paths, `programmeWeekProposal.ts`, `programmeProjection.ts`,
`SessionPreviewModal.tsx`, `ExerciseDetailsModal.tsx` and `loadDisplayFormat.ts`.
The current guard hash independently matches the receipt:
`0a7ff84409799d212dd9210e7b943ff7e527fc7dcfdcfcf33e0e82421b7c533c`.
The corrected validator disk hash also matches:
`b4730b3a791408cc6d2d971c4e1dab4998a173f13590a7badc98adfd3d54e3b4`.
These are disk-source hashes, not a loaded Android source fingerprint.

`assertStartableProgramme` rejects a daily `infeasible` status or any error issue.
Warning-only issues do not reject a session. TrainingScreen calls that guard in
its confirmation callback and at the beginning of the mutation, before
`createTrainingSession`; materialization also calls it. This supports the narrow
source conclusion that unresolved warnings alone do not block an otherwise
feasible proposal. The receipt records 20 pure checks against retained corrected
offline proposals; this reviewer checked the source boundary rather than
rerunning those checks. No runtime Start or session persistence is verified.

The external zero-load formatter emits “enter a weight” for ordinary repetition
prescriptions with unspecified external load. Bodyweight uses a distinct branch.
That is the correct source presentation distinction for this case, but no fresh
Android exercise row or guidance was reached here, so rendered zero-load handling
remains unverified.

A concrete source visibility gap exists: `programmeWeekProposal` copies the
weekly validator's issues into proposals only when the weekly result is
`invalid`; it discards an `unresolved` weekly result. `weeklyProgrammeSummary`
adds “Programme needs review” only for infeasible proposals.
`SessionPreviewModal` renders no programme-validation diagnostic list, while its
guidance modal receives the catalogue exercise and hides performance history.
Thus these paths do not carry and explain the corrected week's complete
warning-only diagnostic result. This is a source finding, **not an observed
corrected Android rendering defect**.

Once runtime rendering is restored and the corrected loaded source is proven,
the precise candidate correction is to retain the weekly unresolved result and
its issue occurrences in the presentation projection, expose the 19 external
load confirmations and the leg-press history warning truthfully, and retain
feasible daily startability. Verify that proposal on actual Android pixels and
accessibility output before claiming the presentation issue resolved. No
application correction was made in this review.

## Limits and next verification

The offline correction document records five feasible daily proposals, an
unresolved weekly result, 19 load-confirmation occurrences and one history warning
per week. Those figures remain offline evidence; no current authenticated read,
fresh in-memory generation, all-day parity comparison, weekly preview, exercise
guidance or live before/after row comparison was obtained in this Android attempt.

The immediate next step is to restore responsive delivery of the existing
development bundle and establish its loaded validator fingerprint. Then repeat
the authorised read-only profile/proposal comparison and rendered preview
inspection. The timeout/ANR captures do not establish the failure's root cause.
No source change, data mutation, session start, migration, scientific-policy
change, EIF acceptance or R12 is justified by this review. No API writes were
reported or performed by this reviewer; independent live-data identity assurance
is unavailable without authenticated before/after reads.

This reviewer used read-only file inspection and image viewing, and wrote only
this review. I did not interact with the emulator, Metro, APIs, Git or sessions.
