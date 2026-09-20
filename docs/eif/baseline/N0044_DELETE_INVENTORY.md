# N-0044 source of truth and verification

The operator reports deployed `delete-account` version 1 ACTIVE with JWT verification, with five entries preceding `training_post_session_checkins`: `routine_suggestions`, `routine_templates`, `insight_feedback`, `medication_logs`, `medication_schedules`. Suggestions must precede templates; the routine auth foreign keys use NO ACTION. `npx --yes supabase functions list --project-ref bgtosdgrvjwlpqxqjvdf` independently confirms ACTIVE/version 1/verify_jwt=true. The order and FK rationale are operator-provided evidence pending the separate live-schema snapshot.

The Edge Function is the server deletion authority. `personalDataTables.ts` is the contract inventory and defines client eligibility separately. The verification CLI now imports the complete service-role inventory rather than parsing selected subgroups, so future groups cannot silently disappear from verification.

Scope: repository alignment only. Schema snapshot, authenticated client teardown, live deletion and advisors are separate Stage 1 nodes. Existing fallback eligibility is preserved. No deployment or real account deletion is part of this node.

Verification: focused inventory contract tests 8/8; typecheck 0; full verbose Vitest 132 files / 807 tests PASS (248.93 s; configured threads with `--testTimeout=30000`, Metro stopped); Git Bash dual-path audit 27/27; catalogue QA 357 rows / 0 issues; wrapper pytest 3/3. Earlier environment failures and the timeout workaround are recorded under N-0052. Final log: `.eif/audit/N0044-vitest-final.txt`.

Review result: VERIFIED_WITH_LIMITATIONS. Inventory priority and client exclusion hold; no session/planner/notification authority changed. Same-session self-verification under verification-controller; no independent agent was used, per the one-writer instruction. Runtime account-deletion and auth absence remain N-0047 acceptance, not claimed here.
