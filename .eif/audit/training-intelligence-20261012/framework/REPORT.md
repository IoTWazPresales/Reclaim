# EIF process and enforcement investigation

Date: 2026-10-12. Phase 1 only; recommendations are not implementation authority.

## Scope, identity and independence

Reclaim branch `fix/training-confident-ux`, HEAD `a9163835e7e649c101320853d85fd8df1e5b883e`. Existing dirty work was preserved. No ledger, runtime, product, live data or shared-framework mutations were made. This report and the accompanying reproducer are isolated audit artifacts. The installed `.eif/runtime/**` and the framework checkout under `C:/AI` were not read or executed.

This is one separately executing Codex subagent (`framework_process`) applying the Incident & Failure Analysis, Runtime Safety Engineer and Verification Controller contracts. Three contract perspectives do not mean three reviewers. The parent supplied the Phase 1 mandate, scope, prohibited local runtime reads, shared-repository access and required output. This agent independently read the evidence below and returned findings to the orchestrator. Same-model subagent separation is weaker than a separate-model consultation; the parent owns the actual external challenge and its receipt.

The shared framework was read through the GitHub connector at **`f03832d7b95f3fc293b02294e5215f1a4b6453ee`**, the default-branch HEAD returned on this date (commit timestamp 2026-08-29). Exact upstream files, blob hashes and permanent URLs are in `upstream-manifest.json`; copies are in `upstream/`. This proves the inspected upstream contract and code, not byte identity with Reclaim's installed runtime. The local hook manifest says `product_version: 0.7.0-draft`; its upgrade journal finished on 2026-09-18 and records a pre-upgrade derived version of `0.4.0-draft`. It does not pin the installed programme engine to a source commit. Skill metadata `0.3.0-draft` is a schema version according to upstream SCHEMA, not proof of an obsolete install. Do not attribute September behavior to an assumed upstream revision.

## Executive finding

EIF supplied substantive critique and verification contracts, and Reclaim produced useful evidence, source tests, durable blockers and several effective narrow fixes. The process nevertheless allowed **administrative completion to stand in for demonstrated programme quality**. Several training work items were explicitly left scientifically or behaviorally incomplete in their own evidence documents, then later marked complete without changing those acceptance requirements. The framework's gate implementation checks status-shaped records more strongly than it checks the meaning, authority or independent provenance of those records. Reclaim further supplied journey routing fields the shared selector does not interpret. Excess gate obligations were then suppressed wholesale, including some applicable training journeys.

The resulting causal chain is supported: underspecified scientific outcomes -> bounded implementation of whatever constants already existed -> tests of those bounded rules -> incomplete end-to-end acceptance -> blanket closure -> a roadmap which appears finished while training quality remains unresolved. This is a combination of specification, integration, orchestration and verification deficiencies, with narrower reusable framework gaps. It is not evidence that every specialist failed, that no review occurred anywhere, or that inactive hooks caused the exercise-selection defects.

## F1 — Accepted outcomes were replaced by easier-to-prove proxies at closure

**Observed.** CHARTER's N-0011 requires fractional muscle/week goal bands and a session cap of 10; N-0023 requires week 1–4 sets/load/RIR; N-0024 requires hard-asserted bands. The implementation records explain that those scientific/product numbers were not defined by the governing rules. N0011_WEEKLY_VOLUME explicitly says “Not complete,” distinguishes role caps 25/15/10 and session cap 120 from weekly muscle bands, and says the measured baseline did not change. N0023_FOUR_WEEK_PROGRESSION records a week index and reactive deload correction, explicitly no wave or RIR targets, and says not to complete the node from this work. N0024_HARNESS_CI tests those role/session caps and preserves identical-week fingerprints, without muscle/week targets. Nevertheless PROGRAM_LOG seq 339, 364 and 366 mark N-0011/23/24 complete on October 5, following identical journey-NA rationales. N-0011's original criterion remains visible in seq 51. No corresponding decision or criterion change in the inspected ledger resolves the mismatch.

**Expected.** Refusal to invent scientific constants was correct. The unresolved policy should have become a decision with a named domain/product owner, an explicit revised requirement, and acceptance linked to the revision. Operators may waive checks or accept narrower scope, but the durable record must say which requirement was changed and what remains unproven.

**Root cause and escape.** Specification lacked operationally defined targets; delivery decomposed remedies before resolving that gap. Closure relied on generic operator-acceptance prose and gate status rather than criterion-by-criterion adjudication. Narrowly correct tests passed while the desired outcome remained unmet. This confirms a closure/evidence mismatch, not absence of operator approval: the record explicitly claims operator acceptance, and this audit does not possess the original chat to adjudicate its exact scope.

