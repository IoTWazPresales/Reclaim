# R11 — Android and persisted-programme reconciliation

**Type:** runtime acceptance task. **Depends on:** R10 and a working authorized emulator/test account. **EIF:** N-0071. **Current limit:** the last `adb devices` returned no device; the previous Phase 1 report explicitly marked current UI `UNABLE_TO_RENDER`.

**Objective and scope.** Compare one authorized saved-profile fixture with the generated weekly programme, stored plan/session items and Android views/guidance. Own test steps, screenshots/transcripts and read-only or throwaway-fixture verification; no product implementation by default. Use AGENTS §9's canonical emulator/Metro path and preserve existing app/account state. Do not clear data, reinstall historical APKs or start/end a real user's active session to create evidence.

**Why.** [Audit R5/R10 and verification limits](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md): source tests did not prove actual saved-plan or current-device presentation. The historical five-day programme is the required regression; determine its actual saved profile from authorized evidence rather than assuming the synthetic probe was a live account.

**Required behavior/acceptance.** Record profile revision, policy version, exact generated week, persisted programme/day and started-session snapshot, and corresponding setup/week/preview/session/summary pixels or accessibility text. Include a new-build versus frozen-started comparison and phone/notification/Wear/FGS guidance where equipment and authorization allow. No data mutation except a disposable test account/session expressly within authorized dev scope. A missing physical watch or live DB is a limitation, not a pass.

**Verification/EIF evidence.** Store bounded renders/structured observations in `.eif/audit/N-0071/` or `docs/training/recovery/evidence/` with commands, timestamps, build/version and redaction. Use `await-approval` for visible changes and `human-check` for inaccessible real-device/live checks, keeping node open where required. Independent reviewer compares output against R10 oracle and persisted authority. Commit/push only sanitized evidence and a truthful result.

**Exclusions/completion.** No production deployment, live user-data alteration, new UI redesign or historical screenshot substitution. Complete only after actual parity or an explicit `UNABLE_TO_VERIFY` queue entry; node acceptance must reflect that distinction.
