# Reclaim — vision alignment audit

**Scope:** Product vision vs **current shipped surfaces** (code + canonical memory). **Not** Play remediation detail (see `reclaim_play_readiness_audit.md`). **Not** implementation plan.

**Evidence hierarchy:** (1) **User-facing copy** in repo, (2) **canonical memory** / discussion recon, (3) **structure** (nav, major screens), (4) **Inference** where labeled.

---

## Reconstructed core vision (evidence-backed)

Synthesized from **`reclaim_provisional_origin_note.md`**, **`reclaim_discussion_recon.md`**, **`reclaim_master_inventory.md`**, and **onboarding copy** (below). Early ChatGPT export is **partial** — principles are **discussion-level** unless echoed in product UI.

| Theme | Source | In app today? |
|-------|--------|----------------|
| **Integrated recovery / daily wellbeing** — mood, sleep, habits, training, mindfulness in one place | Onboarding `WelcomeScreen.tsx`, `CapabilitiesScreen.tsx`; inventory | **Yes** — broad surface area |
| **Interpretability** — user understands *why* something is suggested | `insights.json` `message` / `why` / `action` fields; `InsightEngine.ts` | **Partially** — strong in rules; not a single named “STATE→MEANING→ACTION” pattern app-wide (**UNVERIFIED** as branded frame, per inventory §D) |
| **No guilt-driven UX** | ChatGPT reconstruct | **Inference** — not audited sentence-by-sentence across all copy |
| **Explicit uncertainty** where data is thin | `fetchHeartRateContextSummary.ts` (Android empty resting HR); gates in `notificationTriggers.ts` | **Partially** |
| **Meaningful notifications** (not raw metrics) | Discussion recon; `notificationTriggers.ts`, schedulers | **Partially** — training/notif complexity; HR spike path Android-only |
| **Premium command center home** | ChatGPT reconstruct + Codex “dashboard critique” (WANTED) | **Partially** — `Dashboard.tsx` is feature-rich (`PremiumStarfield`, `LifecycleHero`, `HomeDashboardTile`, recovery meta) **Inference:** polish vs clutter is subjective |
| **Health data tied to visible surfaces** | Phase 0 + Play narrative | **Partially** — sleep vitals surfaced; training HC calorie copy **weak** (Play audit) |

---

## One-sentence product promise (from the app)

**Evidence (onboarding):** `WelcomeScreen.tsx`:

> *“Reclaim connects your mood, sleep, and habits into one clear daily insight — personalised to you.”*  
> Headline: *“Feel better, one day at a time.”*

**Capabilities** (`CapabilitiesScreen.tsx`) adds: daily **signal**, **training & meds**, **mindfulness resets**, sleep/recovery framing.

**Audit use:** Treat this as the **primary** promise the **current build** presents to new users — not the full historical ChatGPT vision.

---

## Current app reality (what it actually is)

| Dimension | Reality | Key surfaces |
|-----------|---------|----------------|
| **Shell** | Auth → onboarding stack → drawer + tabs (`reclaim_architecture_recon.md`) | `RootNavigator.tsx`, `AppNavigator.tsx`, `TabsNavigator.tsx` |
| **Home** | Large compositional dashboard: greeting, recovery, insights, tiles, routines, schedule overlay, sync | `Dashboard.tsx` (+ `components/dashboard/*`) |
| **Domains** | Sleep, mood, meds, training, mindfulness, meditation, analytics, settings, integrations, notifications, about, privacy, evidence, moments | `screens/*.tsx` per navigator |
| **“Science” layer** | Rule engine + JSON catalog with actions and “why” | `insights.json`, `InsightsProvider.tsx`, `InsightEngine.ts`, `contextBuilder.ts` |
| **Health** | Android HC narrow scope; Apple HealthKit bundle broader on iOS | `healthConnectService.ts`, `integrations.ts` |
| **Constraints** | Play minimum scope **narrows** Android health ambition vs historical “all HC fields” discussion | `reclaim_release_scope.md`, Play audits |

---

## Major alignment wins