**Layers/confidence.** Specification + orchestration + verification + integration: CONFIRMED from conflicting charter, evidence and events. Framework contribution: its inspected gate does not bind completion to a reviewed requirement revision or criterion results; confirmed capability limitation, installed-byte equivalence unverified.

**Prevention.** Require a requirement-to-evidence matrix and explicit `satisfied`, `waived`, `superseded`, or `unverified` outcome for each accepted criterion. A waiver must identify approver, decision, scope and residual limitation; it must not become scientific validation. An adversarial fixture must try to complete a weekly-volume item with only session-cap tests and be rejected or shown as accepted-with-gap.

## F2 — Journey routing mismatch led to blanket exemptions

**Observed.** `.eif/JOURNEYS.yaml` scopes real journeys with `nodes:`, e.g. plan-strength names N-0011/20/21/22/23/24/40; run-gpx names N-0042. Upstream `journeys.py` validates core keys and selects only `required_for`, `facets` and `criticality`. It has no node-ID input and ignores `nodes`. Thus the 13 non-skeleton journeys apply broadly. PROGRAM_LOG records exactly that problem in the October 5 closure rationale, then writes all 13 required IDs with state `na` on many nodes, including relevant training nodes. Reproduction with the pinned upstream pure functions confirms an unrelated feature still selects a `nodes`-scoped journey and that `na` with any nonempty rationale passes without coverage. An explicit empty frozen required set also passes; no evidence was found that this latter path was used historically.

**Expected.** Routing must select relevant journeys, and an applicable but unexecuted journey must remain unverified or explicitly waived. A mapping field that appears authoritative must either be supported or rejected as unknown. One unrelated journey must not nullify relevant ones.

**Root cause and escape.** Reclaim used an unsupported routing vocabulary. The framework silently tolerated that field, provided no per-journey applicability proof, and accepted an aggregate NA rationale. Overbroad selection made the gate noisy; bulk exemption removed its product-level coverage. The prose acknowledges unrun journeys, so this is not a fabricated runtime-pass claim. It is a failure of the completion signal to preserve that distinction.

**Layers/confidence.** Integration defect CONFIRMED; reusable schema-validation/NA-semantics weakness CONFIRMED at pinned upstream. Historical association supported by exact closure rationale; no claim of installed code identity.

**Prevention.** Reclaim: normalize journey routing to supported selectors and own an explicit node/acceptance mapping. Shared framework: reject unknown routing keys or support versioned node selectors; separate per-journey non-applicability from approved waiver; recompute required IDs when recording new events while retaining frozen sets for replay. Produce selector diagnostics showing why each journey applies. Regression fixtures: unrelated deletion journey excluded from volume work; strength generation retained; GPX retained for native run work; blanket NA cannot satisfy either.

## F3 — Specialist independence and challenge were not evidenced in the ledger

**Observed.** `reproduction.json` counts all 524 ledger events: 56 `node.verification` events, all `journeys` (52 NA, 4 pass); no referent/rendered/behavioral verification events, no independence fields, and no `node.stage` event. All events say `gov-001`, but `scripts/eif_node.py` hardcodes that actor, so the actor count is NOT proof that one person/model did all work. Run logs sampled are event receipts, not specialist transcripts. Several baseline reports honestly say same-session or same-writer verification, including N0044_DELETE_INVENTORY, N0045_SCHEMA_DRIFT, N0051_STAGE1_REVIEW, N0065_INSIGHT_COPY_REVIEW and N0067_CATEGORY_HEADINGS. N-0013 completed at seq 32 on an empirical harness baseline (EV-0006) showing identical weeks, low seed share and identical goal rankings; that receipt is not an independent scientific verdict.

**Expected.** The actual framework already requires discovery, product, architecture and QA for new features; product, architecture and product-red-team critique for an audit; meaningful challenge and integrated verification. GOV-008's independence ladder distinguishes self-check, fresh-session review and separate-model review. Universal Contract sections 3.2A and 3.4 require primary evidence, challenge of requirements and risk-scaled alternatives. Volume 25 specifically prohibits documentation harvests and requires test-intent classification. These are existing capabilities, not new ideas this audit needs to invent.

