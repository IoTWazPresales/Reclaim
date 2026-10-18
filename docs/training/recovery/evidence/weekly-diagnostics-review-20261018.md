# Separate source review - weekly diagnostic transport, 2026-10-18

**Approved for the scoped source transport correction.** Independent reviewer
examined AGENTS.md, the implementation-reviewer skill/contract, R05 validator and
R09 projection/persistence contracts, the prior blocked Android result, actual
source diff, focused tests and offline replay implementation. No application
code was authored by this reviewer. No Android, live API, session write, EIF
acceptance or R12 action was performed.

The complete validator result is retained as optional `SessionPlan.weeklyValidation`,
including valid/unresolved/invalid status, issues and coverage, with weekly policy
and strategy identity. Issue provenance, exercise identity, code, severity and
location survive unchanged. Daily feasibility remains separate. Invalid weeks
still set daily infeasibility and copy hard diagnostics to the existing guard;
warning-only weeks preserve the existing startability decision. No load,
prescription, validator policy or set-completion path changes were found.

`weeklyProgrammeDiagnostics` returns one result per week/policy/strategy for a
single programme, including JSON-reloaded daily copies. It skips absent legacy
diagnostics without treating them as valid and excludes explicitly frozen entries,
including empty snapshots. The reviewer raised current diagnostics leaking through
`frozenSessionProjection`; the final implementation removes that field from frozen
projections. Frozen item prescriptions and the existing started/guided authority
remain intact. No unresolved substantive finding remains.

Independent execution:

- Initial focused run: 147 passed, 1 failed out of 148. The existing validator's
  135 cases and persistence integration's 6 cases all passed. The new legacy test
  incorrectly assumed every legacy proposal was startable; it was corrected to
  respect existing daily errors/infeasibility, without application changes.
- A default thread-pool repeat stalled before test results and was stopped by
  its specifically identified reviewer-owned process. Final independent command:
  `npx vitest run src/lib/training/__tests__/weeklyDiagnosticsTransport.test.ts --pool=forks --maxWorkers=1 --reporter=verbose`.
  **7 passed**, exit 0, 5.35 seconds. No shorter test timeout was used.
- Independently inspected and executed `node docs/training/recovery/evidence/replay-weekly-diagnostics.cjs`:
  exit 0. It verifies capture hashes, exactly reproduces the corrected private
  baseline, changes only current validator plus transport/projection modules,
  compares complete issue/coverage values and every other proposal field, and
  reconstructs canonical history without live access. All **20 daily proposals
  remain feasible**; each week retains **20 warnings**, comprising 19 load
  confirmations and one incomplete-history barrier. Summary transport returns
  one result per week rather than counting five daily copies.

The offline replay depends on private local capture files and proves source
behavior against that captured input, not currently loaded Android JavaScript or
current live data. The replay script writes only its sanitized receipt. No private
capture contents or raw test logs are included in this review.

Reviewed working-file SHA256 values (byte-exact, before Git newline normalization):

| Path | SHA256 |
| --- | --- |
| `app/src/lib/training/types.ts` | `1c3fe27ab428e2271b9de22224ee402744f5073522ccecb0f94c69c6ab55be8b` |
| `app/src/lib/training/programmeWeekProposal.ts` | `c813bc6ec7be52f0f3118bd92f5d940e0a1ed31866ce8b003546b73d3353f8dd` |
| `app/src/lib/training/programmeProjection.ts` | `1fe8edf9c96be3e9876b8ece74a025700ca73b6cede866f668dfeefdc9add27a` |
| `app/src/lib/training/__tests__/weeklyDiagnosticsTransport.test.ts` | `88202931ed211cef9a0b8854a385c3fa6988cec6b7ef783e8b58a78dbe894ea0` |
| `docs/training/recovery/evidence/replay-weekly-diagnostics.cjs` | `7099185aa1dc7e43dd4b88be8a6d0b2ef66c22cb8395ab3ab0ce84c33268b8d6` |

Presentation remains a follow-up: the existing rendered weekly volume string and
preview component do not display these diagnostics. Consumers should use the
typed weekly result/helper, retain weekly status separately from daily
feasibility, render exact issue identity/provenance with appropriate per-day or
exercise filtering, and count weekly warnings once. External zero remains
unspecified; unresolved results and incomplete history are not calibrated-load
approval. Android loaded-source proof and actual preview/guidance renders remain
unverified. This source approval does not approve those requirements, shipping,
scientific policy, or EIF acceptance.
