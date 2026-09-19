# APP_AUDIT — Reclaim (A4)

**Date:** 2026-09-19  
**Branch:** `fix/training-confident-ux` @ `cf12b4d` + A3 harness  
**Mode:** source SoT maps + defect register. Device reproduction **UNABLE_TO_VERIFY** until A2 HEAD debug client (`dumpsys` at A1: 1.0.4 / versionCode 8, not debuggable).  
**Drafts:** `docs/eif/drafts/APP_AUDIT_CORE.md`, `docs/eif/drafts/APP_AUDIT_REST.md`

Every claim is **VERIFIED** (file opened) or **ASSERTED**. Runtime behaviour is **UNABLE_TO_VERIFY** without the HEAD APK.

Frozen invariants still hold in source: notifications `setIntent` + `reconcileNotifications`; guided work `performed.sets` + `sessionWorkAuthority` + `applySetCompletion`; guided alive transport native FGS; Health Connect only; med catalogue exact-name.

---

## Reported-bug verdicts

| Seed bug | Verdict | Evidence |
|---|---|---|
| Training loading loop | **CONFIRMED** residual | `TrainingScreen.tsx` spinner when `activeSessionId` set and query empty |
| Erratic notifications mid-guided | **CONFIRMED** mechanism | Foreground force-reconcile + drain in `useNotifications.ts`; OS cancel side-path still exists |
| Login returning to onboarding | **CONFIRMED** | 6s remote race → `onboardStatus='no'` → Welcome |
| Stale session timer 945 min, blocks tabs | **CONFIRMED** | Wall-clock from `started_at`; non-dismissable stale dialog; 5h freeze in `staleSessionGuard.ts` |
| Guided rest + close | **PARTIALLY CONFIRMED** | Canonical rest/close exist; restore races remain |
| Doze force-idle | **UNABLE_TO_VERIFY** | Needs A2 client + `adb dumpsys deviceidle force-idle` |
| OEM battery-kill FGS | **UNABLE_TO_VERIFY** | Needs OEM device; source has native FGS |
| Mood check-in double-log | **CONFIRMED** | MoodScreen Save has no in-flight lock; new UUID per tap |
| Cardio in gym-shaped module | **CONFIRMED** | Dead `cardio` equipment token; PPL often omits conditioning |
| `guidedTrainingNotificationActions` second writer | **REFUTED** as `scheduleNotificationAsync` writer (uses setIntent); **OPEN** OS cancel side-path elsewhere |
| 1kg / 5kg increment | **REFUTED as bug** — intentional equipment-aware step |
| Med “Curated profile available” | **CONFIRMED semantics** — copy is now “Educational reference matched”; any catalogue hit; no reviewed field |
| Cold start 14–18s permission gate | **PARTIALLY REFUTED** as current long-pole (X-26 backgrounds reconcile); splash still waits Phase C; live timing **UNABLE_TO_VERIFY** |
| Onboarding 6s timeout → Welcome | **CONFIRMED** | Same as login→onboarding |
| Stale `app/CLAUDE.md` / AGENTS.md | **CONFIRMED** | CLAUDE: meds branch / 215 rows; AGENTS: vc12; tree: vc15 / 357 rows |

---

## Ranked defects (charter input)

Severity: S0 data-loss / account / safety · S1 user trapped or false onboarding · S2 correctness · S3 hygiene.

| ID | Sev | Surface | Class | Defect |
|---|---|---|---|---|
| AA-01 | S0 | privacy | BUG | `deleteAllPersonalData` omits `mood_checkins` and all `training_*` |
| AA-02 | S0 | HC / Play | BUG | Manifest declares Steps + ActiveCalories; Connect request set does not include them |
| AA-03 | S1 | onboarding | BUG | Remote timeout/error dumps returning users onto Welcome |
| AA-04 | S1 | training | BUG | `activeSessionId` without payload = spinner / flash loop residual |
| AA-05 | S1 | guided | BUG | Stale wall-clock timer + non-dismissable dialog traps tab nav |
| AA-06 | S1 | notifications | BUG | Foreground reconcile storms mid-guided session |
| AA-07 | S1 | RLS | BUG | Repo SQL: no `sleep_sessions` policies; `app_logs` SELECT allows `auth.uid() IS NULL` — **live DB UNKNOWN** |
| AA-08 | S2 | mood | BUG | Double-submit mints two check-ins |
| AA-09 | S2 | meds | WRONG-MODEL | Badge fires on any exact-name hit; no curation-tier / reviewed gate |
| AA-10 | S2 | training | NO-MODEL | Generator has no weekly volume / weekIndex / experience persistence (see ROUTINE_AUDIT) |
| AA-11 | S2 | performance | BUG | Splash still serializes Phase C; lists mostly `ScrollView` |
| AA-12 | S2 | copy | BUG | Mechanistic copy risk: “causes” vs “associated with” (sweep in C-L) |
| AA-13 | S3 | hygiene | DATA | Empty catches in `trainingProgramPerformanceSeed.ts`; unused zustand; stale CLAUDE/AGENTS |
| AA-14 | S3 | analytics | NO-MODEL | Analytics tab is “Coming soon”; U5 Sentry schemed events incomplete |
| AA-15 | S3 | i18n / iOS | NO-MODEL | No i18n product strings; no `app/ios/` tree |

Full SoT maps live in the two draft files. Highest-risk writers:

| Surface | Persistence SoT | Cache | Dangerous writer |
|---|---|---|---|
| Auth | Supabase Auth + SecureStore | AuthProvider | onboard fail-safe `'no'` |
| Guided session | `training_sessions` + items `planned`/`performed` | RQ `training:session` | start insert-once; completion via `applySetCompletion` |
| Notifications | intent store | reconciler | anything besides setIntent (OS cancel leftovers) |
| Mood | `mood_checkins` | RQ | unlocked Save |
| Meds | user meds + static catalogue | RQ | badge = any catalogMatch |
| Sleep | `sleep_sessions` + local SQLite | split 30d keys | HC request set ≠ manifest |
| Insights | InsightEngine + InsightsProvider | context builder | rule copy |
| Account delete | `deleteAllPersonalData` | — | incomplete table list |

---

## Test coverage vs behaviour

- Strong: guided completion, dual-path audit, med catalogue QA (357/0), notification presence, onboarding helper (not RootNavigator).
- Missing: RootNavigator timeout, MoodScreen double-submit, account-delete completeness, HC request-set vs manifest, live Doze/FGS.

---

## What else is wrong (beyond the seed list)

- Setup omits `experienceLevel` and snapshot preferences (`includeSkillWork`).
- `adaptSession` exists and is unused.
- Swap copies old loads onto the new exercise (no re-prescribe).
- Weekly volume UI can return null when primary tags miss `MUSCLE_TO_BUCKET`.
- RevenueCat paywall exists; API key often unset → free-tier only (**ASSERTED** from `usePremium.ts` warn path).
- Dual-path audit script is CRLF-fragile on System32 bash (PHASE_2).
