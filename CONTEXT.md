# CONTEXT.md

## 2026-07-20 — Play-bound elevation: U3–U9 shipped (tonight APK package)

**Branch:** `fix/training-confident-ux`.

**U3:** Drawer `SignalGraph` — multi-series bars from `readSignalLedgerMultiSeries` only; honest “seeding” empty state.

**U5:** Settings `experimentsEnabled` (default OFF) → Home `DashboardExperimentCard` evening wind-down 14d (`behavioralExperiment.ts`, scoped storage).

**U7:** `medCatalog.batch4.json` (+50) → **357** governed rows; `npm run med-catalog-qa` clean.

**U8:** Analytics `AppCard marginBottom={0}`; Integrations InformationalCards `marginBottom={0}` (parent owns gap).

**U9:** Integrations copy documents Steps + Active calories feature paths; draft `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md` for Console paste (Human).

**Prior tonight:** U1 ledger · U2 explanations · U4 adaptive · U6 meds copy (`b602089`).

**Needs:** new EAS preview from tip; evening Wear/Home + Signal graph + Settings toggles smoke; Human pastes Play Console OQ-1.

**EAS:** queued from `770b868` — see Expo build link in chat / expo.dev project builds.

## 2026-07-20 — Play-bound elevation: U1 ledger + U6 meds copy

**Branch:** `fix/training-confident-ux`.

**Plan:** `docs/handover/playbound-elevation-plan-2026-07-20.md` (Opus CONSULT READY — everything in tonight’s APK; migration approved; adaptive/experiments opt-in).

**U1:** SQLite migration v6 `reclaim_signal_ledger`; `signalLedgerFlatten` + repository; `InsightsProvider.refresh` best-effort snapshot write after `setLastContext`.

**U6:** Honest meds education vs diagnosis — keep mechanism; boundary caption; fix MedsScreen “won’t tell you what a medication does” lie.

**Still in-flight tonight:** U2 explanations · U3 graph · U4 adaptive · U5 experiment · U7 catalog batch4 · U8 padding · U9 Play OQ-1.

## 2026-07-20 — Layer 2 remote exercise stills + close audit fix

**Branch:** `fix/training-confident-ux`.

**Layer 2:** `exerciseIllustrations.v1.json` (~25 money lifts) → public Storage/CDN URL; `ExerciseIllustration` loads remote WebP with stick-diagram fallback (offline/404). Zero APK media. Upload checklist: `docs/handover/exercise-stills-upload.md` (bucket `exercise-stills`).

**Audit fix:** `closeTrainingSession` marks pending-close *before* session load so Wear headless close cannot fail open; load failure enqueues minimal `finalizeSession`. Unknown `exercise_id` no longer crashes SetFocusCard.

**Needs:** create/upload stills to Supabase bucket (until then stick fallback); new EAS preview for L1+L2+close fixes.

## 2026-07-20 — Layer 1 exercise how-to (text, zero APK media)

**Branch:** `fix/training-confident-ux`.

**Problem:** How-to felt broken — only ~27 catalog IDs matched cues (13 orphan keys like `back_squat` vs `squat`); in-session card showed intent labels, not steps.

**Ships:** Remapped + expanded `exerciseCues.v1.json` (~104/137 exercises, 0 orphans); governance vitest; SetFocusCard shows live numbered How-to tips from `exercise.cues` (tap → full modal). Stick SVGs unchanged; remote stills still deferred (Layer 2).

**Needs:** evening training smoke on existing preview (or next EAS if you want this in the binary).

## 2026-07-18 — Session close authority (blank-spinner / resurrect loop)

**Branch:** `fix/training-confident-ux`.

**Device:** Old session → Done → past stale → brief Training flash → blank screen + loading spinner.

**Root:** Durable close ordered wrong / fake-success resurrect (D2–D3); auto-resume into `activeSessionId` with no fetch UI (D5); dismiss cleared on foreground; Wear last-set deep-linked back into the same open session.

**Ships:** `closeTrainingSession` (ended_at first, 10s bounds, pending-close gate); Training loading/error + Cancel; no silent mid-session finalize — “Complete session?”; shared `isSessionWorkComplete`; stale re-eval on AppState; Discard → Save & close; Wear last-set navigates to hub only.

**Needs:** new EAS preview; force-close + Save & close / Cancel once on current build to unstick any zombie open row.

## 2026-07-18 — Device bugs: last-set auto-finalize + kill prep Wear notifs

**Branch:** `fix/training-confident-ux`.

**Causes:** (1) Last SET_DONE cleared prompts but never `finalizeTrainingSession` → session stayed open. (2) Guided prep scheduled “Tap to begin” OS notifs with no actions → Wear “Show on phone”. (3) Start failure = real Supabase `Network request failed` (offline/flaky).

**Fixes:** Auto-finalize on last set (Wear + in-app); remove prep OS notifs; clearer start-error copy. Stick-figure how-to still deferred (need photo/clip/text unit).

