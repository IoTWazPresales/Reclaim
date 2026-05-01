# Reclaim App — Visual Audit & Icon/Visual Improvement Recommendations

**Date:** February 2025  
**Purpose:** Rate current visual quality, compare to premium references (e.g. Sleep as Android), and recommend where **larger, custom-drawn SVG-style icons** and stat treatments can make the app more visually appealing—**no code changes in this doc; feedback only.**

---

# 1. Overall rating: **5.5 / 10**

**Summary:** The app is coherent and readable (Material 3 dark theme, consistent spacing, clear hierarchy) but feels **generic and “template-y.”** It relies almost entirely on one icon set (MaterialCommunityIcons) at small sizes, and only a few areas use custom Skia visuals. Compared to Sleep as Android’s illustrated awards, colourful stat icons, and drawn card identity, Reclaim does not yet feel “first-party premium.”

| Dimension              | Score | Notes |
|------------------------|-------|--------|
| Consistency & system   | 7/10  | Theme, spacing, typography are consistent. |
| Distinctiveness       | 4/10  | Looks like many other M3 apps; little unique visual language. |
| Iconography            | 4/10  | Single font icon set, small (18–22px), no custom illustrated icons. |
| Data visualization     | 6/10  | Progress rings (Skia) are strong; charts are standard. |
| Card/screen identity   | 5/10  | Cards share the same header pattern; no “hero” illustrations per domain. |
| Delight & craft        | 5/10  | Some Skia (mood weather, starfield, logo); underused. |

---

# 2. Current state (what exists today)

## 2.1 Icons

- **Everywhere:** `MaterialCommunityIcons` from `@expo/vector-icons`.
- **Sizes:** 18px (insight bulbs, list items), 20px (SectionHeader), 22px (FeatureCardHeader in a 44×44 rounded tile).
- **Usage:** Card titles (Sleep, Mood, Exercise, Recovery, Your progress, etc.), section headers, list actions, FAB, crisis/988 links.
- **No custom SVG icons:** Only one SVG in repo (`assets/brain.svg`). No illustrated, on-brand icons for Sleep/Mood/Meds/Exercise/Recovery.

## 2.2 Cards

- **Dashboard:** InformationalCard + FeatureCardHeader (44×44 icon tile + title + optional subtitle). Same pattern for Sleep, Mood, Exercise, Progress, Recovery, Insight.
- **Progress:** Three Skia `ProgressRing`s (mood / sleep / meds) with domain colours—**this is already a strength.**
- **CelebrateRow:** Progress rings + badge strip; orbs use same MaterialCommunityIcons for mood/sleep/meds.
- **Sleep/Mood/Meds/Training screens:** Same FeatureCardHeader pattern for “Last night,” “History,” “Trends,” “Check-in,” “Today,” etc.

## 2.3 Data & stats

- **Rings:** Skia `ProgressRing` with track, glow, animated arc, centre value text—feels premium.
- **Charts:** `react-native-chart-kit` (e.g. Training analytics); otherwise text/numbers.
- **No:** Small circular stat cards with a single metric + icon (like “7.2h sleep” in a circle with a moon icon), or illustrated stat blocks.

## 2.4 Custom visuals (Skia / drawn)

- **ReclaimLogo:** Splash R + rings (Skia, SVG path).
- **MoodWeatherVisualization:** Skia (sun, cloud, fog, storm, settling orbs)—distinct and on-brand.
- **SleepMoonVisualization, BrainVisualization, PremiumStarfield, etc.:** Custom Skia; used in specific hero/ambient areas.
- **Gap:** These are the exception. Most of the UI is text + small generic icons.

## 2.5 Theme

- **Dark-first:** `appDarkTheme` (background `#0B1220`, surface `#162036`, primary blue `#60a5fa`, tertiary emerald for meds).
- **Domain colours:** Mood blue, sleep indigo, meds emerald—used in progress rings and CelebrateRow; not used for card identity icons.

---

# 3. Research: premium apps and best practices

## 3.1 Sleep as Android (your reference)

