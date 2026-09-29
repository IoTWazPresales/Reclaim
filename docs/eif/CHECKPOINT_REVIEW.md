# Reclaim checkpoint review - 2026-09-28

This is an interim continuation report, **not FINAL_REVIEW or release approval**.
Authoritative status: `PROGRESS.md` plus `python scripts/eif_node.py status`.
Branch: `fix/training-confident-ux`; programme: `PRG-20260917T222550`.

Checkpoint closed 2026-09-29. N-0065 gates: focused 34/34, types zero errors,
Git Bash audit 27/27, catalogue 357/0, wrapper 3/3. Default full run had three
5-second timeouts (950/953); the one 30-second-allowance retry passed all 150 files /
953 tests. N-0052 default-run reliability remains unresolved. No new runtime check
on September 29; the no-device/Metro observation below is from September 28.

## What this checkpoint changes

N-0065 reviews all 89 static insight records. It revises 242 fields in 84 records,
limited to message, action and why. Five records retain their existing copy.
Field-by-field reasons: `baseline/N0065_FIELD_FINDINGS.md`; source evidence and
gates: `baseline/N0065_INSIGHT_COPY_REVIEW.md`. The commit diff against `f4eb34e`
contains the complete before/after wording.

- Mood and social prompts describe logged observations, not hidden depletion,
  isolation, brain chemistry or a proven personal cause.
- Sleep prompts no longer infer a body-clock disorder, impairment or a treatment
  plan from duration/timing estimates alone.
- Training prompts no longer prescribe load changes or activity increases from
  sparse mood/sleep/session records.
- Medication prompts distinguish missing records from missed doses and refer
  timing questions to medicine-specific instructions or a pharmacist.
- Crisis-support copy retains support and explicitly scopes 988 to the US and
  its territories.
- All conditions, thresholds, source tags, IDs and action routes are unchanged.
  No catalogue metadata, native code, permissions or medication records changed.

N-0067 is a newly chartered follow-up, not an implemented fix: internal source tags
still become category headings such as Sleep Serotonin. Optional chemistry/chip
semantics remain for N-0035. N-0065 is not a whole-screen clinical certification.

## Work already implemented - do not redo

These groups have source/evidence checkpoints; they are not all ledger-complete
or approved to ship. Exact commits and evidence IDs are in PROGRESS.md.

| Area | Existing work | Still needed |
|---|---|---|
| Plan authority / baseline | Old parallel scheduler retired; routine audit and detection harness; N-0002/03/12/13 | Historical EIF gates N-0054; planned F1-F6 work below |
| Onboarding / loading | Retry-safe onboarding N-0005; training query truth N-0007 | Actual onboarding, login/retry and training journeys |
| Health Connect | Permission set and declared=requested=used checks N-0015/36 | Device sync, calories and running extensions |
| Account/privacy | Service-role deletion inventory, 26-table schema snapshot/drift guards, account vs data reset, strict error handling, account-switch race guards N-0014/37/44-46/55/58 | N-0047 verified throwaway end-to-end erasure; final visual review and EIF gates |
| Database security | View invoker, function grant/search-path migrations N-0048/49/50; prior advisors zero ERROR | N-0063 app_logs policy exposure, N-0057 moddatetime warning, fresh final advisors |
| Guided state | Canonical set path retained, stale timer display N-0016, serialized intent writes/conditional delivery acknowledgement N-0060 | Native transport, cancellation and timer producer races; watch/Doze journeys |
| Mood | Duplicate-save guard N-0018; correct post-save feedback and draft preservation N-0062 | Runtime failure/retry and large-text checks |
| Medications | Reviewed-only curation tier N-0032; truthful empty-state coach N-0064 | Rendered/logging journey; all 357 catalogue rows still honestly unreviewed |
| Copy / telemetry / hygiene | N-0027 U5 events; N-0028 association language; N-0029 LF and fail-closed audit; N-0038 dev-only Design Lab; N-0065 static-copy review | Live/event and visual checks, legacy WSL criterion, remaining hygiene |
| First render | N-0026 notification permission moved off first render | Actual Reclaim cold-start before/after measurement, not Expo-launcher timing |

## Outstanding work in execution order

1. **Wave 2 findings and release blockers:** N-0067 neutral category headings;
   N-0061 replace prohibited background-actions guided transport with the one
   native FGS, then N-0017 foreground storm/watch-alive and N-0059 cancellation
   authority; N-0066 rest-timer promotion/dismissal race alongside N-0060's native
   verification. N-0063 closes live anonymous app_logs SELECT exposure with an
   authorized migration and synthetic isolation probes. N-0052 test-runner
   reproducibility remains open despite recent green runs. No wave closure yet.
