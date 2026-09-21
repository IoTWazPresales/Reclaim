# Stage 1 security migrations

These narrow, idempotent migrations were introduced after the legacy schema in
`app/Documentation/*.sql`. Do not bulk-push the legacy schema or assume a complete
CLI migration-history baseline. Apply one reviewed file at a time from `app/`:

```powershell
npx --yes supabase db query --linked --project-ref bgtosdgrvjwlpqxqjvdf --file supabase/migrations/20260921090000_program_views_security_invoker.sql -o json
npx --yes supabase db query --linked --project-ref bgtosdgrvjwlpqxqjvdf --file ../scripts/verify_program_view_rls.sql -o json
```

The second command creates random synthetic fixtures in a rollback-only transaction.
Applied-state evidence and source gates live in `docs/eif/baseline/N0048_VIEW_SECURITY.md`.
Application through `db query` does not claim that `supabase_migrations` history was
baselined. Do not undo security fixes by restoring unsafe grants/options as a routine rollback.