**Root cause and escape.** Historical records preserve implementation and test counts far better than specialist brief/input/output/decision provenance. The one-writer mandate was explicitly used in N0044 as a reason for same-session review; one writer does not inherently prevent a read-only independent reviewer, although availability then is uncertain. Upstream `gates_ok` checks a referent verification state only at R3+; `h_verification` stores independence but the gate does not inspect it. Neither the shown gate nor the local wrapper enforces specialist invocation receipts or an actual challenger. A label such as verification-controller cannot provide the missing separation.

**Layers/confidence.** Verification and orchestration limitation CONFIRMED in cited reports. Completeness of all past specialist invocation history is UNKNOWN; no assertion that no specialists ever ran. Shared framework has a confirmed enforcement gap between normative independence and inspected completion checks. R2 allows explicitly limited self-verification when another session is unavailable; its mere use is not automatically a violation.

**Prevention.** Record each material role's actual executor/session/model when exposed, input artifact hashes, task brief, output, disagreements and disposition. Where independence is unavailable, keep the limitation in the completion/release view. Require programme-quality domain review separate from implementer tests. Use blind or adversarial cases; do not count multiple role headings in one response as independent review.

## F4 — Runtime safety was declared but not measured in the active environment

**Observed.** Project instructions intentionally leave Cursor hooks off. `.eif/RUNTIME_CAPABILITIES.md` is `status: unverified`, with null runtime version, observation time, probe ID and result; it correctly distinguishes unavailable process containment from configured file guards. `.eif/MODEL_CAPABILITIES.md` is a stub. This turn is Codex rather than the report's configured Cursor mode. No active-mode EIF enforcement claim can be derived from those artifacts. The platform sandbox remains a distinct real control; inactive EIF hooks do not imply all controls are absent.

**Expected/root cause.** GOV-009 already requires exact-mode observed outcomes before claiming enforcement and explicitly disallows treating configuration as proof. The missing measurement is an integration/operational assurance limitation, not evidence that hook logic is defective. Hooks guard actions, not scientific programme correctness, so turning them on would not cure training logic.

**Prevention.** Before raising autonomy, separately authorize and run same-mode capability probes, pin source revision and hashes, classify each surface as enforced/advisory/unavailable, and report changes that invalidate a measurement. Keep hooks off during this audit per instruction. Do not reopen runtime internals or install changes as part of Phase 1.

## F5 — Public gate contract and acceptance interface are weaker than their names suggest

**Observed.** N0053_WRAPPER_GATES and LEDGER_PENDING record QUALITY_GATE rejection and public-help schema failures; failed probes were retained and were not claimed as success. Pinned upstream CLI exposes generic `event TYPE --payload` without enumerated event payload help. SCHEMA documents structures but is not an executable client contract. The local wrapper's `cmd_complete` automatically emits `node.accept` when pending, then `node.status complete`; `--commit` is used in the summary, not to validate required evidence or a pushed commit. `cmd_await_approval` emits a stage note and checks only that a directory contains something; it is not a structured pending operator-approval state. These conveniences depend on caller discipline for their stronger English meanings.

**Expected/root cause.** The system should make supported truthful actions straightforward and bind approval evidence to approval-dependent state. A protected implementation with insufficient public payload documentation blocked honest completion for weeks. Later broader NA closure solved bookkeeping, not the missing evidence contract. Auto-accept can be legitimately called after approval, but cannot itself prove approval.

**Layers/confidence.** Shared public-interface weakness + Reclaim wrapper/integration semantics CONFIRMED. No claim that approvals were unauthorized; only that the code cannot authenticate them or enforce the stated pushed-commit requirement.

**Prevention.** Reusable typed public commands/schemas for evidence, review, waiver and approval; wrapper contract tests against supported framework versions; separate `accept` from `complete` where operator authority is required; bind commit/tree/criterion version and evidence referents. Rejection must preserve pending work and give actionable diagnostics. Use fixtures for stale hashes, nonexistent artifacts, missing push, empty render directories and partial acceptance.

## What worked and must be retained

- The canonical wrapper preserves failure receipts and optimistic revisions rather than silently discarding failures. QUALITY_GATE and DERIVED_COMPLETE rejections are in historical evidence.
- Source harnesses and controlled measurements found real defects; N-0020 explicitly exposed inflated display counting rather than hiding it, and N-0013's baseline identified non-personalization symptoms.
- Narrow scientific scope was respected when rules were missing: N-0011 and N-0023 did not silently invent constants. The failure was lack of adjudication and later completion, not that refusal.
- Several reviews found new defects (e.g. account-switch cleanup race N-0058); same-agent review can be useful while remaining limited.
- Device limitations and same-agent verification were often recorded clearly. Existing history/session invariants, visible-change queues and no-production-deployment boundaries remain valuable.