**Needs:** new EAS preview.

## 2026-07-18 — U3+U4: swap guidance + mood starfield quiet

**Branch:** `fix/training-confident-ux`.

**U3:** Swap exercise persists refreshed `planned.intents` from catalog (how-to chips follow the new movement). Pattern stick diagrams remain the illustration ceiling until a real asset pipeline (deferred).

**U4:** Removed `PremiumStarfield` from Mood (quieter check-in); deleted dead `StarfieldFullPage`. Dashboard hero starfield kept.

**Next:** New EAS preview smoke (U1–U4). Wear companion still parked.

## 2026-07-18 — U2: insight hygiene (primary night, mood freshness, crisis ladder)

**Branch:** `fix/training-confident-ux`.

**Ships:** `selectPrimaryNight` so morning naps ≠ last night; mood trend/last require logs within 3 calendar days; `mood-sustained-low` CTA → reach out / Share first, 988 secondary (still reachable).

**Not done this unit:** full sleep provenance ledger UI (D5) — deferred; still no schema migration.

**Next:** U3 exercise content · U4 starfield/motion.

## 2026-07-18 — U1: guided session notification truth + keep-awake

**Branch:** `fix/training-confident-ux`.

**Ships:** Cursor-aligned notification `next` (`buildNotificationWorkChain` + session `current_exercise_index`); swap exercise rebinds guided prompt (same path as jump); `SET_DONE` background (no forced unlock); `expo-keep-awake` while guided session active; honest Guided Prep / Preview copy (no false “watch will start”).

**Awake reality:** Keep-awake + background Done improves the bridged loop. Full Android foreground service (true Doze immunity screen-off) still parked — needs native FGS module. Wear mini-companion parked.

**Next:** U2 insight hygiene / safety ladder / primary night.

**Not touched:** applySetCompletion SSOT, companion APK, promotional run.

## 2026-07-17 — Insight loop Unit 3: verify-lite acknowledgment

**Branch:** `fix/training-confident-ux`.

**Ships:** Local-only verify-lite after executable insight actions — `insightVerifyLite` records match + conditions; on later Dashboard refresh (≥90s, TTL 72h), if conditions no longer match → dismissible acknowledgment + `insight_condition_cleared` telemetry. Exported `conditionsMatchContext` from InsightEngine. No schema / notifications.

**Promotional run:** stays **ON** until ≥1000 users.

**Next:** EAS preview smoke (UI + insight CTAs + verify-lite) + Play submit prep (OQ-1).

**Not touched:** InsightsProvider limits, reconciler, applySetCompletion, promotional flag, lagged correlations.

## 2026-07-17 — Insight loop Unit 2: rules audit + intent coverage

**Branch:** `fix/training-confident-ux`.

**Ships:** `docs/audits/insight-rules-audit.md` (full 89-rule matrix); expanded `actionIntent` to ~84 executable rules; left advice-only for crisis (988), water fallback, and meds-catalog educational overlaps. Free-tier clarified: top 10 *matching* by priority (not file order). No clinical copy rewrites needed; no threshold retunes. Promotional run remains ON until ≥1000 users.

**Next:** Unit 3 verify-lite → EAS smoke + Play submit prep.

## 2026-07-17 — Insight loop Unit 1: executable action intents

**Branch:** `fix/training-confident-ux`.

**Ships:** Typed `actionIntent` on InsightRule/Match; `insightActions.resolveInsightAction`; ~25 rules tagged in `insights.json`; Dashboard CTA navigates/logs for real (no “Action queued” snackbar); Primary Action can surface “From today’s signal”; InsightCard hides button for advice-only (988 lifeline CTA kept).

**Promotional run:** stays **ON** until ≥1000 users (Human lock) — do not unwind paywall for monetization before that milestone.

**Next:** Unit 2 rules audit → Unit 3 verify-lite → Play submit + EAS smoke (can parallel).

**Not touched:** InsightsProvider limits, reconciler, applySetCompletion, promotional flag.

## 2026-07-17 — Docs sync + Play readiness + Fable market elevation consult

**Branch:** `fix/training-confident-ux` @ `ae20e35` (pushed).

**Docs:** handovers + `outstanding-backlog.md` + Play readiness/blocker matrix + `HEALTH_API_COVERAGE.md` + `AGENTS.md` + `market-elevation-consult-2026-07-17.md`.

**Play:** Manifest declares `READ_STEPS` + `READ_ACTIVE_CALORIES_BURNED` (second rejection cited these). Resubmit needs Console/listing alignment (**OQ-1**) or intentional strip. Default connect still omits steps/calories (feature-path).

**Fable CONSULT:** READY — Signal Engine roadmap (explain → readiness-adjusted training → experiments → widgets). Full write-up in handover. Do not start U1 until EAS smoke + Play path chosen.

## 2026-07-17 — Home section gaps: kill AppCard double-margin (real padding fix)

**Branch:** `fix/training-confident-ux`.