- **Achievements:** Tiered badges (Bronze, Gold, Diamond) with **custom-drawn, colourful icons** that describe the achievement.
- **Dashboard/cards:** **Larger, descriptive illustrated icons** for sleep stats and cards—not small generic glyphs.
- **Circular/stats:** Simple circular or ring-style stats with **clear icons** for the metric (sleep, alarm, etc.).
- **Takeaway:** Custom illustration and **larger, narrative icons** (that describe the card/screen/stat) create recognition and a “premium” feel; generic icon fonts do not.

## 3.2 Award / high-rated health apps (2024 references)

- **Apple Design Awards (e.g. Gentler Streak):** Colourful, approachable, **distinct mascot/illustration** and consistent visual language.
- **Webby / UX Design Awards (e.g. Meditation for Sleep, SleepMate):** Strong **visual design and aesthetic**; custom visuals and clear data presentation.
- **Common traits:**  
  - **Custom or curated iconography** (not one stock set).  
  - **Data visualization** matched to the metric (rings for goals, heat maps for patterns, clear labels).  
  - **Card/section identity** via illustration or large icons, not only text + small icon.  
  - **Consistent colour semantics** (e.g. sleep = one colour family, mood = another).

## 3.3 Best practices (health dashboards and icons)

- **Icons:** Custom or cohesive set; **larger “hero” icons** for card/screen identity (e.g. 56–72px or full-width illustrations). Small 22px glyphs are for actions/secondary UI.
- **Circular progress:** Good for single-metric goals; centre label + optional small icon; avoid too many rings in a row without hierarchy.
- **Cards:** One primary visual per card (big icon or illustration) + title + key stat; reduce visual noise.
- **Charts:** Clear axis labels, accessible colours, one main message per chart.

---

# 4. Where to improve (suggestions only — no code yet)

## 4.1 Card and screen identity: **larger SVG/drawn icons**

**Current:** Every card uses the same 44×44 rounded square with a 22px MaterialCommunityIcons glyph.

**Suggestions:**

- **Dashboard cards (Sleep, Mood, Exercise, Your progress, Recovery):**  
  Replace the small generic icon with a **larger (e.g. 56–72px) custom-drawn icon** per domain:  
  - Sleep: moon/stars or bed illustration.  
  - Mood: face/weather or heart.  
  - Exercise: dumbbell/runner or simple figure.  
  - Progress: three small rings or “streak” illustration.  
  - Recovery: wave/rest or similar.  
  Same idea as Sleep as Android’s awards: **colourful, descriptive, drawn**—not a single icon font.

- **FeatureCardHeader (shared component):**  
  Support an optional **custom illustration/icon slot** (e.g. SVG or Skia component) instead of only `MaterialCommunityIcons`, so some cards can use a large custom icon and others keep the current behaviour during a transition.

- **Section headers on Sleep/Mood/Meds/Training:**  
  For major sections (e.g. “Last night,” “Trends,” “Today”), consider a **small set of section-specific icons** (drawn, consistent style) instead of the same generic “chart-line” / “history” everywhere.

## 4.2 Stats and circular elements

**Current:** Progress rings on dashboard are strong. Elsewhere, stats are mostly text or lists.

**Suggestions:**

- **Single-metric stat blocks:**  
  Where you show one key number (e.g. “7.2h sleep,” “4/7 meds,” “Mood 6”), consider **circular or rounded stat cards** with:  
  - A **simple icon** (drawn, not tiny) for the metric.  
  - The number as the main focus.  
  - Short label.  
  This mirrors “circular status bars with simple nice icons” you like.

- **Sleep/Mood/Meds screens:**  
  At top of screen or in summary cards, use **one prominent stat circle per domain** (e.g. last night duration, today’s mood, today’s adherence) with a **descriptive icon** in or beside the circle.

- **Consistency with ProgressRing:**  
  Keep the existing Skia ProgressRing style; any new circular stats should feel from the same family (colours, stroke, optional glow).

## 4.3 Graphs and data viz

**Current:** Line charts (e.g. Training analytics); Mood/Sleep “Trends” sections.

**Suggestions:**

