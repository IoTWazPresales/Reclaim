# Reclaim — vision gap matrix

| Vision area | Intended state (evidence) | Current state | Gap severity | Evidence | Launch impact | Recommendation |
|-------------|---------------------------|---------------|--------------|----------|-------------|----------------|
| **Daily insight clarity** | “One clear daily insight” (`WelcomeScreen.tsx`) | Dashboard combines insight card + recovery + tiles + routines + overlay (`Dashboard.tsx`) | **High** | File structure, component imports | Users may feel **overwhelmed** vs promise | **Tighten** hierarchy: one hero insight + collapse/secondary; **or** revise onboarding copy to match “command center” |
| **STATE → MEANING → ACTION** | Durable principle (`reclaim_provisional_origin_note.md`, inventory UNVERIFIED) | Insights often have message/why/action; **not** unified branded pattern | **Medium** | `insights.json` vs memory | Differentiation **subtle** | **Tighten** card template copy; optional single glossary — **defer** full branding |
| **Interpretability / science** | Rules with `why` + non-clinical actions | `InsightEngine` + rich `insights.json` | **Low–Medium** | `insights.json` | Core **strength** | **Keep**; audit a few rules for Android data gaps |
| **Sleep & recovery** | Capabilities slide + HC sleep reads | `SleepScreen.tsx` vitals; HC narrow manifest | **Low** on Android scope | Code + Play audit | **Aligned** within policy | **Keep**; ensure dashboard sleep tile matches depth |
| **Mood + habits** | Mood in two taps; meds | `MoodScreen` / onboarding; `Meds`; dashboard mood modal | **Low** | Nav + Dashboard | **Aligned** | **Keep** |
| **Training as adaptive program** | “Personalised program” (`CapabilitiesScreen.tsx`) | `TrainingScreen`, programs in API, notifications | **Medium** | **Inference:** adaptiveness not fully verified in this audit | May under-deliver vs **wording** | **Tighten** copy if logic simpler than “adapts” |
| **Mindfulness resets** | Quick guided exercises | `MindfulnessScreen`, `MeditationScreen`, HR triggers | **Low–Medium** | Screens exist | **Aligned**; iOS HR partial | **Keep**; disclose platform limits in-product if needed |
| **Premium home** | Premium command center (memory); Codex wanted hero/readiness (`reclaim_master_inventory` WANTED) | `PremiumStarfield`, `LifecycleHero`, tile visuals | **Medium** | `Dashboard.tsx` | Feels **premium** to some; **busy** to others | **User test**; optional reduce motion / density setting |
| **No guilt / shame UX** | Principle (reconstruct) | Not systematically verified | **Open** | — | Trust | **Copy pass** on insights + notifications |
| **Cross-platform parity** | Single product | Android missing resting HR context; iOS missing reactive HR triggers | **High** | `fetchHeartRateContextSummary.ts`, `notificationTriggers.ts`, inventory | **Different** “feel” per OS | **Scope** copy + rules per platform; **defer** full iOS HR |
| **Steps-aware insights** | `low-activity-mood` rule | `steps` from `listDailyActivitySummaries` in `contextBuilder.ts` | **Medium** | **Inference:** Android HC may not populate steps | Rule may **misfire or never fire** | **Tighten** rule guards; or **hide** when `steps` undefined |
| **Honest health claims** | Permission ↔ surface (memory + Play) | Training HC calories label weak | **High** | `reclaim_play_readiness_audit.md` | **Trust** + policy | **Fix** copy or scope (see Play audit) |
| **Integrations focus** | Connect what matters | Garmin/Huawei placeholders | **Low–Medium** | `integrations.ts` DEFINITIONS | **Noise** | **Defer** or move to “Coming” section with clearer framing |
| **Wearables native vision** | Glance models WANTED (inventory) | Notification-mirrored watch; no `wearables/` projection | **Low** for launch | Discussion recon | **Deferred** architecture | **OK** for launch if watch path stable |

**Severity key:** **High** = likely to undermine promise or trust; **Medium** = noticeable drift; **Low** = minor or deferrable.

---

*Companion: `reclaim_vision_alignment_audit.md`.*