**Why prior “padding fixes” failed:** `reclaimSectionSpacing` (16) stacked with `AppCard` default `marginBottom: lg` (16) → most Home gaps **32**. Daily signal used `embedInTightVerticalStack` (mb 0) → **16**. Looked like “inconsistent padding.” Tweaking footnotes alone never fixed it.

**Rule now:** parent owns inter-section gap only. Nested cards pass `marginBottom={0}` (plumbed on InformationalCard/ActionCard). Footnotes/quota use `RECLAIM_CARD_BLOCK_GAP` (10). Restored `reclaimBelowHeroContent` paddingTop 16 (removed `paddingTop: 0` override).

**Files:** AppCard wrappers + DashboardGreeting/Insight/Arc/Today/Recovery/PrimaryAction/PostOnboarding + MedicationContextFootnotes + Dashboard.tsx.

**Needs:** new EAS preview. Device smoke: legend→greeting→signal→footnotes→arc all read as even 16 section rhythm.

## 2026-07-17 — Preview UI regressions: insight chrome + session modal + section gaps

**Branch:** `fix/training-confident-ux`.

**User report (preview APK):** (1) Daily signal support emphasis gold/amber border looked wrong; (2) Training Start/Review → dim overlay with no sheet/buttons; (3) tighter gap under Daily signal vs other Home sections.

**Root causes:** Support emphasis used amber outline; Paper `Modal` + `flex:1` collapses content height on Android; empty InsightQuotaBadge wrapper still applied `marginBottom: 10` and footnotes used `marginTop: 10` vs canonical `RECLAIM_SCREEN_SECTION_GAP` (16).

**Fixes:** Teal wash/left bar only (`dashboardInsightEmphasis` + `InsightCard`); `SessionPreviewModal`/`GuidedPrepScreen`/`SessionDetailModal` solid `elevation.level3` + explicit sheet height (no Modal `flex:1`); quota badge only when free; footnotes use section gap.

**Needs:** New EAS preview to verify on device (current APK still has the bugs).

**Not touched:** Wear Done / reconciler / applySetCompletion / med module.

## 2026-07-15 — Training follow-up audit + confident UX fixes

**Audit branch:** `chore/reclaim-uiux-audit-pilot` @ `3545d42`. **Fix branch:** `fix/training-confident-ux`.

**Audit:** `docs/audits/training-followup-audit.md` — Wear Done inbound fragile vs outbound rest-complete OK; HC write-on-finish only; Mindfulness deep link ignored; Android HR nudge no baseline; X-11 dual week sources; stick diagrams pattern-only.

**Confident fixes (no guided SET_DONE / reconciler / applySetCompletion):** X-11 week_index authority; stale 6h→5h in-app only; Mindfulness autoStart+intervention; meditation/mindfulness notification type fallbacks.

**Held:** Wear Done durable transition, jump↔notifs, live workout/kcal, HR baseline, 5h push, diagrams, confirm overlay.

**Handover:** `docs/handover/training-confident-fixes-handover.md`

## 2026-07-15 — X-26 cold-start fix: background reconcile + splash bar polish

**Branch:** `chore/reclaim-uiux-audit-pilot`. **Not committed** (await ask).

**Gate:** `runStartupNotificationPermissionGate` awaits permission + `clearBadge` only; `reconcileNotifications()` fires in background (still intent→reconcile; no ad-hoc schedule). Splash copy: “Almost ready…”. `logger.info` on gate complete for release measurement.

**UI:** Splash loading bar — soft primary halo, teal border, sheen + shimmer (skipped when `reduceMotion`).

**Files:** `notificationStartupGate.ts`, `useStartupGate.ts`, `types.ts`, `RootNavigator.tsx`, unit test `startup/__tests__/notificationStartupGate.test.ts`.

**Not touched:** X-11 week labels; reconciler internals; `applySetCompletion` / session work authority.

## 2026-07-15 — UI Excellence post-remediation device QA

**Branch:** `chore/reclaim-uiux-audit-pilot` @ `f0cac28` (remediations through `a40d053`). **Docs updated, not committed** (QA report only).

**Build:** local release APK `releases/reclaim-release-ui-remediation-f0cac28.apk` (debug-signed; embeds Phases 1–7 JS). Emulator-5554. Google re-auth after keystore change.

**Smoke:** PASS — dark Dashboard/Training/Meds; Notifications→Settings deep link; Moments; history pluralization (`1 exercise • 1 set`); Training labels (drawer+titles). PARTIAL — Support section via Settings (`qa-support-settings.png`); drawer shows Support/Training. BLOCKED — session Finish/complete + stale Resume/Discard (adb Start no-ops; stale needs `__DEV__` + `EXPO_PUBLIC_STALE_SESSION_MINUTES`). X-11 still visible (Week 3 vs Week 2). X-11/X-26 not implemented.

**Log:** `docs/audits/remediation-log.md` (Post-remediation device QA). Evidence: `docs/audits/evidence/qa-*.png`.