2. **Previously implemented nodes needing acceptance:** N-0007/16/18/26/27/28/29/32,
   N-0044/45/46/48/49/50/55/58/60/62/64/65. Do not rewrite their implementations
   merely because the ledger says in_progress. Use their evidence and queues.
3. **EIF governance:** N-0053 public quality/verification/blocker payload contract
   is missing; do not guess schemas or inspect runtime internals. N-0054 reconciles
   historical gate debt (including N-0001 deriving ready). N-0056's old environment
   blocker is stale in the ledger, not proof that the canonical app cannot render.
4. **Runtime / security closeout:** N-0047 verified disposable email and complete
   five-domain account-erasure journey; N-0051 combined review; N-0057 extension
   warning; N-0010 current native-client proof and N-0025 guided rest/Doze/FGS.
   All relevant JOURNEYS.yaml paths and visual approvals remain required.
5. **Wave 3 routine F1-F6:** N-0020 -> N-0021 -> N-0022 -> N-0011 -> N-0023 -> N-0024.
   Taxonomy, one day-session builder, experience/load model, weekly volume/caps,
   four-week progression/deload and enforcing CI. New builds only; started/guided
   prescriptions remain frozen.
6. **Insets and visual correctness:** N-0008/09; both gesture and three-button
   navigation, including medication sheet, Auth and training double insets.
7. **Calories / modes / running:** N-0039 post-session calorie reread/provenance;
   N-0041 cited running design; N-0040 Strength/Running/Hybrid; N-0042 GPS smoothing,
   auto-pause, one location-capable FGS, reconciled cues, HC session/route writes,
   Supabase privacy/RLS/deletion coverage and GPX acceptance. N-0043 Wear proposal
   only. This is substantial feature work, not just final testing.
8. **Features:** N-0033 why-this-session within existing UI (latest operator scope;
   do not unpark chrome), N-0035 association chips, N-0034 exercise illustrations
   with official Everkinetic licence verification, movement audit and attribution.
9. **Remaining hygiene / human checks:** stale docs and Zustand-removal scope,
   phone/watch calorie sync, OEM liveness, leaked-password dashboard toggle and
   Play declarations. Follow HUMAN_CHECKS, not a blanket acceptance waiver.
10. **Final release:** all gates/journeys and fresh advisors; 1.0.6 / versionCode 16;
    one preview EAS build if authenticated; actual FINAL_REVIEW with screenshot
    paths, consolidated queues/proposals; frontier complete or explained.

N-0004 remains rejected, N-0030 deferred/parked, N-0031 split. Do not implement
parked production chrome or a Wear companion beyond the proposal. No final build
or version bump was started at this checkpoint; current app remains 1.0.5/vc15.

## Why the emulator is not currently verifying journeys

The canonical workflow **has rendered successfully**, confirmed by the operator
and retained Home/Settings/deletion-confirmation evidence. Earlier manually
installed APK timeout/class exceptions are historical. Initial automatic launch
can be unreliable; keeping Metro alive and pressing `a` recovered it.

The current bounded checks returned **no attached ADB device** and **unreachable
Metro on port 8081**. No current deeper defect is proven. We did not restart,
reinstall, clear data or alter networking. A running canonical session is needed
for remaining visual/runtime acceptance. N-0047 separately needs a verified
operator-controlled throwaway mailbox; startup alone cannot pass that journey.

## Why this has taken longer than a finishing pass

The programme includes substantial new routine/running features, not only repairs.
Reviews found separate notification races, a prohibited service transport, live
RLS exposure and unsafe insight certainty. Those findings became nodes instead
of being silently ignored. Runtime sessions have been intermittent, and EIF's
missing public gate contract prevents truthful ledger closure even for validated
source changes. Full harnesses are deliberately rerun per source node.

It would be misleading to call this nearly release-ready or give a completion
percentage from node counts: the unbuilt running work is much larger than a copy
node, while some in-progress nodes already have finished source implementations.

## Continuation

Next bounded source node: N-0067, then remaining wave-2 safety work. Read
`HANDOFF_CURSOR.md` for a minimal catch-up prompt and editor/model guidance.
No full discovery restart, editor switch, or environment reinstall is necessary
to preserve the work. Account usage percentage is not exposed to this agent;
committed/pushed node boundaries are the reliable recovery mechanism.
