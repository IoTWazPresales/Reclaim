# Reclaim — Play readiness audit (formal pass 1 + 2026-07-17 refresh)

**Scope:** Policy / Play / trust / permissions only. **Not** a full code quality or UX polish audit.  
**Baseline memory:** `docs/memory/derived/reclaim_canonical_memory_status.md` (v0.9 provisional).  
**Verbatim Play evidence:** `docs/memory/raw/play-console/2026_04_08_*.md`, `2026_04_16_*.md`.

**Current `versionCode` in repo:** **8** (`app/app.config.ts`). **Play evidence** references **version code 7** (second rejection). **Open:** whether versionCode 8 (or later) was submitted and what declaration it used (**OQ-1**, **OQ-2**).

**Docs refresh date:** 2026-07-17 — code truth re-checked against `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` on `fix/training-confident-ux`.

---

## Executive verdict (2026-07-17)

**Credibility of a near-term production resubmission:** still **low to moderate** until Play Console **Health Connect declaration + Data safety + store listing** are proven aligned with the **built APK**.

**Important change since pass 1:** the Health Connect **plugin now declares** `READ_STEPS` and `READ_ACTIVE_CALORIES_BURNED` (plus existing sleep/vitals/HR, and `WRITE_EXERCISE`). Those two types were **explicitly cited in the second rejection (version 7)**. Re-adding them without a crystal-clear Console + listing story **raises** resubmission risk vs the earlier “narrow sleep+vitals+HR” posture.

**Default connect bundle** (`HEALTH_CONNECT_DEFAULT_METRICS`) still requests only: sleep, heart_rate, SpO2, respiratory_rate, body_temperature. Steps / active calories are requested on **selective paths** (HR nudge inactivity gate; training session start / finish kcal read-back). Manifest ⊃ default connect — reviewers will still see the broader XML permissions.

**Likely to fail again if:** (1) Console still lists types you don’t use **or** omits types you now declare; (2) listing does not justify steps (inactivity gate only) and active calories (post-session read-back only); (3) listing still claims RHR/HRV/total calories from HC; (4) privacy / Data safety under-declares remote logging.

---

## Currently declared Android HC (code truth)

### Manifest (`app/plugins/withHealthConnectPermissions.js`)

| Permission | Product justification (must appear in listing / Health form) |
|------------|--------------------------------------------------------------|
| `READ_SLEEP` | Sleep import + Sleep screen |
| `READ_HEART_RATE` | Sleep enrichment + optional elevated-HR mindfulness nudge |
| `READ_OXYGEN_SATURATION` | Overnight vitals on Sleep |
| `READ_RESPIRATORY_RATE` | Overnight vitals on Sleep |
| `READ_BODY_TEMPERATURE` | Overnight vitals on Sleep |
| `READ_STEPS` | **Only** inactivity confirmation before HR breathing nudge — **not** a step tracker |
| `READ_ACTIVE_CALORIES_BURNED` | Read-back overlapping training session window after finish |
| `WRITE_EXERCISE` | Write ExerciseSession for completed training sessions |

### Default runtime connect (`HEALTH_CONNECT_DEFAULT_METRICS`)

Sleep + heart_rate + oxygen_saturation + respiratory_rate + body_temperature.  
**Does not** include `steps` or `active_energy` — those are requested on feature paths (`notificationTriggers` / `exerciseSessionWriter`).

### Not in Android HC scope (intentional)

Resting HR, HRV, total calories as HC reads. Android elevated-HR baseline uses overnight **HeartRate** proxy (not RestingHeartRate permission).

### `ACTIVITY_RECOGNITION`

**Not** present in `app.config.ts` permissions (as of 2026-07-17). Older audit rows that assumed it was declared are **stale**.

---

## Currently defensible (if Console matches)

| Area | Strength | Condition |
|------|----------|-----------|
| Sleep + overnight SpO2/RR/temp UI | Strong | Listing shows Sleep vitals |
| HR for optional mindfulness spike | Medium–strong | Listing: optional, disableable, not diagnosis |
| Exercise session write after training | Medium–strong | Listing: workout logging via Health Connect |
| Steps for inactivity gate only | Medium | Listing must **not** sell “step tracking”; Console purpose = nudge safety |
| Active calories session read-back | Medium | Listing: post-workout energy from HC if available; no live Wear calorie UI claim |
| Medical disclaimer strings | Medium | Listing parity + legal (**OQ-7**) |

---

## Fragile / must-close before resubmit

| Issue | Severity | Action |
|-------|----------|--------|
| **Console / Data safety unknown vs APK** (**OQ-1**) | P0 | Export forms to `docs/memory/raw/play-console/`; reconcile every HC line |
| **Steps + ActiveCalories back in manifest** after second rejection cited them | P0 | Either (A) declare + justify narrowly, or (B) remove from plugin until Play strategy ready |
| **`HEALTH_API_COVERAGE.md` must match plugin** | P0 | Keep in sync (refreshed 2026-07-17) |
| **Default connect omits steps/calories while manifest declares them** | P1 | Document in Console as “requested when feature runs”; or add to default + UX consent copy |
| **versionCode 8 submission status** (**OQ-2**) | P1 | Confirm in Console |
| **Privacy policy URL live** (**OQ-4**) | P1 | Verify vs `storeCompliance.ts` |
| **Telemetry / `user_id` on `app_logs`** | P2 | Data safety honesty |
| **Play Integrity function** (**OQ-5**) | P2 | Verify deployment |

---

## Must-fix before resubmission

1. **Prove** Play Console Health Connect declaration + Data safety match **current** plugin (including steps + active calories + exercise write) **or** strip plugin back to the pass-1 narrow set before building.
2. **Store listing** — one visible sentence per declared type (especially steps = inactivity gate; calories = post-session read-back; no “live Wear calorie burn” claim).
3. **Do not** list RHR / HRV / total calories from HC unless code requests them.
4. **Quarantine** any stale Console rows from version 7 rejection era.
5. Confirm privacy policy + support contact URLs.

---

## Should-fix

1. Align insights / dashboard copy with Android resting-HR limitation (overnight proxy, not RestingHeartRate).
2. Final-pass **device** walkthrough still pending (`docs/audits/final-walkthrough.md`).
3. Bump `versionCode` / store version for the binary that actually carries this HC set; keep Console story tied to that build.

---

## Defer / remove options (product choice)

| Item | Option A (prefer if shipping training kcal + HR nudge) | Option B (safer vs second rejection) |
|------|--------------------------------------------------------|--------------------------------------|
| `READ_STEPS` | Declare + “inactivity gate only” listing | Remove from plugin; degrade nudge without step gate |
| `READ_ACTIVE_CALORIES_BURNED` | Declare + post-session read-back only | Remove from plugin + UI strings until Play strategy ready |
| Live Wear workout / Health Services | **Defer** | Not in app |

---

## Audit questions — refreshed answers

1. **Strongly defensible:** sleep + overnight vitals when Sleep UI shows them; narrow non-request of RHR/HRV.
2. **Newly fragile:** steps + active calories in **manifest** after second rejection named them — only defensible with tight Console + listing.
3. **Story mismatches:** manifest ⊃ default connect; internal docs must not invent RHR/HRV.
4. **Must be true:** Console + listing + APK same story; no stale coverage paste.
5. **Trust:** telemetry, medical wording, optional HR nudges disclosed.

---

*Next update: after Console export/screenshots land in `docs/memory/raw/play-console/` or **OQ-1** closed with evidence.*