## Required roles and actual historical evidence

| Responsibility | Contract capability | Evidence found / limit |
|---|---|---|
| Executive orchestration | route, stage, adjudicate and carry scope | Nodes, dependencies, leases and blockers exist; no stage events; wrapper actor obscures individual identity |
| Product/domain | challenge user job, define business rules and accepted outcomes | Charter exists; missing volume/wave semantics acknowledged; distinct training-domain review receipt not established |
| Architecture/algorithm | alternatives, boundaries and rule correctness | Routine audit documents real path/taxonomy flaws; independent executor and brief not established |
| QA/programme acceptance | risk strategy, tests of acceptance and integrated behavior | Many executable tests and 100-scenario measurements; acceptance substitutes and explicitly incomplete runtime journeys |
| Independent challenge | fresh-context/model ladder where available | Several honest self-review records; no ledger separation receipt; unknown broader chat history |
| Runtime safety | observed exact-mode probes | Local report unverified; hooks intentionally off; no active EIF enforcement claim |
| Decision/knowledge stewardship | preserve resolved decisions and update current truth | Durable contradictions exist; completion views failed to carry their unresolved semantic implications |

## Proposed recovery, ownership and acceptance

1. **Reclaim specification/orchestration, P0:** freeze a requirement register for training outcomes, distinguish evidence-backed claims from heuristics, and resolve N-0011/23/24 contradictions as explicit decisions. Domain/product owner plus independent challenge; no constants adopted merely because they appear in old code. Acceptance: every proposed training rule has scope, unit, population, evidence class, implementation authority and a falsifiable acceptance oracle.
2. **Reclaim integration, P0:** create a criterion/evidence/waiver matrix and correct journey applicability. Preserve historical records rather than rewriting them as retroactive passes. Acceptance: current completion view shows unverified and waived outcomes separately; relevant generated/persisted/Android programme journeys remain required.
3. **Reclaim verification, P0:** programme-level representative/adversarial matrix with target-setting review independent of generator code. Include cold starts, history-rich users, constrained equipment/time, recovery/return-to-training, no eligible candidate, session persistence and started-session immutability. Acceptance: bad programmes can fail even when generator unit snapshots are green; failures trace to input and rule versions.
4. **Briefing/orchestration, P0:** explicitly separate one integration writer from independent reviewers; specify decision ownership, briefing hashes and challenge disposition; stop semantic acceptance until unresolved findings are adjudicated. Acceptance: a replayable receipt shows what each actual reviewer received, disputed, and changed.
5. **Shared EIF proposal, P1, SEPARATE AUTHORITY:** versioned selector schema, specific waiver semantics, typed public event interface, review/approval provenance and evidence binding. First add reproductions to an isolated framework branch after separate approval, then implement and run host compatibility fixtures. Do not change shared EIF on the strength of Reclaim approval.
6. **Runtime capability work, P1, separately scoped:** pin installed source provenance and measure current-mode controls before stronger autonomy. Acceptance: report is reproducible and expressly limited to tested mode/surfaces; no scientific validity claim from hook coverage.

The material trade-off is stricter semantic gates versus workflow friction. Prefer a small set of high-value per-criterion and per-journey checks, with explicit operator waivers, rather than a mandatory full specialist ceremony for every minor edit. Retain broad scientific and architectural challenge for programme-level changes.

## Consultation discovery and remaining uncertainty

Historical N0067_CATEGORY_HEADINGS (September 29) says no operational consult route existed and no call occurred. This audit's tool inventory contains no consultation MCP. Current read-only discovery finds Claude Code **2.1.295**, authenticated (`loggedIn: true`, `authMethod: claude.ai`, `apiProvider: firstParty`, `subscriptionType: pro`). No credentials were read or copied. CLI supports noninteractive model selection, disabled tools, safe mode, no session persistence and JSON receipts. This route was reported to the parent before any prompt submission; this agent has made no consultation call. The consolidated consultation receipt must state the actual model/session and limitations after the parent runs it.

Unresolved: exact installed programme-engine source revision; original operator chat scope for October 5 waivers; any historical specialist transcripts outside inspected repository records; current runtime scientific validity (owned by the other audit streams). The reproducer executes only selected pure functions from the pinned upstream copy, not installed runtime or production data. It is mechanism evidence, not an end-to-end framework certification.
