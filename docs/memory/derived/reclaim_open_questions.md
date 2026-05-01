# Reclaim — open questions (after raw memory merge)

Items that remain **unsettled** after ingesting `docs/memory/raw/**` and reconciling with the current tree.

**Baseline:** `reclaim_canonical_memory_status.md` (**v0.9 provisional**). **No** substantive files yet in `docs/memory/raw/policies/` (only `.gitkeep`); policy **history** beyond Play rejection text is **not** imported.

**Normalization:** None of the questions below were **closed** by the v0.9 pass — missing evidence is explicit in the status doc and export queue.

| # | Question | Why still open |
|---|----------|----------------|
| OQ-1 | Does the **current** Google Play **Data safety** + **Health Connect declaration** text match the **latest** submitted AAB (`versionCode` in `app/app.config.ts` / Gradle) **and** `withHealthConnectPermissions.js`? | Rejection excerpts prove **past** mismatches on **version code 7** (second letter) and an earlier build (first letter). **No** full export of Console form fields is in repo. |
| OQ-2 | After scope narrowing, did a submission **pass** review, or are further rounds pending? | Rejections are imported; **no** approval message in `raw/play-console/`. |
| OQ-3 | Has a **production AAB** been built with current `app/eas.json` **production** profile and validated on hardware? | Requires EAS dashboard + devices. |
| OQ-4 | What **privacy policy URL** and **support contact** are live for the store listing? | Not in raw memory or committed listing copy. |
| OQ-5 | Are **Supabase Edge Functions** (e.g. `verify-play-integrity`) deployed for the same project as `EXPO_PUBLIC_*`? | Code invokes; deployment not proven in repo. |
| OQ-6 | **iOS** TestFlight / App Store scope for this release cycle? | External decision. |
| OQ-7 | Legal/compliance sign-off on **medical disclaimer** and **evidence notes**? | External. |
| OQ-8 | Which **external** notification reliability fixes from Claude/Codex narratives (e.g. `firedAt` on intents, stable training fingerprint in `NotificationScheduler`) are **fully** present vs **partially** absent? | **Evidence:** `NotificationScheduler.ts` has **no** `firedAt` symbol (grep); background task + training logs **are** in `useNotifications.ts`. Full parity with exported “complete fix” **unverified**. |
| OQ-9 | What is the **earliest verbatim** record of Reclaim product framing (the **user states** ideation by **~Oct 2025**)? | `raw/chatgpt/2026-04-19_*` is **reconstructed** mentions, not a full account export; earliest **named** snippet in that pack is **2026-03-22** (“Welltory vs Reclaim”). **No** Oct 2025 ChatGPT dump in repo. |

**Closed by raw memory (were previously vague):**

- ~~What did Google cite in rejections?~~ → Answered by `raw/play-console/*.md`.

*Update when a new raw export or store outcome is added.*
