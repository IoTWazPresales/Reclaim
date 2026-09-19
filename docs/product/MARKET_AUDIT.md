# MARKET_AUDIT — Reclaim (A7)

**Date:** 2026-09-19  
**Sources:** dated web pages below + repo listing/OQ1/privacy/source. External facts are **VERIFIED** against the cited URL on 2026-09-19 unless marked **ASSERTED**.

Web sources used:
- https://support.google.com/googleplay/android-developer/answer/12991134 (Play Health permissions FAQs)
- https://developer.android.com/health-and-fitness/health-connect/publish
- https://appcompliance.io/blog/google-play-health-connect-android-16-declaration/ (Play 2026-04-15 health policy update)
- https://aifithub.io/articles/hevy-vs-strong-vs-fitbod-2026/ (pricing dated 2026-07-23)
- https://www.pocket-fit.app/blog/hevy-vs-fitbod
- https://www.go-go-gaia.com/blog/best-mood-tracking-app.html
- https://habitbox.app/blog/best-mood-tracker-app
- https://www.neurobeatx.com/blog/calm-vs-headspace-2026
- Play listing: Bearable `com.bearable`
- Repo: `docs/release/play-store/LISTING_DRAFT.md`, `docs/handover/competitive-gaps-memo-2026-08-05.md`

---

## Positioning

Reclaim’s claimed differentiators: **guided training**, **mechanistic “why”**, **cross-domain readiness** for people rebuilding — not optimising. That is a real gap in the 2026 set: mood apps don’t coach sets; gym loggers don’t know sleep/meds; meditation apps don’t periodize; Medisafe doesn’t explain training readiness.

The generator today does **not** yet deliver a science-grade routine (see ROUTINE_AUDIT). Market readiness is blocked more by Play Health declaration honesty and account-deletion completeness than by missing features.

---

## Competitor snapshot (2026)

| Product | Job | Strength | Reclaim overlap |
|---|---|---|---|
| Bearable | Symptom × mood × meds correlation | Deep factors, chronic-illness community | Mood + meds + sleep; we lack correlation UI depth |
| Welltory | Wearable HRV / stress / energy | Biometrics, not journaling | We explicitly do **not** ship RHR/HRV this cycle |
| Daylio | Fast mood + activity | Lowest-friction log, streaks | Our mood log is slower; no activity chips at Daylio speed |
| How We Feel | Emotion vocabulary (Yale mood meter) | Granularity, free nonprofit | We use a simple scale |
| Fitbod | Generated workouts + recovery | Per-session generation, RIR, 1000+ demos | Closest training competitor; we add guided/FGS/watch Done |
| Hevy | Logger + optional Trainer | Published double-progression rule, cheap Pro | Our double-progression is similar but history is 18 seeds |
| Strong | Fast manual log | Previous values, charts | We are not a logger-first product |
| Calm | Sleep / relax content | Sleep Stories, ~$70/yr | Our meditation library is thin |
| Headspace | Meditation curriculum | Courses + therapy upsell | We have a short reset, not a curriculum |
| Medisafe | Adherence + interactions + Medfriends | Reminders, refill, family | Educational meds only by policy — do **not** copy interactions |

Stronger adjacent: Oura/Whoop (recovery scores — out of scope), Rise (sleep coaching), Finch (habit pet).

---

## Feature gap matrix

| Feature | Bearable | Fitbod/Hevy | Calm/HS | Medisafe | Reclaim AS-IS |
|---|---|---|---|---|---|
| Fast mood log | yes | no | no | no | yes, double-submit risk |
| Symptom correlation | yes | no | no | no | weak |
| Guided set-by-set + FGS + watch actions | no | no (Wear logging ≠ our FGS) | no | no | **yes — differentiator** |
| Transparent progression rule | no | Hevy yes / Fitbod opaque | no | no | partial (18 ids) |
| Weekly volume model | n/a | Fitbod recovery sets | n/a | n/a | **no** |
| Educational meds + exact catalogue | shallow | no | no | clinical-adjacent | yes, badge overclaims |
| Mechanistic insights | correlations | muscle recovery | content | adherence | **yes, if copy stays “associated with”** |
| HC sleep + overnight vitals | some | some | Apple Health | some | yes; request-set ≠ manifest |
| Meditation library | no | no | huge | no | thin |
| iOS | yes | yes | yes | yes | **no tree** |
| Account delete complete | claimed | typical | typical | claimed | **incomplete** |

---

## Ranked feature shortlist (value × effort × fit)

Score 1–5. Higher = do sooner after correctness. **Questions for operator at GATE 1.**

| Rank | Feature | Value | Effort | Fit | Why |
|---|---|---|---|---|---|
| 1 | Honest weekly volume + week 1–4 progression (C-R) | 5 | 4 | 5 | Makes guided training a product, not a slot picker |
| 2 | Retry onboarding instead of Welcome dump | 5 | 2 | 5 | Activation killer |
| 3 | Account delete completeness | 5 | 2 | 5 | Trust / Play User Data |
| 4 | HC Connect request-set = manifest | 5 | 2 | 5 | Play keep-and-justify |
| 5 | Med curation-tier badge | 4 | 1 | 5 | Honesty |
| 6 | Mood submit lock | 3 | 1 | 4 | Data integrity |
| 7 | “Why this session” on Home (Hearth IA) | 5 | 3 | 5 | Differentiators on the first screen |
| 8 | Wear/lock already Done — polish rest/close | 4 | 3 | 5 | Existing wedge vs Fitbod |
| 9 | Correlation chips (sleep × mood × session) | 4 | 3 | 4 | Bearable’s job without becoming Bearable |
| 10 | iOS parity | 5 | 5 | 3 | Market size; no `app/ios/` |
| 11 | Meditation library expansion | 3 | 4 | 2 | Collides with Calm; keep a short reset |
| 12 | Drug interactions / OCR | 2 | 5 | 1 | Policy: educational only — **do not** |

---

## Market readiness blockers

| Area | Status | Evidence |
|---|---|---|
| Play listing / ASO | Draft exists; Human must paste | `LISTING_DRAFT.md` |
| Data Safety vs flows | **Risk** | Account delete incomplete; HC request ≠ declared keep-set |
| HC permissions / health-app policy | **Blocker** | Play requires per-type justification; Steps/ActiveCal declared but not requested (AA-02). Ghosts RHR/HRV/TotalCalories must stay out of binary. 2026-04-15 policy update added high-sensitivity types we must not request. |
| Privacy / terms | GitHub PRIVACY.md linked from listing | Confirm live URL matches Health Connect privacy link |
| Account deletion | **Blocker** | `deleteAllPersonalData` misses training + mood |
| Crash-free | **UNKNOWN** | Sentry DSN optional; production disables auto upload |
| U5 telemetry | Incomplete | Needs schemed Sentry events (C-T) |
| Activation funnel | **Broken path** | 6s onboard timeout → Welcome |
| Retention loops | Daily signal + reminders | Insights paywalled after 10 rules; Analytics “Coming soon” |
| Paywall | RevenueCat wired; often free-tier | `premiumConfig.ts`; key unset warn |
| Accessibility | Source labels uneven | UI_AUDIT visual **UNABLE_TO_VERIFY** |
| Localisation | Device locale only | No i18n product catalog |
| iOS | **Source gap** | No `app/ios/`; Expo can generate later — not this cycle |

---

## Recommendation

Do not buy growth features until: account delete, HC request/manifest, onboarding retry, and a real weekly volume model. Those four are the difference between “rebuilding companion” and “another incomplete tracker Google will reject.”
