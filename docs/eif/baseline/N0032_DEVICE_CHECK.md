# N-0032 medication catalogue label — UNABLE_TO_VERIFY on AVD

N-0056 remains the documented EOF/ANR blocker after the prescribed cold restart
and timed Reload attempt; see N0046_DEVICE_CHECK.md. No product render is claimed.

After recovery, open a matched scheduled medication: show Catalogue reference
(not reviewed), not a reviewed/curated claim. Confirm its existing educational
text, reminders and dose history remain available. Check an unmatched medication
still says Tracking only, and PRN still says As needed (PRN). Check the education
section's review label, including PRN, with TalkBack and large text. Record renders
under `.eif/audit/N-0032/` and meds-log journey evidence under `.eif/audit/wave-2/`.

All 357 production rows currently lack explicit review records; none was promoted.
Future reviewed records must contain a real reviewer, non-future UTC YYYY-MM-DD
reviewedOn and an evidenceRef to the actual review artifact. Synthetic test
metadata is never production provenance. This is content review, not certification.