- **Chart styling:** Align colours with domain palette (mood blue, sleep indigo, meds emerald) and ensure contrast/accessibility.
- **“Trends” sections:** Consider a **small icon or illustration** in the section header (e.g. trending-up or a minimal “chart” illustration) so the section is recognizable at a glance.
- **No need to replace all charts with rings;** use rings for goals/completion, lines for trends.

## 4.4 Awards / achievements / streaks (CelebrateRow)

**Current:** Progress rings + badge strip; orbs use MaterialCommunityIcons.

**Suggestions:**

- **Badge/achievement visuals:** Move toward **custom-drawn badge icons** (like Sleep as Android’s achievements): one small illustration per badge type, colourful and recognizable.
- **CelebrateRow orbs:** Optionally use **small custom icons** (moon, heart, pill) instead of generic MaterialCommunityIcons so streak/celebration feels more branded.

## 4.5 Global consistency

- **Icon style:** Decide on one **style** for custom icons (e.g. line + light fill, or flat colour, or duotone) and use it for: card headers, section headers, stat icons, badges.
- **Colour:** Keep using domain colours (mood/sleep/meds) for those domains in **icons and rings** so colour carries meaning.
- **Size hierarchy:** “Hero” icons for cards/screens (large); smaller icons for lists and actions.

---

# 5. Summary table: where to add larger/drawn icons

| Area                    | Current                         | Suggestion (no code yet) |
|-------------------------|----------------------------------|---------------------------|
| Dashboard card headers | 44×44 tile, 22px MCI             | Large (56–72px) custom SVG/drawn icon per card (Sleep, Mood, Exercise, Progress, Recovery). |
| Section headers        | 20px MCI (e.g. chart-line)       | Optional section-specific drawn icon set. |
| Stat blocks            | Mostly text                     | Circular stat cards with one metric + descriptive icon. |
| CelebrateRow / badges  | MCI in orbs; generic badge strip| Custom-drawn badge icons; optional custom orb icons. |
| Trends / charts        | Chart + “chart-line” icon       | Themed chart colours; optional small “trend” illustration in header. |
| Sleep/Mood/Meds tops   | FeatureCardHeader                | One prominent stat circle + icon per screen. |

---

# 6. Lenses applied (design / UX / psychology / marketing)

- **UX:** Clear hierarchy and consistency are there; **recognition and delight** are underdeveloped—custom icons and one strong visual per card improve both.
- **Visual design:** One icon set at one small size reads as “default”; **custom illustration and size hierarchy** signal care and brand.
- **Visual psychology:** Colour already encodes domain; **shape and illustration** (moon, heart, pill) reinforce meaning and memory.
- **Marketing / premium feel:** Award-winning and highly rated apps tend to **own their visual language** (custom icons, illustrations, mascots); Reclaim can move toward that without losing clarity.

---

# 7. Next steps (for brainstorming)

1. **Prioritise:** Which cards or screens matter most for a “wow” first pass? (e.g. Dashboard cards vs. Sleep/Mood top sections.)
2. **Asset strategy:** Commission or design a **small set of SVG (or Skia-drawn) icons** in one style: Sleep, Mood, Meds, Exercise, Recovery, Progress, plus a few section icons (trends, history, today).
3. **Component contract:** Define how `FeatureCardHeader` (or a new variant) accepts a “large custom icon” so new assets plug in without duplicating layout logic.
4. **Rings + stat cards:** Decide where a “single stat circle + icon” pattern appears (e.g. Sleep “Last night” summary, Mood “Today,” Meds “Today’s adherence”) and keep it consistent with existing ProgressRing styling.

No code has been changed; this document is for alignment and planning only.

---

# 8. Dashboard cards: what each card should get (suggestions only)

Below is a **card-by-card** plan for the dashboard. Use it to brief icon/illustration work (e.g. ChatGPT or a designer) and to plan SVG assets. **“Character peeking”** = small illustrated figure/mascot or logo element in a corner (like Sleep as Android’s sleep assistant card with the drawn head in the lower right).

---

## 8.1 Greeting (top card)

