# N-0064 — first-medication coaching truth

The retained AVD evidence in N-0032 showed four medications alongside the first-med
coach. Source authority is `MedsScreen`'s `medsQ` result plus the persisted coach
dismissal flag. Visibility currently ignores the list. Its query also converts a
failed `listMeds` call into successful empty data, contradicting genuine emptiness.

Use a small rendered coach boundary gated on a successful, settled empty list and
the existing dismissal flag. Propagate list read failures to the existing error UI;
keep the canonical API's user-scoped read cache behavior. No medication, dose,
reminder, catalogue or dismissal persistence behavior changes. Tests render the
real coach with mocked native/theming primitives; AVD re-check remains separate.

## Verification

- Rendered component tests: 11/11 PASS. Real FirstVisitCoach remains in the render
  tree for an empty successful result; hidden states render null, including its
  spacer and accessibility controls. Show me and Dismiss retain their callbacks.
- Git Bash dual-path audit: 27/27 PASS. No clinical or catalogue edits.
- Typecheck: 0 errors. Full verbose Vitest: 149 files / 941 tests PASS in 185.68
  seconds. Local logs: `.eif/audit/N0064-{focused,typecheck,vitest}.txt`.
- Same-session self-verification (R1): visibility derives from query truth and is
  not persisted as a second medication state. A data arrival removes the coach
  without marking it dismissed. No write effects or changes to medication/dose
  APIs. Native visual/a11y review is UNABLE_TO_RENDER, not inferred from source.
- Runtime evidence and pending AVD steps: `N0064_DEVICE_CHECK.md`. Prior personal
  medication screenshots stay local and are not included in the commit.