## 2026-07-15 — Phase 8 Cold-start audit (X-26) — diagnosis only

**Branch:** `chore/reclaim-uiux-audit-pilot`. **Not committed** (per task). **No startup-gate code changes.**

**Audit:** `docs/audits/cold-start-audit.md`. Evidence: `docs/audits/evidence/cold-start-x26-*`. Emulator-5554, APK `1.0.3`/build8. `logger.debug` ENTRY_CHAIN/STARTUP_GATE **absent** on release APK (`__DEV__` gated).

**Measured:** START→`Running "main"` ~2.2–3.4 s; UI “Notification setup…” through **10 s**, Home by **12 s**; GESTURE HANDLER ~12–14 s. Dominant: splash awaits `reconcileNotifications()` in notifications gate (permission already granted). Fix recommended (not implemented): await permission only; reconcile in background.

## 2026-07-15 — Phase 7 Stale-session guard (B1-S-01) — uncommitted

**Branch:** `chore/reclaim-uiux-audit-pilot`. **Not committed** (per task).

**Part A first:** `docs/audits/stale-session-audit.md` — timer = wall-clock `started_at`→`now` in `TrainingSessionView`; activation = `TrainingScreen.activeSessionId` + `inProgressSession` (`started_at && !ended_at`); tabs blocked by early return rendering `TrainingSessionView`. `sessionWorkAuthority` does not own timer/activation → Part B proceeded.

**Part B:** On session-view mount, if start older than `STALE_SESSION_HOURS` (6) and no set logged in window → Dialog Resume/Discard; clock frozen until choice. Discard = `handleComplete` (Finish path). DEV: `EXPO_PUBLIC_STALE_SESSION_MINUTES`. Files: `sessionUiConstants.ts`, `staleSessionGuard.ts`, `TrainingSessionView.tsx`. Typecheck + focused vitest pass.

## 2026-07-15 — Phase 5 Shell IA (B4-Dr-01/X-23, B4-Dr-03/X-09, B1-D-01) — uncommitted

**Branch:** `chore/reclaim-uiux-audit-pilot`. **Not committed** (per task).

**Done:**
1. Drawer Support → `HomeTabs` / `Settings` with `{ openSection: 'support' }` (`AppNavigator`); `SettingsScreen` already honored `openSection`.
2. User-facing **Exercise → Training** (drawer tile, drawer `options.title`, error-boundary label, LifecycleHero hub chip). Route name `Training` unchanged.
3. B1-D-01: real surface is **LifecycleHero** Mood hub chip (status marker + Skia z-order), not HomeDashboardTile visual band. Capsule padding/zIndex + wider `CAPSULE_W` for Training.

**Inspected, no edit:** `DashboardStateTiles` / `HomeDashboardTile` / `MoodRhythmVisual` / `visualBandHeightRatio` — textPlane already `zIndex: 3` above visualBand `0`.

## 2026-07-15 — Full-app UI excellence audit complete; remediation Phases 0–8 next (branch: chore/reclaim-uiux-audit-pilot)

**Status:** Evaluation-only audit **done** (Batches 1–4). Findings in `docs/audits/ui-audit-master.md` + `ui-audit-batch-{1-4}.md`; evidence in `docs/audits/evidence/`. Onboarding closed via **code review** (onboarded account blocks visual). **No app code changed** during audit.

**Handover:** `docs/handover/ui-excellence-audit-handover.md`  
**Remediation tracker (stub):** `docs/audits/remediation-log.md`  
**Next:** User-approved remediation Phases 0–8 (strict order, commit+push per phase). Build: `releases/reclaim-preview-1.0.3-build8-ui-fixes.apk`. Emulator captures were **light theme** (X-07) — Phase 0 verifies dark.

**Gotchas:** Cold deep links need 14–18s splash; ADB full path on Windows; `drawer-open.png` (batch 1) misnamed — use `drawer-open-b4-v2.png`.

## 2026-07-03 — FINAL PASS phases 1–8 complete (branch: cursor/final-pass-phases-67d1)

**Status:** All eight final-pass phases implemented and pushed. Walkthrough with per-phase pass/fail: `docs/audits/final-walkthrough.md` (automated = pass everywhere; device walkthrough checklist pending — no device in this environment).

**Phase 1 (notifications):** dumb triggers. Payload = sessionId + verb + display strings + issuedAt. Two intent slots per session (`training_now:{id}`, `training_at:{id}`), one OS identifier `reclaim-training-{id}` updated in place. Rest-end = absolute `scheduledAt`; reconcile never re-materializes past intents. All handlers derive work from DB at fire time (`deriveActiveWorkTarget`). staleHint + evidence gate DELETED. Duplicate delivery: response-key claim (issuedAt salt) + in-flight set.

