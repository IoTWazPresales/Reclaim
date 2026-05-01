# Reclaim — premium experience gaps

**Focus:** What stops Reclaim from feeling **must-use premium** vs **capable utility**. Grounded in **Dashboard** (primary home) and related shells.

---

## Dashboard / home

| Gap | Evidence | Effect |
|-----|----------|--------|
| **Density vs “one clear insight”** | `Dashboard.tsx` composes `DashboardInsight`, `DashboardRecovery`, `LifecycleHero`, `HomeDashboardTile` variants, `ScheduleOverlay`, routines, celebration modal, sync | **Inference:** first session may not find **the** insight promised in `WelcomeScreen.tsx` |
| **Visual premium vs cognitive load** | `PremiumStarfield`, animations, multiple rails | Feels **designed**; may overwhelm users seeking **simplicity** |
| **Recovery card vs insight card relationship** | `DashboardRecovery`, `computeRecoveryPrimaryCta` in `recoveryCardMeta.ts` | **Open** whether user sees **one** narrative or **two** competing stories |
| **Tile semantics** | Sleep hypno mini, mood rhythm, training week rail (`HomeDashboardTile.tsx`) | **Strong** differentiation — **if** user understands each tile’s **one** job |

---

## Hierarchy

| Gap | Note |
|-----|------|
| **Primary CTA** | `DashboardPrimaryAction` exists — **verify** it always reflects highest-value next step vs buried in scroll |
| **Drawer depth** | Many sibling domains (meditation, mindfulness, training, …) — **Inference:** new users may not map to “daily signal” |

---

## Actionability

| Gap | Evidence |
|-----|----------|
| **Insight → action** | Many `insights.json` entries include `action` | **Strength** |
| **Friction from too many actions** | Multiple CTAs on dashboard + FAB patterns **Inference** | **Weakness** — user may not act |
| **Sync / integration blocking** | Health sync and integration status affect insight quality | If disconnected, **premium** feels **empty** — needs **empty states** with dignity |

---

## STATE / MEANING / ACTION fidelity

| Aspect | Status |
|--------|--------|
| **State** | Good raw inputs when integrations connected (sleep, mood, meds, training) |
| **Meaning** | **Strong** in insight `why` text when rules fire |
| **Action** | **Strong** in many rules; **weaker** when context missing (Android vitals/steps gaps) |

**Gap:** Not consistently labeled as a **three-beat** story in UI — user must **infer** structure.

---

## Trust / clarity

| Gap | Evidence |
|-----|----------|
| **Platform honesty** | `fetchHeartRateContextSummary.ts` comment is engineer-facing; user may not see **why** Android “recovery” differs | Add **user-facing** calibration **Inference** |
| **Medical boundaries** | Disclaimers exist | **Keep** visible in settings, not only first modal dismiss |
| **Placeholder trust** | Phase 7 Tier 1 items | Any “coming soon” on home **erodes** premium |

---

## Perceived polish

| Strength | Evidence |
|----------|----------|
| **Design tokens** | `reclaimVisualLanguage.ts`, capsule buttons across settings/dashboard |
| **Motion** | Reanimated onboarding; dashboard animations |
| **Conflict** | Splash orb narrative vs `ReclaimLogo.tsx` (**inventory** §G) — **minor** brand polish gap |

---

## What would make it feel “must-use”

1. **One unmistakable daily headline** — the insight the user **came back for** — with everything else **clearly** secondary.
2. **Reliable “closed loop”** — log mood → see consequence in insight → **single** suggested action → **visible** completion.
3. **Honest emptiness** — when data is missing, **premium** apps explain **why** without shame (aligns **no guilt** principle).
4. **Notification discipline** — each ping **obviously** tied to a prior user goal (calendar, training, mindfulness), not generic.

---

*This doc is diagnostic; implementation is out of scope.*
