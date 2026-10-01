# Awaiting visual approval — PRG-20260917T222550

UI that changed what the user sees. **Do not treat these as shipped** until you reply with approve / reject per node. Production chrome redesign (N-0030) stays parked.

## N-0033 why this session

Home's training tile, and the workout action when training is next, name the
stored week and the stored day. A run day says today's plan is a run. A hybrid
day says a run is also on that day. An open session says it is already started.
A finished session says it is finished. A rest day says no session is on today's
plan. The chrome is unchanged.

**Renders:** UNABLE_TO_VERIFY. The emulator was not available on 2026-10-01.

**Approve?** N-0033

## N-0035 association chips

Opening **Why this?** on an insight shows chips for sleep, mood, and a training
session. The wording is "Associated with". Nerd mode is not required. Receptor
names are not the chip.

**Renders:** UNABLE_TO_VERIFY. The emulator was not available on 2026-09-30.

**Approve?** N-0035

## N-0034 technique figures

Exercise details now draws the stick figure from the exercise's first movement
intent. Glute-ham raise hinges. A carry stays upright. Bench dips extend the
elbows. Muscle-ups pull from overhead. The figure is still one pose per
movement, not a separate drawing for each exercise.

**Renders:** UNABLE_TO_VERIFY. The emulator was not available on 2026-09-30.

**Approve?** N-0034

## N-0042 run session

A running day opens a session whose header says **Run** instead of a set pill.
**Save home** stores the latest phone fix as the privacy point. Points within
200 m of that fix are left off the saved route. The cue is a run notification
with no set-Done action. Strength sessions do not ask for location.

**Renders:** UNABLE_TO_VERIFY. The emulator was not available on 2026-09-30.
Metro was not rebuilt and the app was not reinstalled.

**Approve?** N-0042

## N-0022 experience chips

Training setup, Constraints & Injuries, now shows Beginner, Intermediate, and
Advanced. The line under the title says training experience sets starting
loads, and beginner is used until you choose otherwise. On emulator-5554 the
existing profile had no stored level, so Beginner opened selected. Intermediate
was selected on screen, then Exit, so the live program was not rewritten.

**Renders:** `.eif/audit/N-0022/constraints.png` and `.eif/audit/N-0022/experience-intermediate.png`

**Approve?** N-0022

## N-0067 insight category headings

Insight cards no longer title-case internal source tags into category lines.
`sleep_serotonin`, `sleep_breath_vagal` and `mood_dopamine` display Sleep,
Breathing and Mood. Stored tags, rules, routes and telemetry are unchanged.
Chemistry chips remain N-0035.

Renders: **UNABLE_TO_VERIFY** on 2026-09-29 — no attached ADB device and Metro
was unreachable. Steps: `baseline/N0067_DEVICE_CHECK.md`. Ordinary and large-text
captures are still required. Source tests are not this approval.

## N-0060 notification intent races

Concurrent intent writes no longer replace each other's document. Delivery
acknowledgement is awaited and checks prompt revision; a late old delivery cannot
mark a newer prompt fired. Replacement prompts have distinct schedule identity.
Native timing/watch-alive acceptance remains **UNABLE_TO_VERIFY**; steps are in
`baseline/N0060_DEVICE_CHECK.md`. N-0017/N-0059/N-0061/N-0066 remain separate blockers.

## N-0064 medication empty-state coaching

The first-medication coach is hidden when medications exist, while the list is
loading/refetching, or when a read fails. Existing empty-list coaching and its
actions remain; list failures now reach the existing error UI, not a fake empty
result. No medication/dose data or reminder behavior changed.

Renders: **UNABLE_TO_VERIFY**; steps `baseline/N0064_DEVICE_CHECK.md`. Prior retained
AVD evidence showed the contradiction; after evidence is still required.

## N-0062 mood save outcome and draft preservation

After persistence succeeds, a failed summary refresh now reports that the check-in
was saved and does not request another save. New note edits made during saving are
preserved. Genuine persistence failures still preserve the draft and permit retry.

Renders: **UNABLE_TO_VERIFY** — no attached AVD / reachable Metro on 2026-09-28.
Steps: `baseline/N0062_DEVICE_CHECK.md`; expected renders `.eif/audit/N-0062/`.
No runtime journey is claimed. Final operator approval remains required.

## N-0007 training loading query truth

**What changed:** If `activeSessionId` is set and the session query **settles empty**, Training no longer stays on the “Opening session…” spinner. The id is cleared and the today list returns. Error still shows Try again + Back to training. Pending still shows spinner + Cancel.

**Renders:** AVD capture **UNABLE_TO_VERIFY** this pass (no logged-in HEAD session). Source + vitest: `app/src/lib/training/activeSessionQueryTruth.ts`.

**Approve?** N-0007

## N-0016 stale session timer (guided overnight trap)

**What changed:** Stale “Resume this session?” no longer shows a 15h+ header clock or blocks the whole app. Header shows **Paused** while the prompt is open; **Resume** starts a fresh display clock from now (`started_at` unchanged); **Minimize** / backdrop dismiss uses the existing session minimize path; dialog is dismissable.

