# N-0057 public moddatetime warning

**Date:** 2026-10-02
**Project:** `bgtosdgrvjwlpqxqjvdf`
**Result:** catalog read. No trigger was changed.

| Object | Live value |
|---|---|
| Extension | `moddatetime` 1.0 in schema `public` |
| Function | `public.moddatetime()`, no arguments, `security_definer` false |
| Trigger | `public.profiles.set_profiles_updated_at`, BEFORE UPDATE, `EXECUTE FUNCTION moddatetime('updated_at')` |

That is the only trigger whose action calls `moddatetime`. The security advisor still reports WARN `extension_in_public` for this extension, plus the existing leaked-password-protection WARN. There is no advisor ERROR. Keep the extension where it is until a migration moves the function and recreates the profiles trigger together. Do not drop it.

The 2026-10-01 attempt below did not return. The pooler path still times out. This read used the Management API.

**Date:** 2026-10-01  
**Project:** `bgtosdgrvjwlpqxqjvdf`  
**Result:** live catalog was not read. No trigger was changed.

One read-only query, `scripts/inspect_moddatetime.sql`, was sent with
`npx supabase db query --linked` and a 90-second limit. The CLI did not return
extension, function, or trigger rows. The process was still running after 125
seconds and was stopped. This is the same pooler timeout class as the unapplied
run-route migration. The query was not repeated. A later authorized database attempt applied the
app_logs file instead, and that attempt also timed out. This catalog query
was not sent again.

The repo has no `moddatetime` string in SQL. Exposure, dependents, and whether
to keep or move the extension stay unknown until that catalog query returns.
Do not drop or recreate triggers from this note.

This warning stays separate from the zero-ERROR advisor criterion in N-0051.
Relocation, if the catalog later shows dependents, is a live schema change and
goes through HUMAN_CHECKS before anyone applies it.