**Phase 2 (progression):** `decideDoubleProgression` — top-of-range @ RPE≤8 → +2.5 upper / +5 lower; below range or RPE 9–10 → hold; two holds at same load → deload 10% (3-session history seed). `suggestLoading` no longer bounces loads via e1RM when history exists. Reason strings in set card + history. Bodyweight shows "Bodyweight", never 0kg.

**Phase 3 (HR nudge):** 15-min HC polling; resting+35 sustained + steps-inactive gate; 2h debounce; quiet hours; honest settings copy. READ_STEPS added to manifest plugin (needs next native build + Play declaration).

**Phase 4:** one mood reminder/day at user time (default 20:00), skipped when logged (next-3-day one-shots). Sleep celebrations only on manual import with new nights; cold-open silent.

**Phase 5:** single-spring achievement animation (0.96→1.06→1.0, ≤450ms, one haptic, confetti removed).

**Phase 6:** med detail collapsed (+About expander, "Every day", labeled dose, no 0% adherence); hero emoji removed; ConfidenceBadge + chip legend replace debug strings; one dismissible insight per screen at top; in-session next-set pill header; canonical chip spec in theme (36px/r18); engineer-voice copy rewritten; streak arcs → next badge threshold, Lv hidden until level 2.

**Phase 7:** forecast journal (record + grade at check-in, frozen once graded, accuracy summary); Weekly Stability Report Sunday 19:30 — FIXED: weekly narrative + daily signal previously had appTag without logicalKey so the reconciler cancelled them (never delivered); both now intent-based. Streak repair = one per ISO week, 24h window. **Home widgets DEFERRED (native build).**

**Gates:** tsc clean · vitest 630/630 · audit:training-dual-paths 19/19 · eslint no new errors (2 pre-existing dup-import errors untouched).

**Gotchas for next agent:** device must be on runtimeVersion 1.0.3 + correct channel before judging OTA fixes; only-alert-once is via identifier replacement (Expo has no Android setOnlyAlertOnce); legacy `training_rest:/set:/first:` intents are dropped by reconcile + cleared on sight; `tsconfig` now sets `allowImportingTsExtensions` (syncDisplay imports `sync.ts` explicitly for Metro).

## 2026-06-24 — Training unification PR-G–H complete; D1–D9 met (branch: cursor/cloud-agent-1782316881540-7ft0i)

**Status:** Full unification plan A–H landed. **PR-G:** `trainingSessionProgression.ts` extracted; tier tests implemented (stale, parity, simulation, finalize). **PR-H:** `finalizeTrainingSessionAndCleanup` for alert End + in-app Complete; deleted `buildGuidedRestNotificationContextAfterCompletedSet`; audit extended to 19 checks; CI gate added.

**Audit:** `npm run audit:training-dual-paths` — **19/19 pass**.

**Tests:** 599/599 pass; typecheck pass.

**D10:** Fresh-agent re-read recommended before gym device QA.

## 2026-06-24 — Training unification PR-D–F complete; audit passes (branch: cursor/cloud-agent-1782316881540-7ft0i)

**Status:** PR-D: `scheduleGuidedTrainingSessionStart` from DB items; removed `computeFirstSetInfo`; prep schedules after DB write. PR-E: in-app skip persist-first + `scheduleGuidedTrainingAfterSetPersist`. PR-F: `replayTrainingOfflineQueueAndRefreshUI` in useNotifications, SyncEngine, TrainingScreen.

**Audit:** `./scripts/audit-training-dual-paths.sh` — **14/14 pass** (D9 met for known violations).

**Tests:** 587/587 pass + 12 todo scaffolds; typecheck pass.

**Remaining before gym test:** PR-G (tier tests, `trainingSessionProgression.ts` extract), PR-H (deletion pass, scaffold tests → real), D10 fresh-agent re-read.

## 2026-06-24 — Training unification PR-A–C (branch: cursor/cloud-agent-1782316881540-7ft0i)

**Status:** Phases 0–3 of full unification plan landed. **PR-A:** `docs/training/guided-session-unification-contract.md` + `scripts/audit-training-dual-paths.sh` (fails on 3 remaining violations). **PR-B:** `NEXT_SET` → `scheduleGuidedTrainingNextSetFromDb` (DB work chain, not payload lookahead). **PR-C:** In-app `handleSetComplete` → `scheduleGuidedTrainingAfterSetPersist`; removed `notifyRestStartIfNeeded` / `scheduleRestFinishNotification` from `TrainingSessionView`.

**Commits:** `536d3f8` (PR-A), `ce62b2c` (PR-B), `9840343` (PR-C).

**Audit:** 11 pass / 3 fail — remaining: `computeFirstSetInfo` (PR-D), offline replay invalidation gaps (PR-F).

**Tests:** 584/584 pass + 12 todo scaffolds; typecheck pass.

**Next:** PR-D session start unification, PR-E persist-first skip, PR-F replay wrapper, PR-G tests, PR-H deletion pass. Device gym QA blocked until D1–D10.

## 2026-06-24 — Training persist unification Phases 1–4 complete (branch: cursor/cloud-agent-1782316881540-7ft0i)

