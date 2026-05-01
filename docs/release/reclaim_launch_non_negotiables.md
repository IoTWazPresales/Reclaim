# Reclaim — launch non-negotiables (vision + trust)

**Framing:** Items that protect **“this is Reclaim”** — differentiated, trustworthy, aligned with onboarding — vs **generic compliant health app**. **Not** an exhaustive engineering checklist.

---

## MUST EXIST before launch

| Item | Why |
|------|-----|
| **Onboarding promise defensible on first week of use** | User reads “one clear daily insight” + mood/sleep/habits (`WelcomeScreen.tsx`). If home feels unrelated or empty, **identity breaks**. |
| **Coherent primary path: log mood → see reflection → one actionable next step** | Core loop implied by capabilities slides + insights engine; broken loop = **commodity tracker**. |
| **Sleep story matches Android HC reality** | Narrow reads + rich `SleepScreen.tsx` vitals — **don’t** imply step/RHR/HRV from HC on Android if not in scope (**Play + vision**). |
| **Medical / crisis guardrails where mood content is low** | e.g. `mood-sustained-low` → 988 in `insights.json` — **non-negotiable** for trust and safety positioning. |
| **Remove or fix misleading health UX** | Training weekly “Active calories (Health Connect…)” without `active_energy` grant (**reclaim_play_readiness_audit.md**) — **lying to user** breaks premium claim. |
| **Disclaimers accessible** | `HealthDisclaimerModal`, `storeCompliance.ts`, Data & Privacy entry — **regulatory + trust** baseline. |
| **No placeholder / “test” artifacts in production-facing paths** | Phase 7 Tier 1 theme — **Inference:** ship-blocker for “premium”. |

---

## SHOULD EXIST before launch

| Item | Why |
|------|-----|
| **Dashboard hierarchy passes a “one hero” test** | Even if secondary tiles exist, user should **recognize** the daily insight as **primary** within ~5s (**vision alignment**). |
| **Insight rules degrade gracefully when context missing** | e.g. `steps.lastDay` undefined on Android — avoid **silent** failure modes that feel broken. |
| **Mindfulness / HR nudge story documented in-app** | User should understand **why** HR permission helps (Android) — links vision **interpretability** to permissions. |
| **Integrations screen honest about what connects** | HC subtitle is thin; **should** not oversell Garmin/Huawei as ready. |
| **iOS/Android copy differences where parity differs** | Resting HR insights, reactive HR — **avoid** implying identical “recovery science” on both. |
| **Internal docs match product truth** | e.g. `HEALTH_API_COVERAGE.md` vs manifest — **process** non-negotiable for **team** not lying to itself before Play fill. |

---

## CAN DEFER until post-launch

| Item | Why |
|------|-----|
| **Full STATE→MEANING→ACTION branded UX system** | Principle is valuable; **full** design system rollout is **large** — can ship strong insights without the label. |
| **Codex “dashboard premium redesign” hero / readiness score / rails** | WANTED in inventory — **enhancement** if current dashboard is acceptable. |
| **iOS reactive HR parity with Android** | Documented PARTIAL — **defer** if Android-first launch. |
| **Wearables Glance models + projection service** | WANTED architecture — **not** in standard tree. |
| **Splash analytic ellipse rebrand** | Inventory conflict / UNVERIFIED — **visual**, not core promise. |
| **Garmin / Huawei real connectors** | Placeholders — **defer** unless strategic. |
| **Repository-layer strangler phases 5–9** | Engineering quality — **defer** for launch if stable. |
| **Full Maestro coverage** | QA aspiration — smoke may suffice. |

---

## “Right app” vs “compliant app”

**Right app** requires **MUST** list + **honest scope** in copy. **Compliant app** can pass Play with narrow declarations but **feel hollow** if onboarding still promises breadth the platform doesn’t deliver. **Non-negotiable:** **one honest story** from store → onboarding → home.

---

*See `reclaim_vision_alignment_audit.md` and Play audits for overlap items.*
