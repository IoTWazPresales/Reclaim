# Outstanding backlog (reconciled 2026-07-17)

**Authority date:** 2026-07-17  
**Active code branch:** `fix/training-confident-ux` @ `e9a02d0`

This file supersedes scattered “open/deferred” wording in older handovers where they conflict.

---

## P0 — Do before calling current work done

| ID | Item | Notes |
|----|------|-------|
| B-01 | New EAS `preview` build from latest HEAD | Insight teal, session modal, Home gaps, **Unit 1 insight actions** |
| B-02 | Device smoke: Home gaps + Start/Review sheet + insight chrome + **executable insight CTA** | |
| B-03 | Evening Wear / stale checklist | See `training-confident-fixes-handover.md` |

## Monetization lock

| Item | Status |
|------|--------|
| `EXPO_PUBLIC_PROMOTIONAL_RUN` | **Stay ON** until ≥ **1000 users** (Human 2026-07-17). Do not enable charging before that. |

## Insight Engine loop (pre-Play)

| Unit | Name | Status |
|------|------|--------|
| U1 | Typed action intents + executable Dashboard CTAs | ✅ `c6e28c6` |
| U2 | Full rules/explanations/actions audit | ✅ (this pass) — `docs/audits/insight-rules-audit.md` |
| U3 | Verify-lite acknowledgment after action | ⏳ next |

## P0 — Play / store (before production resubmit)

| ID | Item | Notes |
|----|------|-------|
| P-01 | Export Play Console HC + Data safety forms (**OQ-1**) | Land in `docs/memory/raw/play-console/` |
| P-02 | Align Console with plugin **or** strip `READ_STEPS` / `READ_ACTIVE_CALORIES_BURNED` | Second rejection cited these types |
| P-03 | Listing copy per declared HC type | Steps = inactivity gate only; kcal = post-session read-back |
| P-04 | Confirm privacy policy + support URLs (**OQ-4**) | |
| P-05 | Confirm versionCode / binary submission history (**OQ-2**) | |

## P1 — Manual QA leftovers

| ID | Item | Notes |
|----|------|-------|
| Q-01 | Session Finish confirm + complete summary | Manual; adb Start flaky |
| Q-02 | Stale Resume/Discard UI | DEV client + `EXPO_PUBLIC_STALE_SESSION_MINUTES` |
| Q-03 | Final-pass device walkthrough | `docs/audits/final-walkthrough.md` — still PENDING |

## P2 — Optional engineering

| ID | Item | Notes |
|----|------|-------|
| E-01 | AppCard double-margin on non-Home screens | Same pattern Home fixed |
| E-02 | Onboarding screens still on `padding: 24` outside Phase 4 list | |
| E-03 | Home widgets (native) | Deferred since final-pass Phase 7 |
| E-04 | Live Wear workout / Health Services | Explicit non-goal |

## Closed recently (do not re-open)

| Item | Commit / note |
|------|----------------|
| X-11 week SSOT | `9df3aa2` |
| X-26 cold-start | `3545d42` |
| Wear Done durable path + jump/HC/HR/stale/diagrams | `fdf16e3` |
| Insight gold / empty modal / Home section gaps | `7e78b80`, `e9a02d0` |
| Med rebuild Phases 0–5 | `feat/meds-catalog-governance` |

## Explicitly deferred product

Fuzzy med match · drug interactions · OCR · Google Fit · schema migrations without approval

---

## Elevation track (consult READY — not started)

See `docs/handover/market-elevation-consult-2026-07-17.md` (Fable CONSULT 2026-07-17).

| Unit | Name | Gate |
|------|------|------|
| U1 | Signal Ledger + Explanations | After B-01–B-03 device smoke |
| U2 | Readiness + adaptive planning + Play listing | After Human chooses default vs opt-in HC steps/kcal |
| U3 | N-of-1 experiments | After U1 |
| U4 | Widget + Wear tile | After U1 |