**Renders:** AVD capture **UNABLE_TO_VERIFY** this pass (no overnight stale session on device). Source + vitest: `staleSessionTimerDisplay.ts`, `staleSessionTimerDisplay.test.ts`, `TrainingSessionView.tsx`.

**Approve?** N-0016

## N-0046 S1 separate account deletion and data reset

**What changed:** Settings and Data & privacy now explicitly say "Delete account", warn that it cannot be undone, suggest exporting first, and explain that returning requires a new account. Missing server functions no longer fall back to a partial wipe. Confirmed deletion signs out before onboarding reset; device-cleanup failures are reported separately. Review in the final build as requested; no intermediate approval stop.

**Renders:** `.eif/audit/N-0046/product-renders/privacy-screen.png`,
`privacy-bottom.png`, `delete-confirm.png`, and `after-cancel.png`.

The canonical app rendered the Data & privacy account-removal copy and native destructive
confirmation. Cancel returned safely without deleting the signed-in account. This is
visual/cancel-path evidence only; N-0047 still owns the verified throwaway deletion and
zero-row/auth-absence proof.

**Approve?** N-0046

## N-0058 Bind account deletion and cleanup to confirmed identity across auth races

**What changed:** N-0058 binds deletion to the confirmed account and blocks navigation/new sign-in through device cleanup. The busy screen uses a live-region/busy accessibility state. 900 tests pass; actual AVD rendering remains UNABLE_TO_VERIFY (N-0056 EOF/ANR). Device steps: `baseline/N0058_DEVICE_CHECK.md`. Review in Warren's final build; no intermediate approval stop.

**Renders:** `.eif\audit\N-0058 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0058

## N-0018 C-N mood check-in submit lock

**What changed:** N-0018 Mood Save now ignores concurrent presses synchronously and shows Saving/disabled/busy until the existing callback ends. Rendered component tests cover repeated taps, rerender and failure retry. Full suite 904/904. AVD UNABLE_TO_VERIFY under N-0056; steps in `baseline/N0018_DEVICE_CHECK.md`. Final-build review; no intermediate stop.

**Renders:** `.eif\audit\N-0018 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0018

## N-0032 C-M med curation-tier gate

**What changed:** N-0032 separates unreviewed catalogue matches from documented content reviews in the profile and education section. All 357 existing rows remain unchanged/unreviewed; no reviewer provenance invented. Missing/invalid review metadata cannot enable curated mode. 918/918 tests pass. AVD UNABLE_TO_VERIFY under N-0056; steps in `baseline/N0032_DEVICE_CHECK.md`. Review in the final build; no intermediate stop.

**Renders:** `.eif\audit\N-0032 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0032

## N-0028 C-L associated-with copy sweep

**What changed:** Mood's Related patterns label and targeted insight, glossary, catalogue and calendar-hint text now use observational language. Removed blanket missed-dose instructions. Full 923/923, types 0, dual-path 27/27; no rule contracts or catalogue metadata changed. AVD unavailable; exact final review steps in `baseline/N0028_DEVICE_CHECK.md`. No visual pass claimed.

**Renders:** `.eif\audit\N-0028 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0028

## N-0065 Review unsupported health certainty in static insight copy

**What changed:** Reviewed all 89 static insights; changed 242 message/action/why fields in 84 records without changing rules, identifiers or routes. Unsupported health certainty and generic medication timing instructions replaced with logged observations and appropriate referrals. Source commit 70424cc / EV-0041. Focused 34/34, types 0, audit 27/27; full retry 953/953 with 30-second timeout allowance. Default run's three 5-second timeouts remain N-0052. N-0067 category headings and N-0035 chips remain separate work. No rendered pass; exact steps in baseline/N0065_DEVICE_CHECK.md.

**Renders:** `.eif\audit\N-0065\product-renders (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0065

## N-0059 Centralize native notification cancellation and remove cancel-all escape path

Scheduled create and cancel now stay in NotificationScheduler. Reminder clears
edit intents and reconcile. Open training, mindfulness, and meditation guidance
is kept. Settings buttons say "Clear reminder notifications". Source tests do
not prove the device. Steps: `baseline/N0059_DEVICE_CHECK.md`.

**Renders:** `.eif\audit\N-0059 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0059

## N-0020 C-R F1 canonical muscle taxonomy

**What changed:** The weekly sets line buckets primary muscle tags through a closed taxonomy. Previously dropped regional tags, including `core`, now count toward Chest, Back, Shoulders, Arms, Legs, or Core. `cardiovascular` and `full_body` stay out of those six labels. Catalogue strings are unchanged. The line still adds one count per primary tag.

**Renders:** `.eif\audit\N-0020\product-renders` (UNABLE_TO_VERIFY — renders missing). Home was on screen; UI dump could not get an idle state, so the session preview was not opened. That is not acceptance of the line.

**Approve?** N-0020