**Status:** Full training SSOT pass. Phase 1: notification `SET_DONE`/`SKIP_SET` → `applySetCompletion`/`applySetSkip`. Phase 2: `scheduleGuidedTrainingAfterSetPersist` derives notification chain from DB (`trainingNotificationWorkPlan` + `getTrainingSession`). Phase 3: `applySetEdit` canonical edit path; in-app Done persist-first; `buildNotificationWorkChain` for rest context. Phase 4: `finalizeTrainingSession` shared by `TrainingSessionView` + alert End; offline replay invalidates `training:session:*` + `set_logs`.

**Key files:** `applySetCompletion.ts`, `applySetEdit.ts`, `finalizeTrainingSession.ts`, `trainingNotificationWorkPlan.ts`, `scheduleGuidedTrainingAfterSetPersist.ts`, `guidedTrainingNotificationActions.ts`, `TrainingSessionView.tsx`, `TrainingScreen.tsx`, `postReplayQueryInvalidation.ts`.

**Tests:** 579/579 pass (incl. `trainingNotificationWorkPlan.test.ts`, persistence parity, replay invalidation).

**Device QA:** Cloud agent has no Android SDK/emulator or paired watch — user validates at gym.

## 2026-06-24 — Training persist unification Phase 1 (branch: cursor/cloud-agent-1782316881540-7ft0i)

**Status:** Notification `SET_DONE` and `SKIP_SET` now route through canonical `applySetCompletion` / `applySetSkip` (same DB contract as in-app). Removed inline `logTrainingSetWithRetry` fork in `guidedTrainingNotificationActions.ts`. `applySetCompletion` gained retry-then-queue for online failures. `isExerciseFullyLoggedOnItem` fixed to require every planned set index (not count-only). Cache patch after persist mirrors in-app speed layer only.

**Key files:** `applySetCompletion.ts`, `guidedTrainingNotificationActions.ts`, `TrainingSessionView.tsx`, `sessionWorkAuthority.ts`.

**Tests:** `applySetCompletion.test.ts`, `guidedTrainingNotificationActions.persistence.test.ts`, `sessionWorkAuthority` gap-index case. `npm test` 577/577.

**Next:** Derive notification scheduling from DB read (`deriveActiveWorkTarget`) instead of payload lookahead; unify `handleSetUpdate` edit path; single session-end finalize; device QA watch+phone.

## 2026-06-16 — Launch prep: PR #9, promotional run, Supabase meds column (branch: feat/meds-catalog-governance)

**Status:** PR #9 open → merge to `reclaim/canonical-recovery-clean`. CI workflow extended to that branch. `EXPO_PUBLIC_PROMOTIONAL_RUN` defaults ON (production EAS `env` set to `"1"`); set `"0"` when enabling payments. `meds.catalog_match_key` applied on Supabase project `reclaim` (bgtosdgrvjwlpqxqjvdf). Emulator smoke OK (dark home + tiles). **Main integration:** `feat/meds-catalog-governance` has no common ancestor with `main` — promote via `reclaim/canonical-recovery-clean` first; `main` merge is a separate unrelated-history integration.

**Validation:** typecheck pass; tests 563/563 (prior run).

## 2026-06-16 — Reskin close-out: light hero glow + emulator QA (branch: feat/meds-catalog-governance)

**Status:** Final reskin polish. `BrainVisualization` + `NodeToBrainConnectors` use theme-aware glow opacity on light. Phase 4 touch-up doc marked complete (splash config, brain glow). Emulator QA (dark): hero brain, state tiles, daily signal, 30-day arc, teal JS splash; Appearance light toggle needs one manual confirm (ADB chip coords unreliable).

**Validation:** `npm run typecheck` pass; `npm test` 563/563. Closeout PNGs in `docs/reskin/final/06–09-closeout-*.png`.

## 2026-06-16 — Reskin Phase 5 complete (branch: feat/meds-catalog-governance)

**Status:** Phase 5.1–5.6 done on dashboard presentation layer. Tile domain glow + brighter data viz (5.1). Aurora drift **removed** after review — user preferred static tiles (5.2 skipped). Entrance choreography: `Reveal`, insight cross-fade, streak ring fill, count-up (5.3). Haptics wired + Settings toggle (5.4). `DashboardThirtyDayArc` read-only trend (5.5). Splash → teal mark on `#0b1220` (5.6). 5.7 hero tilt skipped.

**Validation:** `npm run typecheck` pass; `npm test` 563/563. Emulator smoke dark/light; tile grid static (no aurora / forecast loop / chevron pulse).

## 2026-06-07 — Reskin Phase 3 + Phase 4 touch-ups (branch: feat/meds-catalog-governance)

**Status:** Phase 3.1–3.4 done. Unified chrome (`reclaimChrome.ts`), transformation paywall + RC offering copy, `InsightQuotaBadge` (10 of 88), premium particle backdrop. Phase 4: logo teal retint, starfield off in light, milestone confetti respects reduced motion. Handoff: `docs/reskin/design-handoff-report.md`.

