# N-0064 — rendered medication coach re-check

UNABLE_TO_VERIFY: the bounded 2026-09-28 checks recorded under N-0062 show no
attached ADB device and no reachable Metro on 8081. Do not repeat recovery loops.

When the canonical Expo session is available, open Medications in the retained
account. Without adding, editing, deleting or logging medications/doses, confirm
the existing medications remain visible and no first-medication coaching appears.
Compare locally against `.eif/audit/N-0032/` (contains personal medication data;
do not commit those screenshots). Save redacted after evidence under
`.eif/audit/N-0064/`. Check accessibility traversal has no hidden Show me/Dismiss
coach controls when the card is absent.

On an approved empty throwaway account, confirm the coach appears after loading,
Show me navigates to the existing add form, and dismissal still works. Do not
empty an existing account to manufacture this test. Loading/read-error states
must not claim there are zero medications. Component tests cover these states;
the AVD journey is still outstanding.
