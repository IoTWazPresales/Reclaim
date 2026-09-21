# N-0055 server deletion error classification

Source of truth: the live 26-table snapshot from N-0045 and the service-role
inventory in `personalDataTables.ts`. All snapshot tables are required, including
vitals_daily. Only future run_routes and run_sessions may be absent this cycle.
Error messages are not a schema contract: a missing column or permission failure
must stop before auth removal. Use structured 42P01/PGRST205 relation-not-found
codes only for explicitly optional tables. Preserve the deployed first-five order.

Route: backend implementation, test-engineering actual-handler tests, verification
review, documentation steward. Deploy through the linked Supabase CLI after gates;
retain verify_jwt=true. No customer account is deleted as part of deployment.

## Executed source gates

59 focused inventory/actual-handler/verifier tests pass. Includes every required
snapshot table failing closed; optional missing columns, FK errors, permission
errors, connection failures and misleading messages all stop before auth removal.
Full verbose Vitest: 137 files / 878 tests PASS (137.95 s, recorded 30-second timeout
workaround). Typecheck 0; dual-path 27/27; catalogue 357 / zero issues; live snapshot
check unchanged at 26 tables.

## Deployment

`npx --yes supabase functions deploy delete-account --project-ref bgtosdgrvjwlpqxqjvdf --use-api`
succeeded after all source gates. CLI `functions list` independently confirms
**version 2, ACTIVE, verify_jwt=true**. Only delete-account was deployed; no prune
and no customer-data mutation. Live deletion journey remains blocked N-0047.
Same-session source review: no changes to inventory order, user scoping, auth
verification, or successful response shape. Ledger gate closure still awaits N-0053.