**Validation:** `tsc` pass; `npm test` 563/563. Sandbox purchase/restore manual on device.

## 2026-06-07 — Reskin Phase 2 complete + Phase 4 touch-up list (branch: feat/meds-catalog-governance)

**Status:** Phase 2.1–2.4 done. Splash square fix (transparent `ReclaimLogo` canvas). Hero loops gated on focus + scroll in-view + reduced motion (`useHeroMotionActive`). Light-theme hero capsule palette in `LifecycleHero`. Phase 4 backlog in `docs/reskin/phase-4-touchups.md` (logo teal re-tint, native splash bg, starfield on light).

**Validation:** `tsc --noEmit` pass; `npm test` 563/563. Emulator: dark home hero + state tiles + glows OK; Appearance light toggle needs manual confirm (ADB chip taps unreliable).

## 2026-06-07 — Reskin Phase 2.1–2.3 (branch: feat/meds-catalog-governance)

**Status:** Fonts + type scale + Dashboard split done. **2.4–2.5 (motion pass) deferred** for user review.

**2.1:** `@expo-google-fonts/schibsted-grotesk` + `hanken-grotesk` via `ReclaimFontsProvider`; splash holds until `fontsReady`; `withReclaimFonts` on Paper theme.

**2.2:** Widened MD3 typescale in `reclaimPaperFonts.ts`; `reclaimTypography` + `appThemes.typography` use display/body families.

**2.3:** `Dashboard.tsx` split — 7 new section components (`DashboardHeroBackdrop`, `DashboardPostOnboardingGuide`, `DashboardStateTiles`, modals, overlay host, snackbar). Logic stays in screen.

**Validation:** `npm run typecheck` pass; `npm test` 563/563 pass. `Dashboard.tsx` ~2526 → ~2342 lines (logic retained in screen).

## 2026-06-07 — Reskin Phase 1 complete (branch: feat/meds-catalog-governance)

**Status:** Phase 1.0–1.4 done. Theme toggle (`appearanceMode`: system/light/dark) persisted in `userSettings`, resolved via `AppThemeProvider` + `resolveAppTheme` + `useColorScheme()`. Settings → Appearance chips. Teal tokens + `domainAccents` in `binaxisColors.ts`.

**Validation:** `npm run typecheck` pass; `npm test` pass (incl. `resolveAppTheme.test.ts`).

## 2026-06-07 — Reskin Phase 1 tokens (branch: feat/meds-catalog-governance)

**Status:** Steps 1.1–1.4 complete (theme toggle 1.0 deferred). Teal primary/secondary (`#53c9ca` / `#72d7d8`), calm error (`#ec5a5e`), `domainAccents` on both themes via `binaxisColors.ts`. Hero/streaks (`CelebrateRow`, `BrainVisualization`, `NodeToBrainConnectors`) read `useAppTheme().domainAccents`. Accent hex swapped in `TagPills`, `MoodFaces`, `NetworkStatusIndicator`; test mock primary updated.

**Validation:** `npm run typecheck` pass; `npm test` 559/559 pass.

**Out of scope (Phase 1):** Theme toggle (1.0); decorative hex in dashboard tiles, logo, mood weather, etc.

## 2026-06-07 — Reskin Phase 0 follow-ups (branch: feat/meds-catalog-governance)

**Status:** `recoveryRestore.test.ts` flake fixed — mock `recoveryProgressRepository` directly (avoids `expo-sqlite` hang via real `loadBlobMirrorForUser`). Both tests pass in ~100ms.

**Reskin brief updated:** Phase 0.3 baseline capture = native/Maestro for pixel PNGs; `docs/reskin/phase-0/` HTML for colour diff. Phase 1.0 adds theme toggle (system/light/dark) before token swap.

## 2026-06-07 — Med catalogue international brand aliases (branch: feat/meds-catalog-governance)

**Status:** ~57 brand/INN alias sets folded into catalogue JSON (`brandNames` / `matchAliases` on existing rows). No regional overlay layer — aliases live in `medCatalog.*.json` only.

**Examples:** Paracetamol→acetaminophen, Salbutamol→albuterol, Lustral/Efexor/Venlor, Pantocid/Topzol, Rivotril, Eltroxin, Nurofen, etc.

## 2026-06-07 — Med catalogue batch 3 expansion (branch: feat/meds-catalog-governance)

**Status:** Catalogue expanded **215 → 305 rows** via `medCatalog.batch3.json` (90 new entries).

**Source:** ClinCalc 2023 Top-200 outpatient prescription gaps + common generics/combos (statins, GLP-1/SGLT2, insulins, hormones, combos like Augmentin/Norco/Advair).

**Files:** `app/scripts/generateMedCatalogBatch3.mjs`, `app/src/data/medCatalog.batch3.json`, `medCatalog.ts` merge + category labels.

