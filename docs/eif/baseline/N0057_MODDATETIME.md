# N-0057 public moddatetime warning

**Date:** 2026-10-01  
**Project:** `bgtosdgrvjwlpqxqjvdf`  
**Result:** live catalog was not read. No trigger was changed.

One read-only query, `scripts/inspect_moddatetime.sql`, was sent with
`npx supabase db query --linked` and a 90-second limit. The CLI did not return
extension, function, or trigger rows. The process was still running after 125
seconds and was stopped. This is the same pooler timeout class as the unapplied
run-route migration. The query was not repeated.

The repo has no `moddatetime` string in SQL. Exposure, dependents, and whether
to keep or move the extension stay unknown until that catalog query returns.
Do not drop or recreate triggers from this note.

This warning stays separate from the zero-ERROR advisor criterion in N-0051.
Relocation, if the catalog later shows dependents, is a live schema change and
goes through HUMAN_CHECKS before anyone applies it.
