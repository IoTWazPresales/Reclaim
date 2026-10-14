# R06 — Qualified performance history and progression inputs

**Type:** data/algorithm integration task. **Depends on:** R02's normalized profile contract; coordinate with committed R04 engine interface before changing it. **EIF:** N-0070. **Current tree:** `api.ts`, `trainingProgramPerformanceSeed.ts`, `progression.ts`, `types.ts` and new `progressionEvidence.test.ts` have uncommitted edits. Focused 18/18 progression tests were run before later changes; do not treat that as current validation.

**Objective and scope.** Fetch history for relevant planned/candidate exercise IDs, preserve unavailable versus absent status, and qualify completed sets against canonical `training_session_items.performed.sets` and frozen plan context before proposing progression. Own history adapter/seed and progression input boundary; limit engine changes to integration with its committed contract.

**Why.** [Audit R7/R12](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md), [training T04/T05/T11](../../../../.eif/audit/training-intelligence-20261012/training/REPORT.md): fixed IDs miss selected work, retrieval failure looks like no history, improving reps count as stagnation, partial/mixed-load sets can qualify, and zero external kg can look like bodyweight.

**Required behavior and acceptance.** Record history source, status, completion, expected working-set count, exercise identity and comparable load units. Incomplete/skipped/unfinished/unavailable evidence cannot silently become qualified progress. Increasing reps below the top of the current range is not two stagnant sessions. Preserve existing numerical thresholds and baseline ceiling while D-P2-01 is unresolved; final explanation must match the *applied* prescription. Do not rewrite historical rows or introduce a new completion authority.

**Verification/evidence.** Tests use ended and in-progress sessions, partial/skipped working sets, missing log replica, retrieval error, exercise outside fixed seed, improving reps, mixed loads, external zero and bodyweight zero. Include a multi-session baseline+history example showing the still-pending ceiling decision clearly. Run focused/API tests then required AGENTS gates. Record source-to-decision evidence and an independent review; stage explicit paths, commit/push, keep N-0070 open for later integration.

**Exclusions/completion.** No new load increment/deload percentage, schema migration without approval, live DB writes, or Android claim. Complete when production history paths carry qualification to decision inputs and failure is explicit.
