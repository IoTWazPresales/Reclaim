# N-0019 / N-0063 — live app_logs anonymous SELECT exposure

Linked metadata confirms anon SELECT privilege and a PUBLIC permissive policy
allowing `auth.uid() IS NULL`. This allows anonymous reads regardless of row owner.
No log contents were read. RLS enabled and zero advisor ERROR are not proof of
safe access here. **Release blocked until the live policy is corrected.**

N-0063 owns a narrow migration plus repair of the checked-in unsafe SQL recipe.
Live deployment needs the explicit approval required by AGENTS section 8 for this
additional, non-Stage-1 migration. Preserve anonymous insert if still required;
remove anonymous read access without widening other roles. Prove with rollback-only
synthetic anon/two-user probes and re-run scripts/inspect_sleep_log_rls.sql.
Operator should assess prior exposure/audit logs without assuming a breach.
