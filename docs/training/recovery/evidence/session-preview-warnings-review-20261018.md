# Session preview warnings: independent source/UI review

Verdict: **APPROVED for the scoped source change**. Android visual acceptance
remains **UNABLE_TO_VERIFY / pending separate authorisation**. This is a source
and component-output review, not approval of rendered Android pixels, loaded
runtime source or an actual session-start journey.

Reviewed against source checkpoint `596ea1bfa7003cb8a0d8c9dbd17aa7386227818b`
on `fix/training-confident-ux`. Review began on 2026-10-18 and its final receipt
was prepared on 2026-10-19. The independent reviewer read AGENTS.md, the weekly
diagnostic transport evidence, the implementation-reviewer skill and detailed
contract, and inspected the original validator, allocation transport, frozen
projection, preview caller and unchanged Start guard. No Android, adb, Metro,
live-data access, session start, EIF operation or R12 work was performed.

## Findings and resolution

One MINOR copy finding was raised: the initial unresolved heading claimed that
some exercises needed confirmation even when the only warning was unresolved
legacy policy. The final heading says to review programme warnings. The new
policy-only test verifies that no exercise-confirmation requirement is invented.
The finding is resolved. No remaining material scoped source defect was found.

- The modal reads the existing `plan.weeklyValidation` result directly. It does
  not run the validator, derive validation from feasibility or alter prescriptions.
  Valid, unresolved, invalid and missing results have distinct messages; missing
  results explicitly mean unavailable rather than validated.
- Exercise warnings require the original week and day, exercise identity and,
  where supplied, allocation slot identity. The TrainingScreen change supplies
  saved `week_index`, `day_index` and the resolved original allocation slots.
  It does not infer location from display order. Another day's exposure is not
  borrowed. Missing or mismatched location is acknowledged.
- Issues without a day remain separate week-level guidance. Selected-day issues
  that cannot safely attach to a row remain visible once in selected-day review,
  retaining their original identifiers. Duplicate exercise IDs do not cause an
  issue to be attached to both rows. Genuine repeated issue occurrences survive;
  the complete weekly issue array is not printed for every exercise, and no
  inflated issue total is introduced.
- Load-confirmation warnings replace the row's prescribed-load presentation with
  required confirmation, without inventing a confirmed state or changing stored
  loads. Incomplete or unsupported history is explicitly a barrier to automatic
  progression. Original message, code, severity and provenance remain visible.
- The existing Start button and `assertStartableProgramme` guard are unchanged.
  Warning-only plans remain startable; the existing daily infeasibility/error
  guard still rejects its synthetic controls. Tests invoke only a mock callback.
- Legacy previews retain their existing load formatting. The existing frozen
  projection removes current-week diagnostics before stored prescriptions are
  displayed, including empty snapshots. Component tests verify the stored load,
  absence of current warnings and lack of mutation of the original proposal.
- Presentation adds one short status and relevant guidance inside the existing
  scroll surface; header and footer structure remain unchanged. Exact diagnostic
  metadata adds density. Source inspection cannot establish wrapping, contrast,
  scroll reachability, font scaling or perceived compactness on Android.

## Verification boundaries

The reviewer independently executed the component file with constrained forks:

`npx vitest run src/components/training/__tests__/SessionPreviewModal.test.tsx --pool=forks --maxWorkers=1 --reporter=verbose`

The first independent run passed **12/12** tests in 6.65 seconds, including the
duplicate-ID and missing-slot regression. The final added policy-only test was
independently inspected; the implementer's final component receipt records
**13/13 passed** in 7.75 seconds. The final combined retry receipt also records
**41/41 passed across four files** in 36.02 seconds, including the final 13 modal
cases. The reviewer inspected both completed receipts.

The independent final rerun failed before collecting any tests with
`[vitest-pool]: Timeout starting forks runner` and a subsequent Vite close
timeout; exit 1, no tests executed. This is a runner failure, not a passing
independent repeat of the final 13 tests. Its local log is
`app/preview-warnings-independent-final.local.txt`. The source verdict relies on
independent inspection, the completed independent 12-case run and the inspected
completed final receipts. Raw local logs are not included in this sanitised
receipt. The repository's 30-second per-test budget was unchanged.

Broader typecheck, full-suite and repository-gate outcomes belong to the main
correction receipt; this reviewer does not infer their success from focused tests.
Existing unrelated engine, route-migration and ledger work was preserved and
was outside this implementation approval.

## Exact reviewed files

SHA-256 fingerprints identify the final working files, independently checked
using both PowerShell and Python. Git blob identities apply repository newline
normalisation and allow comparison after publication.

| Path | SHA-256 | Git blob |
| --- | --- | --- |
| `app/src/components/training/SessionPreviewModal.tsx` | `4769098312374356404fdc1118545c48d27403a14d8764815d0854d8738dd243` | `66e20dee53d361c854d8f6ef31851825688a874d` |
| `app/src/components/training/SessionPreviewProgrammeReview.tsx` | `8a024f4ec4ac9679933d8202e759b17d2808a25a0f81e1cbc8695e9567f6f8c5` | `46d1c4b6116d6938c50eeea84cf2c738759fbe34` |
| `app/src/components/training/__tests__/SessionPreviewModal.test.tsx` | `9377074a95d1e38ecae2f0a987a203f92acda9915ff83530843e173aab5b9673` | `cbe767d5b9c0b2e7a387e666dc35d4faf029f1d9` |
| `app/src/screens/TrainingScreen.tsx` | `33b91637004bafb9d1036702de3b06f98a04442aec5f3a2b4fa136ea139b091a` | `2ab8c8fd3ac1c475225f8a9575bb6aacc1d221f9` |

Approval covers the modal, its presentation helper and focused tests, and only
the five-line diagnostic-location prop addition in TrainingScreen. It does not
approve a calendar or TrainingScreen redesign, scientific policy, live data,
historical prescription changes, deployment or EIF acceptance. Actual Android
render review and runtime acceptance remain separately authorised follow-up.
