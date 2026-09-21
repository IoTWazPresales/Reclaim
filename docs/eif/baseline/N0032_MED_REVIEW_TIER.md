# N-0032 medication review metadata

Source of truth is explicit static catalogue curation metadata, not confidence,
sourceNote, mechanism length, or a matching name. Existing rows have no review
records; none will be promoted or assigned invented reviewer provenance.

Keep exact-name matching and all 357 rows/content unchanged. Distinguish matched
unreviewed references from reviewed references in profile and education labels.
PRN tracking remains independent. A reviewed tier requires a named reviewer,
valid review date and evidence reference; malformed metadata fails closed and is
reported by catalogue governance. The metadata documents a content review, not
clinical certification or a claim about this user's medication effects.

## Executed verification — 2026-09-21

29 focused checks plus 2 rendered education-label tests PASS. Full verbose suite
**145 files / 918 tests PASS**, 126.03 seconds, with the existing 30-second timeout
workaround (N-0052 remains open). Typecheck 0; Git Bash dual-path 27/27; catalogue
357 rows / zero issues; wrapper 14/14. Logs local in `.eif/audit/N0032-*.txt`.

Same-agent verification reviewed all profile/education consumers, malformed and
future review metadata, PRN independence and preservation of existing content.
No independent-person or AVD verification is claimed. `CATALOG_REVIEW_POLICY.md`
explains that metadata checks do not authenticate the reviewer/artifact or certify
clinical correctness. Visual/large-text/TalkBack review remains queued under N-0056.
