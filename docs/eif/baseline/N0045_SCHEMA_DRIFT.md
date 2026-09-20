# N-0045 deletion schema source of truth

The live PostgreSQL catalog is authoritative for table keys and FK actions. `scripts/user_keyed_tables.sql` selects public base/partitioned tables with `user_id` or a column referencing `auth.users`, plus all their outgoing FK column mappings and delete rules. It selects no customer data.

`scripts/refresh_user_keyed_tables.py` uses the authenticated Supabase CLI pinned to Reclaim project `bgtosdgrvjwlpqxqjvdf`; `--check` performs a read-only drift comparison. The checked-in snapshot is metadata evidence, not a hand-built guess from migration files. Its query hash changes if extraction semantics change.

Deletion remains the existing Edge Function authority. Tests compare the actual handler's inventory with the snapshot, check restrictive FK order and exercise request/auth/delete failure behavior with fake boundary clients. The post-deletion verifier must fail on unknown counts or missing snapshot tables and must prove that the auth user is absent.

Live account removal remains the separate N-0047 journey. No real user is modified by refresh or drift tests. N-0044 source prerequisite is pushed; its ledger completion is blocked only by the public EIF gate payload contract (N-0053). The runtime admitted the N-0045 lease.

## Executed evidence

- Live refresh: 26 public user-keyed tables; subsequent `--check` unchanged. Both routine auth FKs and suggestion-to-template FK are NO ACTION.
- Focused inventory/schema/handler/verifier tests: 25/25. Actual handler tests prove all tables precede auth deletion, FK-table errors stop deletion, an invalid token cannot delete, and request-body user IDs are ignored.
- Full verbose Vitest with the recorded 30-second workaround: 134 files / 824 tests PASS (113.05 s); typecheck 0; dual-path 27/27; catalogue 357 rows / zero governance issues.
- CLI without verification credentials exits without querying or deleting; all 26 required keys are enumerated. It is not a live zero-row proof.
- Review: VERIFIED_WITH_LIMITATIONS, same-session source/evidence review. No independent agent or live account deletion claimed. Broad server message-based error skipping is chartered as N-0055; the new verifier itself fails closed.
