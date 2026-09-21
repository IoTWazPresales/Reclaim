# Catalogue content-review provenance

N-0032 adds a review tier independently of exact-name matching and tracking mode.
All 357 existing catalogue rows lack a review record and remain unreviewed seeds.
No educational content, match aliases, confidence values or medication rows were
changed by this node. Confidence and sourceNote never imply a completed review.

To mark a future row reviewed, record `curation.tier = "reviewed"` and
`curation.review = { reviewer, reviewedOn, evidenceRef }`. Use the actual reviewer's
identifier, a valid non-future UTC YYYY-MM-DD date, and the real review artifact
reference. That artifact should identify the exact content reviewed, scope and
reviewer qualifications. Reset to seed when changing reviewed content until its
review is renewed; do not bulk-promote rows or copy synthetic test provenance.

The machine gate checks metadata completeness and date validity only. It does not
authenticate a reviewer, verify an external artifact, certify medical correctness
or replace human content review. Missing/malformed provenance cannot enable the
reviewed label; malformed explicit metadata also fails catalogue governance QA.

| Case | Profile label | Education section |
|---|---|---|
| Exact match, no valid review | Catalogue reference (not reviewed) | Same status; existing educational content remains |
| Exact match, documented review | Reviewed educational reference | Same reviewed status |
| No match | Tracking only | Existing no-match explanation |
| PRN | As needed (PRN) | Review status still shown separately if matched |

This is educational content review, not clinical certification or a conclusion
about a person's medication effects. Existing medical disclaimers remain intact.