- **Current:** 48px circle, generic greeting icon (e.g. hand wave), “Good morning” + subtitle + sync.
- **Suggest:**
  - **Option A:** Replace the circle icon with a **larger (56–64px) custom “hello” icon** — e.g. simple friendly face, sun + hand, or abstract “R” / brand mark in a warm style. Keeps the card compact.
  - **Option B:** Add a **small character/mascot peeking from the bottom-right** (like Sleep as Android’s assistant card): a minimal drawn head or figure that fits the “good morning” vibe. Icon in the left stays or becomes a smaller accent.
- **Icon set note:** One “greeting / hello” icon, or one reusable “Reclaim character” for peeking.

---

## 8.2 Today’s insight

- **Current:** FeatureCardHeader with lightbulb, “Today’s insight” / “One helpful nudge.”
- **Suggest:**
  - **Large card icon:** A **custom “insight” or “lightbulb”** icon — not the stock bulb. E.g. lightbulb with a small brain, or a spark/glow with a tick, or a simple “idea” symbol in your line style. ~56px so it reads as the card’s identity.
  - **Optional “peeking”:** If you introduce a Reclaim mascot, this card could have it **peeking from the lower right** (“here’s your nudge”) — same idea as the sleep assistant card.
- **Icon set note:** One “insight / idea / nudge” icon; optionally one “mascot peek” for reuse.

---

## 8.3 Your progress (three rings)

- **Current:** FeatureCardHeader “chart-donut” + three Skia ProgressRings (mood / sleep / meds) with labels. Already strong.
- **Suggest:**
  - **Header:** Replace “chart-donut” with a **custom “progress / momentum” icon** — e.g. three small rings linked, or an upward streak, or a simple “weekly wins” symbol. One colour or subtle domain colours.
  - **Rings:** Keep as-is. Optionally add a **tiny inline icon** per ring (moon, heart, pill) **inside or below** each ring for instant recognition — from your icon set, not MaterialCommunityIcons.
- **Icon set note:** One “progress / momentum” icon; three small domain icons (moon, heart, pill) for the rings if you want them.

---

## 8.4 Primary action (Start workout / Resume / etc.)

- **Current:** Dynamic title + 44px icon (dumbbell, etc.) + CTA button.
- **Suggest:**
  - **Large card icon:** One **custom “primary action”** icon per type, or one flexible “action” icon. E.g. dumbbell for workout, play for resume, calendar for plan — **drawn in your style**, ~48–56px. If the primary action is almost always “training,” a single strong **workout / exercise** icon is enough.
  - **No peeking** here — the CTA is the focus; keep the card clean.
- **Icon set note:** “Exercise / workout” icon (and optionally “resume,” “plan” if you want to vary by state).

---

## 8.5 Exercise

- **Current:** FeatureCardHeader “dumbbell” + state text (In progress / Completed / Planned / Rest day) + button(s).
- **Suggest:**
  - **Large card icon:** **Custom “exercise / training”** icon — e.g. dumbbell, runner silhouette, or simple figure lifting. ~56px, same style as Sleep/Mood.
  - **Optional “peeking”:** A **small character or figure** in the lower right (e.g. runner or stick figure) that “pops up” like Sleep as Android’s head — adds personality without clutter.
- **Icon set note:** One “exercise / training” icon; optional “exercise character peek.”

---

## 8.6 Sleep

- **Current:** FeatureCardHeader “sleep” + last night time range + duration/efficiency + hypnogram (when available) + “View sleep details.”
- **Suggest:**
  - **Large card icon:** **Custom “sleep”** icon — moon + stars, or crescent moon, or bed, or closed eyes. ~56px, indigo/sleep colour accent. This is the **main** card to mirror the Sleep as Android “sleep assistant” feel.
  - **“Character peeking” (recommended):** A **small drawn head or figure** in the **lower right** — sleeping, or your logo/mascot “resting” — that feels like the Sleep as Android assistant card. Sits behind or beside the content, doesn’t cover text.
  - **Optional:** A **small circular stat** for “Last night: 7.2h” with a tiny moon icon inside, next to the header or above the hypnogram.
