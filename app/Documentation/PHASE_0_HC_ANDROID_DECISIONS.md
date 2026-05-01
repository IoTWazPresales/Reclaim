# Phase 0 — Locked decisions (Health Connect–only Android + Play scope)

**Status:** Completed (decisions locked for downstream phases).  
**Date:** 2026-04-01 (session).

---

## Decision 1 — Android health pipeline

**Locked:** On **Android**, **Health Connect** is the **only** supported health data pipeline for **reads, sync, imports, and (after implementation) triggers**.

**Locked:** **Remove** production dependence on **Google Fit** on Android (OAuth, `react-native-google-fit`, sleep/activity/vitals reads, and notification trigger subscriptions).

**Rationale:** Aligns with Google’s **Fit → Health Connect** migration direction; simplifies one integration for reviewers and users; removes duplicate permission stories.

---

## Decision 2 — Stress auto-trigger (Android)

**Locked:** **Option (a)** — When Google Fit is removed from Android, **suspend** the **automatic “high stress” push notification** (`googleFitSubscribeStress` path). **No** Health Connect replacement in the **first** HC-only ship unless re-approved in a later phase.

**Rationale:**

- Health Connect does **not** expose a **first-class “stress level”** record comparable to the current Google Fit–based stress stream in this app.
- Related HC types (e.g. mindfulness/symptom areas on the platform) are **not** drop-in replacements for the current trigger without new product, permission, and compliance design.
- **Option (b)** (conservative HR/HRV poll + careful non-clinical copy) remains a **future** enhancement, **not** part of Phase 0 scope lock.

**User impact:** Android users lose **only** the automated **stress** nudge until a future phase explicitly designs a replacement.

---

## Decision 3 — Google Play “minimum scope” (Health Connect permissions)

**Locked principle:** Request **only** HC data types that are **essential** for **current, demonstrable** features (in-app and/or clearly described in the store). Match **manifest**, **runtime requests**, **Play declarations**, and **Data safety**.

**Locked intent for first policy-resubmit build (aligned with rejection letter):** Treat Google’s listed types as **candidates for removal** unless Phase 1 maps each to a **visible** or **explicitly declared** feature:

| Area | Google flagged (non-exhaustive) | Phase 0 direction |
|------|-----------------------------------|---------------------|
| Activity | ActiveCaloriesBurned, TotalCaloriesBurned, Steps, ExerciseSession | **Remove from permission set** unless Phase 1 proves a **clear** user-facing feature + copy; otherwise **remove or gate UI** that implied need. |
| Vitals (overnight enrichment) | HeartRate, HRV, RestingHeartRate, RespiratoryRate, BodyTemperature, OxygenSaturation | **Split:** keep **only** what Phase 1 ties to **on-screen sleep vitals** and/or **HR mindfulness trigger**; drop the rest **or** add **dedicated UI** before keeping. |

**Concrete baseline to validate in Phase 1 (not yet implemented):**

- **READ_SLEEP** — **Keep** (core sleep sync and UI).
- **READ_HEART_RATE / READ_RESTING_HEART_RATE / READ_HEART_RATE_VARIABILITY** — **Keep candidate** for: sleep-session vitals display, daily vitals sync, and **future** HC-poll HR trigger + resting context. **Trim** if Phase 1 cannot show reviewer a **clear** use for each permission.
- **READ_OXYGEN_SATURATION, READ_RESPIRATORY_RATE, READ_BODY_TEMPERATURE** — **Default remove** on first resubmit **unless** Phase 1 adds **visible** sleep vitals or listing text that matches (current code enriches DB more than UI).
- **Steps / calories / exercise** — **Default remove** on first resubmit **unless** Phase 1 documents a **primary** user-visible feature (e.g. dashboard steps) **and** Play text matches.

**Caveat:** Cutting permissions may require **code paths** to degrade gracefully (no sync row for removed types). Phase 1 owns the **exact** keep/remove list after a short **permission ↔ screen** matrix.

---

## Next phase

**Phase 1:** Build the **permission ↔ feature** matrix and finalize the **exact** HC read set + manifest/plugin changes before implementation.