1. **Onboarding promise ↔ engine shape** — mood + sleep + habits + daily insight is **implemented** via insights + dashboard, not only marketing.
2. **`insights.json` interpretability** — many rules include **`why`** and concrete **`action`** (evidence-led, non-clinical tone with crisis routing where appropriate, e.g. `mood-sustained-low`).
3. **Sleep as recovery hub** — rich `SleepScreen.tsx` (including overnight vitals when present) matches “sleep & recovery” capability slide.
4. **Training + mindfulness** as nervous-system / structure supports “training & exercise” and “mindfulness resets” slides.
5. **Recovery stage model** — `lib/recovery`, `DashboardRecovery`, `SettingsScreen` recovery sections align with a **journey** metaphor.
6. **Visual language investment** — `reclaimVisualLanguage.ts` usage across dashboard/settings **Inference** supports premium intent vs stock Paper.
7. **Honest platform limits (partial)** — Android resting HR insight gap is **documented in code** (`fetchHeartRateContextSummary.ts`).

---

## Major mismatches

1. **STATE → MEANING → ACTION** — repeated in memory as durable principle; **no** equivalent branded narrative proven across primary surfaces (**Open** / **UNVERIFIED**).
2. **Steps / activity insights vs Android HC scope** — `insights.json` includes `low-activity-mood` (`steps.lastDay`); context from `listDailyActivitySummaries` (**Inference:** may be **sparse** on Android without step pipeline — rule may rarely fire or feel “dead”).
3. **Resting HR / recovery copy on Android** — vitals context for insights is **iOS-skewed**; risk of **implied** parity (inventory §C).
4. **“One clear daily insight” vs density** — dashboard stacks **many** cards, tiles, routines, overlays — **Inference:** can feel like **many** signals, not **one** (**tension** with welcome copy).
5. **Integrations placeholders** — Garmin/Huawei **setup required** flows (`integrations.ts`) **Inference:** peripheral to core promise unless positioned as roadmap-only.
6. **Training “Health Connect” active calories** — vision of honest health storytelling **conflicts** with weak HC calorie path (`reclaim_play_readiness_audit.md`) — **trust** issue as much as policy.
7. **iOS vs Android reactive HR** — mindfulness spike story **Android-primary**; partial parity (**inventory**).

---

## Feature drift / clutter (summary)

Detail: `reclaim_feature_drift_and_clutter.md`.

---

## Premium UX gaps (summary)

Detail: `reclaim_premium_experience_gaps.md`.

---

## Launch-critical missing pieces (vision lens)

If “launch” means **the app still feels like Reclaim** (not generic tracker):

1. **Single primary daily story** — reduce or **sequence** dashboard hierarchy so “daily insight” reads as **the** anchor, not one of many tiles (**product/design**).
2. **Android insight fairness** — steps/resting-HR-dependent rules either **degrade gracefully** with copy or **scoped** so users aren’t promised signals the platform doesn’t feed.
3. **Remove or relabel weak health claims** — training HC calories line until true (**aligns** vision + Play).
4. **Close trust Tier 1** items still in `PHASE_7_UI_AUDIT_BACKLOG.md` that contradict **premium** (placeholders, broken metaphors).

Detail: `reclaim_launch_non_negotiables.md`.

---

## Verdict: does current Reclaim match its intended identity?

**Partial match — strong on breadth and interpretable rules, weaker on singular focus and cross-platform fidelity.**

The **implemented** identity is closer to **“integrated recovery OS”** (mood, sleep, meds, training, mindfulness, recovery stages, deep dashboard) than to a **minimal** “one insight a day” app — while **onboarding copy** still emphasizes **one clear daily insight**. That **tension** is the main **identity** gap. **Play-driven narrowing** of Android health is **real** and must be **owned in product narrative**, not only compliance.

---

## Relation to Play/policy audits

Minimum-scope HC **constrains** how much “objective” health signal Android can feed insights; it does **not** remove the vision but **changes** which rules fire and what can be promised. **Do not** “optimize for submission” by **narrowing the product story** in the store without **matching** what the home screen still implies.

---

*Cross-reference: `reclaim_vision_gap_matrix.md`, `reclaim_launch_non_negotiables.md`.*