**Validation:** `npm run med-catalog-qa` — 0 governance issues; `npm run typecheck` pass; medCatalog tests pass (incl. batch3 match cases).

## 2026-06-07 — Med module Phase 5: catalog_match_key persistence (branch: feat/meds-catalog-governance)

**Status:** Phase 5 complete — stable catalogue link persisted on `Med`; hot paths use `resolveMedCatalogMatch` (key-first, name fallback).

**What changed:** `catalog_match_key` on `Med` + `upsertMed` auto-resolve. `listMeds` in-memory enrich + async backfill. `findMedCatalogItemById` + `medCatalogMatch.ts`. SQL: `app/Documentation/meds_catalog_match_key.sql` (apply in Supabase).

**Validation:** `npm run typecheck` pass; 81 focused med vitest tests pass.

**Med rebuild:** Phases 0–5 complete on `feat/meds-catalog-governance`.

## 2026-06-07 — Med module Phase 4: governed tag fusion (branch: feat/meds-catalog-governance)

**Status:** Phase 4 complete — catalogue tags × user state fusion drives `domainSignals`, detail notes, insight `meds.domainOverlap`, and tag-aware rules.

**What changed:** `medCatalogFusion.ts` + tag→domain maps in `medCatalogGovernance.ts`. `computeMedContextNotes` uses `domainSignals` (removed dead `catalog` input). `InsightContext.meds.domainOverlap` + 3 new `insights.json` rules. All generated fusion copy governance-linted.

**Validation:** `npm run typecheck` pass; 95 med/fusion vitest tests pass.

**Next:** Phase 5 — optional `catalog_match_key` persistence.

## 2026-06-07 — Med module Phase 3: insight SSOT for detail context (branch: feat/meds-catalog-governance)

**Status:** Phase 3 complete — `useMedDetailContext` reads mood/sleep from `InsightsProvider` (`lastContext` + `lastSource`); no duplicate mood/sleep fetches in med-detail path.

**What changed:** `buildMedDetailInsightSignals()` bridge; canonical lookback constants exported from `contextBuilder.ts`. Per-med dose logs still fetched for dose history + adherence signals.

**Validation:** `npm run typecheck` pass; 65 med vitest tests pass.

**Next:** Phase 4 — tag fusion + `domainSignals` + insight rules.

## 2026-06-07 — Med module Phase 2: inline detail panel (branch: feat/meds-catalog-governance)

**Status:** Phase 2 complete — detail renders inline on MedsScreen accordion; no stack push in normal flow.

**What changed:** `MedInlineDetailPanel` composes Phase 1 blocks over `useMedDetailContext`. MedsScreen accordion (one expanded med). `navigateToMeds(focusMedId)`, notifications, and `reclaim://meds/:id` land on MedsHome+expand. `MedDetails` route kept as redirect shell.

**Validation:** `npm run typecheck` pass; 62 med vitest tests pass.

**Next:** Phase 3 — SSOT via `InsightsProvider.lastContext` (remove duplicate mood/sleep fetch in hook).

## 2026-06-07 — Med module Phase 1: detail context + extracted components (branch: feat/meds-catalog-governance)

**Status:** Phase 1 complete — zero behavior change; MedDetailsScreen is thin composition.

**What changed:** `useMedDetailContext(medId)` frozen output `{ med, catalogMatch, profileMode, schedule, doseHistory, contextNotes, domainSignals }`. Four presentational blocks under `components/meds/`. Badge logic centralized in `medProfileMode.ts`. Signal helpers in `medDetailSignals.ts`.

**Validation:** `npm run typecheck` pass; 38 med Phase 1 vitest tests pass.

**Next:** Phase 2 — inline `MedInlineDetailPanel` on MedsScreen (no stack push).

## 2026-06-06 — Training session second-system removal (branch: feat/meds-catalog-governance)

**Status:** Committed + pushed (`ec4a308`).

**What changed:** Removed parallel optimistic position authority from guided training UI. Single source of truth is DB `performed.sets` + `current_exercise_index`, read via React Query and `sessionWorkAuthority.ts`. Writes go through `applySetCompletion()` with RQ cache patches (`sessionQueryPatch.ts`) for instant UI only.

**Key files:** `TrainingSessionView.tsx`, `sessionWorkAuthority.ts`, `applySetCompletion.ts`, `sessionQueryPatch.ts`, `sessionDerivedState.ts`, `guidedNotificationRoute.ts`, `guidedExternalSetDoneTransition.ts`.

**Validation:** `npm run typecheck` pass; 54/54 training vitest tests pass.

**Next:** Optional — route `guidedTrainingNotificationActions.ts` through `applySetCompletion` for one persistence module.

**Audit:** `docs/audits/second-system-removal-verification.md`

## Handover pointer

**Med rebuild session handover:** `docs/handover/meds-module-rebuild-handover.md` — phase status, frozen contracts, Phase 2 file list, validation commands.
