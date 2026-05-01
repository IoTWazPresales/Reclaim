# Reclaim — launch narrative and honest claims

**Audience:** Play store listing, in-app onboarding, **short** marketing, **support** scripts. **Not** legal advice — **OQ-7** medical-adjacent sign-off remains **open** (`reclaim_trust_risk_notes.md`).

**Architecture truth:** `InsightContext` is **insights-only**; **no** single global ranker (`reclaim_architecture_formalization_decisions.md`).

---

## What the app **can** honestly promise

| Theme | Honest claim | Grounding |
|-------|--------------|-----------|
| **Daily interpretation** | Reclaim combines **your logs** (mood, meds, training, etc.) and **permitted** health data into **personalised insights** with explanations (`why`) where rules apply | `InsightEngine`, `insights.json`, `fetchInsightContext` |
| **Sleep & recovery context** | On **Android** with Health Connect, Reclaim can read **sleep** and **selected overnight vitals** (e.g. SpO2, respiratory rate, temperature — **as implemented** on `SleepScreen.tsx`) when granted | `withHealthConnectPermissions.js`, `reclaim_play_readiness_audit.md` |
| **One place for wellbeing** | **Drawer** surfaces for mood, sleep, meds, training, mindfulness, meditation — **breadth** | `reclaim_vision_alignment_audit.md` “integrated recovery OS” |
| **Notifications with intent** | Reminders for training, meds, optional **HR-informed mindfulness nudges** on **Android** (when triggers enabled), calendar nudges, daily signal from **insights** | `notificationTriggers.ts`, `scheduleDailySignalNotification` from `Dashboard.tsx` |
| **Not a medical device** | Disclaimers in `storeCompliance.ts`, `HealthDisclaimerModal.tsx` — **keep** accessible | Trust baseline |
| **Crisis routing** | Low mood rules can surface **988** / help — **non-clinical** framing in rules | `insights.json`, `reclaim_launch_non_negotiables.md` |

---

## Language to **avoid** or **qualify** (Android v1)

| Avoid / qualify | Why |
|-----------------|-----|
| **“Full Health Connect”** or **“all your health data”** | Manifest is **narrow**; historical rejection on excess types (`reclaim_discussion_recon.md` §4). |
| **“Steps,” “active calories,” “resting heart rate,” “HRV” from Health Connect** on **Android** | **Not** in current HC plugin / default metrics for the Play build (`reclaim_permission_justification_matrix.md`). |
| **“Same experience on iPhone and Android”** for **vitals-based** insights | Android HC **no** RHR series in insights context path; iOS differs (`fetchHeartRateContextSummary.ts`). |
| **“Google Fit”** | Removed from codebase — do **not** resurrect in copy (`reclaim_master_inventory.md`). |
| **“Garmin / Huawei connected”** as if turnkey | Setup walls / placeholders (`reclaim_feature_drift_and_clutter.md`). |
| **“Automated recovery stage progression”** | **`setRecoveryStage` / `markStageCompleted`** not evidenced outside `recovery.ts` — use **“journey”** / **“guidance”** until wired (`reclaim_architecture_discovery_vs_prior_audits.md`). |
| **Clinical outcomes** — cure, treat, diagnose | **Non-clinical** positioning (`reclaim_trust_risk_notes.md`). |
| **“One insight only”** if Home still shows **many** tiles | **Tension** (`reclaim_vision_alignment_audit.md`) — prefer **“clear daily insight”** + **“your command center”** **or** narrow UI. |

---

## Onboarding ↔ store ↔ Home (alignment)

| Source | Suggested alignment |
|--------|---------------------|
| **`WelcomeScreen.tsx`** — “one clear daily insight” | Either **elevate** insight card hero in **first session** **or** soften to **“clear insights”** / **“daily signal”** + command center (`reclaim_vision_gap_matrix.md`). |
| **`CapabilitiesScreen.tsx`** — training, mindfulness, signal | **Honest** if training + notifications + rules work; **qualify** “personalised program” if adaptiveness **simpler** than copy (`reclaim_vision_gap_matrix.md` **Inference**). |
| **Play short description** | Mirror **narrow** HC + **insight** value + **not medical** — see `reclaim_play_readiness_audit.md` listing section. |

---

## Narrative that **matches** architecture

**Paragraph for internal + listing drafts:**

> Reclaim helps you notice patterns across mood, sleep, and habits. **Inside the app**, a **rules-based insight engine** (`insights.json`) scores what matters **for insights**, while a **separate recovery-style card** on Home gives **structured next steps** from the same kinds of data — **without** merging into one hidden “score.” **Health Connect (Android)** is intentionally **limited** to what the app **uses in UI** and declares to Google. **Notifications** remind you about training, medications, and optional context-aware nudges; the **daily signal** can reflect your **top insight** when enabled.

**Inference:** Shorten for store character limits; **preserve** narrow-HC + dual-card truth.

---

## What **not** to say in Data safety / declarations

- Do **not** declare HC data types **not** requested by the shipping binary.
- Do **not** under-declare **account identifiers** in telemetry if `user_id` is sent (`reclaim_trust_risk_notes.md`).

---

*Manual Console work: `reclaim_manual_release_work.md`.*
