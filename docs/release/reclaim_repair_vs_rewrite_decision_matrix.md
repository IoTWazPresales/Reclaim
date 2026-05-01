# Reclaim Repair vs Rewrite Decision Matrix

Date: 2026-04-24

## Decision legend

- TARGETED REPAIR: bounded fixes, no major contract redesign
- FOCUSED RE-ARCHITECTURE: retain subsystem, redesign authority/contracts
- SUBSYSTEM REWRITE: current design cannot be trusted incrementally

## Matrix

### 1) Guided training runtime + action progression
- Current trust level: Low
- Root problems:
  - split cursor authorities
  - external action path not equivalent to in-app completion path
  - runtime resume source mismatch (`performed` vs full set-log truth)
- Repairable: Yes
- Recommendation: **FOCUSED RE-ARCHITECTURE**
- Why: core runtime module is viable, but authority contract is fragmented.
- Launch consequence if unfixed: critical guided-session credibility failure.

### 2) Notification scheduling/reconcile/action consumption
- Current trust level: Low
- Root problems:
  - mixed authority (intent-reconcile and direct schedulers)
  - inconsistent logicalKey contract
  - replay lifecycle gaps for first-set and other action chains
- Repairable: Yes
- Recommendation: **FOCUSED RE-ARCHITECTURE**
- Why: scheduler core exists and is robust enough to keep; contract unification needed.
- Launch consequence if unfixed: reminders/guided flows remain unpredictable.

### 3) Sync freshness/invalidation contract
- Current trust level: Medium-low
- Root problems:
  - call-site owned refresh with no guaranteed post-sync policy
  - dashboard over-centralization for freshness
- Repairable: Yes
- Recommendation: **FOCUSED RE-ARCHITECTURE**
- Why: no need to rewrite sync engine; need explicit contract and shared helper path.
- Launch consequence if unfixed: stale data and tile incoherence continue.

### 4) Dashboard tile hydration/coherence
- Current trust level: Medium-low
- Root problems:
  - dependent on fragmented freshness triggers
  - daily signal scheduling churn tied to insight identity volatility
- Repairable: Yes
- Recommendation: **TARGETED REPAIR + freshness contract alignment**
- Why: tile rendering itself is not fundamentally broken; orchestration inputs are.
- Launch consequence if unfixed: persistent perceived quality/reliability issues.

### 5) Recovery progression system
- Current trust level: Low
- Root problems:
  - progression mutators not wired to completion events
  - displayed progress computed separately from persisted stage/week
- Repairable: Yes
- Recommendation: **TARGETED REPAIR**
- Why: storage API exists; missing wiring and authority alignment are bounded.
- Launch consequence if unfixed: week/stage journey is not trustworthy.

### 6) Training setup preview + program generation trust
- Current trust level: Medium
- Root problems:
  - preview/runtime constraint mapping mismatch
  - no special semantics for exercises like 21s
- Repairable: Yes
- Recommendation: **TARGETED REPAIR**
- Why: planner/engine base is usable; trust defects are specific and fixable.
- Launch consequence if unfixed: user trust loss from contradictory setup outputs.

### 7) Weight increment behavior across training surfaces
- Current trust level: Medium-low
- Root problems:
  - inconsistent step logic across components (`SetFocusCard` vs `ExerciseCard`)
- Repairable: Yes
- Recommendation: **TARGETED REPAIR**
- Why: localized UI logic divergence.
- Launch consequence if unfixed: continued perception of training math unreliability.

### 8) Sleep enrichment surfacing + mood linkage
- Current trust level: Medium-low
- Root problems:
  - persistence/read timing mismatch for enriched sleep fields
  - heuristic linkage sensitivity to sparse/lagged data
- Repairable: Yes
- Recommendation: **TARGETED REPAIR + instrumentation**
- Why: likely contract/persistence gaps, not architectural dead-end.
- Launch consequence if unfixed: inconsistent explanations and weak confidence in insights.

## Subsystems likely needing rewrite

- **None currently require full rewrite based on available evidence.**

## Subsystems fundamentally untrustworthy today

- Guided training notification-driven progression and notification authority consistency are currently untrustworthy for launch without re-architecture-level contract cleanup.

## Not fully verified

- Device-side branch frequency for each replay/staleness edge across OEM environments.
