# R09 weekly persistence integration

The canonical writer remains `buildFourWeekPlan`. Existing programme JSON now
stores `programme.policyVersion` and its normalized decision input beside the
four weeks, compiled objectives and allocated day/slot references. The existing
`profile_snapshot` and database day schema stay compatible; no migration or
historical rewrite is performed.

`programmeWeekProposal` projects stored weeks through `buildProgramDaySession`
and the committed R05 whole-week validator. Setup preview, confirmed setup and
TrainingScreen use this projection. Allocated programmes keep their saved
exercise/dose identities. Legacy intent programmes retain the existing weekly
muscle-count/avoid-used-exercise coordination centrally; their scientific policy
remains pending review, rather than silently receiving new rules.

`resolveProgramDayAllocation` resolves explicit `weekIndex` plus `day_index`,
independent of week array order and display labels. Missing or unsupported
versioned references become visible infeasibility diagnostics. Versioned plans
missing compiled context and altered allocations fail whole-week validation.
True historical unversioned plans retain the legacy builder contract.

Setup validates before any profile/programme replacement write. The start handler,
start mutation and pure materialization boundary refuse infeasible plans. New
session items are deep snapshots. Existing started/guided items retain their
prescriptions; canonical completion and effective prescription readers are
unchanged. Future projections can consume qualified R06 history. No frozen
projection is cached as a future start proposal.

The owned frozen-week read selects parent sessions with nested items, retaining
even empty started snapshots and guided snapshots with items. Ordering by created
time and ID makes the latest saved attempt deterministic per programme day.
Read errors stay errors. Query invalidation on start, completion and minimizing
refreshes the mixed-week summary. Summary categories are completed canonical
recorded set indices, the full frozen prescription, and provisional future sets.
These are muscle sets by primary region, with known catalogue mappings; they do
not aggregate repeated attempts or summarize run duration. Infeasible future
days are excluded and explicitly need review. Frozen-read failure/loading is
labelled unavailable rather than presenting computed future work as actual.

The named five-day synthetic source fixture follows setup → weekly projection →
JSON save/calendar rows → session materialization → canonical performed merge →
qualified history → reload → future proposal. It asserts original stored plans,
recorded work and the existing effective guidance authority. It does not execute
a live database or Android runtime; R11 retains runtime acceptance.

Evidence: `.eif/audit/N-0070/R09/result.md`. The established EIF ownership conflict
blocks formal attachment and node acceptance; N-0070 remains open. R09 branch
checkpoints are not an accepted or shipped node.