- **Icon set note:** One “sleep” icon (moon/stars/bed); one “sleep character / head peek” for lower-right; optional small “moon” for stat.

---

## 8.7 Today (schedule)

- **Current:** FeatureCardHeader “calendar-today” + schedule list (meds, sleep blocks, routines) + “View schedule” / sync.
- **Suggest:**
  - **Large card icon:** **Custom “today / schedule”** icon — e.g. calendar with a single day highlighted, or a simple timeline/agenda symbol. ~56px.
  - **No peeking** — the list is dense; a clear header icon is enough.
  - **Row icons:** When you have an icon set, consider **small inline icons** per row type (pill for meds, moon for sleep, etc.) in the schedule rows instead of generic icons.
- **Icon set note:** One “today / schedule / calendar” icon; small “pill” and “moon” (and any others) for schedule row types.

---

## 8.8 Mindfulness hint (conditional)

- **Current:** ActionCard, “Need a reset? Try Mindfulness.” + Open button.
- **Suggest:**
  - **Left side:** A **custom “mindfulness / reset”** icon — e.g. breath circle, lotus, or simple “pause” symbol. ~48px so the card doesn’t grow too much.
  - **Optional “peeking”:** Very subtle character or leaf/breath motif in a corner to match the “reset” tone.
- **Icon set note:** One “mindfulness / reset” icon.

---

## 8.9 Mood (quick check-in)

- **Current:** FeatureCardHeader “emoticon-happy-outline” + 1–5 buttons + “Open mood” + “In crisis? 988.”
- **Suggest:**
  - **Large card icon:** **Custom “mood”** icon — e.g. simple face, heart, or sun/cloud (could echo MoodWeatherVisualization). ~56px, blue/mood accent.
  - **Optional “peeking”:** A **friendly face or heart** in the lower right, subtle, so the card feels supportive (especially near the 988 link).
- **Icon set note:** One “mood” icon; optional “mood character / face peek.”

---

## 8.10 Recovery

- **Current:** FeatureCardHeader “meditation” + stage title + summary + focus list + “Manage recovery.”
- **Suggest:**
  - **Large card icon:** **Custom “recovery”** icon — e.g. wave, rest symbol, or person in rest pose. ~56px. Avoid looking like “meditation app” if you want to keep recovery distinct; “rest / recharge” is a good theme.
  - **No peeking** — the stage and focus list are the focus.
- **Icon set note:** One “recovery / rest” icon.

---

## 8.11 CelebrateRow (streaks / badges)

- **Current:** Three orbs (ProgressRings) + mood/sleep/meds labels + badge strip. Orbs use MaterialCommunityIcons.
- **Suggest:**
  - **Orb icons:** Replace the small MCI in or below each orb with **custom domain icons** (moon, heart, pill) from your set — same three you might use on the Progress card.
  - **Badge strip:** Move toward **custom-drawn badge icons** per badge type (e.g. 7-day, 30-day, shield) — colourful, simple, like Sleep as Android’s achievements.
- **Icon set note:** Same domain set (moon, heart, pill); plus 3–5 **badge/achievement** icons for the strip.

---

## 8.12 Summary: icon set to commission or generate

| Purpose | Suggested icons (for SVG set) |
|--------|------------------------------|
| Card identity (large) | Greeting/hello, Insight/idea, Progress/momentum, Exercise/training, Sleep (moon/stars), Today/schedule, Mindfulness/reset, Mood (face/heart), Recovery/rest |
| “Peeking” / character | One “Reclaim” head or figure (sleep, mood, insight, exercise variants optional) |
| Domain (small) | Moon (sleep), Heart (mood), Pill (meds) — for rings, orbs, schedule rows |
| Badges | 3–5 streak/badge icons (e.g. 7-day, 30-day, shield) |
| Optional | Primary action (workout), small “stat” versions of moon/heart/pill |

**Character peeking:** Best first use is **Sleep** (like Sleep as Android’s assistant card). Then consider **Insight** and **Mood**; **Exercise** and **Greeting** are optional. One flexible “Reclaim” character that can be posed or placed in the lower right works across cards.
