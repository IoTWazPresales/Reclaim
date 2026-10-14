# R10 — Independent programme-quality acceptance suite

**Type:** integration verification task. **Depends on:** R05, R07, R08, R09. **EIF:** N-0071, currently proposed. **Scope:** acceptance tests/fixtures and evidence only; product fixes discovered here become separate scoped follow-ups, never silently included.

**Objective.** Build a representative and adversarial suite that rejects incoherent *complete programmes*, even if individual algorithm tests pass. Use independently written expected requirements from accepted policy and the [Phase 1 audit](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md), not generator snapshots as the only oracle.

**Coverage/acceptance.** Matrix includes strength/running/hybrid, 2–6 days, novice/trained, goal mixes, full/dumbbell/floor equipment, injuries/forbidden/disliked work, different baseline reps, history absent/unavailable/improving/partial, weeks 1–4, substitution, and mixed frozen/future week. Required regressions: the audited five-day profile shape, empty floor-only plan, incomplete dumbbell pull, label rename, two/three-day hybrid, 100→95 adjustment, 82.5 recommendation capped at 80 with explicit pending-policy reason. Validate full weekly requirements, final delivered slots, evidence status, time/load semantics, explanations and explicit infeasibility. Distinguish accepted product choices from scientific unknowns.

**Files/interfaces.** Prefer `app/src/lib/training/__tests__/programmeAcceptance.*` and immutable sanitized fixtures under `docs/training/recovery/evidence/`. The original [probe](../../../../.eif/audit/training-intelligence-20261012/training/probe.cjs) and [result](../../../../.eif/audit/training-intelligence-20261012/training/probe-results.json) are *before* examples, not acceptance assertions.

**Verification/EIF evidence.** Run focused suite then full required AGENTS harness, save verbose outputs and before/after programme JSON without account PII. An actual independent reviewer re-executes a sample of fixtures and challenges the oracle; role headings in one response do not count. Stage explicit paths, commit/push, attach criterion-level evidence. If a scenario fails due to an unresolved scientific policy, record that as unverified/decision-pending rather than weaken the assertion.

**Exclusions/completion.** No production data, arbitrary new targets, framework changes or Android claims. Complete when the suite demonstrates both known-bad rejection and accepted-good coverage with reviewed provenance.
