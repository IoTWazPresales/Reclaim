# User-keyed deletion inventory

`user_keyed_tables.json` is generated from live catalog metadata for Reclaim project `bgtosdgrvjwlpqxqjvdf`. It contains public base/partitioned tables with a `user_id` column or any column referencing `auth.users`, their user-key columns, and all outgoing FK mappings/delete rules. It contains no user rows, tokens or credentials.

From the repository root, with an authenticated Supabase CLI:

```powershell
python scripts/refresh_user_keyed_tables.py
python scripts/refresh_user_keyed_tables.py --check
```

Refresh after every schema migration affecting personal data. Review the generated diff and rerun `accountDeletionSchema.test.ts` and `accountDeletionVerification.test.ts`. Any newly uncovered key must gain server deletion coverage before release. Client DELETE eligibility remains a separate RLS decision.

For a deliberately created throwaway account only, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DELETED_USER_ID` in the process environment, then from `app/` run `npx tsx scripts/verify-account-deletion.ts`. This command reads counts and auth-user existence; it never deletes anything. Exit 0 requires exact zero counts for every snapshot/canonical required key and a confirmed `user_not_found` auth response. Known snapshot tables cannot be silently skipped. Missing reserved optional tables not present in the snapshot may be skipped explicitly.

Snapshot provenance is the CLI metadata query and its SHA-256, not a claim that the AVD deletion journey passed. The live end-to-end journey is N-0047.
