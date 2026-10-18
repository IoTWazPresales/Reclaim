# R02 correction source checkpoint

This commit corrects the running preview contract; it does not accept or complete N-0070. The original failed review is preserved in ../provenance-20261018/ and is superseded only after fresh committed-source review.

Precommit isolated checks: focused 42/42; typecheck zero errors; dual-path 31/31; catalogue 357 rows / zero governance issues; public-wrapper pytest 14/14. Required full verbose suite completed: 200 files, 1,385 passed / four failed (exit 1). The four assertion identities exactly match the established R11 baseline: routineVolumeMeasurement seed count, runSession migration link, and the two weeklyVolumeModel cap assertions. This remains a failing full-suite gate, not a waiver or clean-node validation. Logs and exact committed fingerprints follow in the supplemental review checkpoint.

No Android render was possible: no ADB device and localhost Metro TCP refused. Visual/operator approval remains pending; manual steps are in visual-steps.md. No live data, started sessions, policy, engine or planner was changed. Stop after R02 correction/provenance; no R12.
