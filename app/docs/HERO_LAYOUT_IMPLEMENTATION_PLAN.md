# Hero Layout Implementation Plan: Unified Brain/Rings Design Across Screens

## Executive Summary

Extend the Dashboard's LifecycleHero layout (rotating rings, central "brain" visualization, outer nodes, connectors) to Mood, Sleep, Meds, Meditation, Mindfulness, and optionally Training screens. Each screen gets a **domain-specific central visualization** ("brain") instead of the anatomical brain, with the same rings-and-nodes shell for visual consistency.

---

## 1. Dashboard Layout Reference (Source of Truth)

### Current Structure
- **LifecycleHero** (≈300px height, full-width)
  - PremiumStarfield (background)
  - Rotating dotted rings (3 concentric circles, pivot at center)
  - **BrainVisualization** (central): SVG brain path, anatomically positioned glow regions
  - **NodeToBrainConnectors**: lines from outer nodes to brain regions
  - **Outer nodes** (5): Mood, Sleep, Training, Meds, Insights — positioned via `getNodeAngle()` from brain region coordinates
- **heroLayout.ts**: `VIEW_WIDTH`, `VIEW_HEIGHT`, `LAYER_TX`, `LAYER_TY`, `getBrainCanvasOffsetY()`
- **brainPath.ts**: traced SVG path data
- **DIAGRAM_SIZE** = 300, **brainSize** = orbSize × 0.54

### Layout Constants to Reuse
- Rings: `rOuter`, `rMid`, `rInner` from orb ratios
- Node capsule: 92×32, `rOuter + 14` for node radius
- Padding: 24px canvas, 16px section gap

---

## 2. Screen Audits

### 2.1 MoodScreen

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | ActionCard with mental weather (emoji + state), chips, confidence, cause linking, reflection | Text-heavy, no visual centerpiece |
| Layout | Flat ScrollView, no rings or diagram | Differs from Dashboard |
| Data | `deriveHeroState()` (rating, history), moodByDay, sleep/meds correlations | Weather metaphor already exists |
| Sections | Insight, Today, Check-in, Reminders, Trends, History | Well-structured |
| Proposed "Brain" | **Weather visualization** — icon/simple graphic based on mood (day or week): ☀️ Clear, ☁️ Cloudy, 🌫️ Heavy, 🌩️ Turbulent | Matches existing `moodWeather()` logic |

### 2.2 SleepScreen

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | ActionCard "Last night" — summary, HeroWell meter (Efficiency, Sleep vs target, Score), SleepStagesBar, Hypnogram | Dense, functional |
| Layout | Flat ScrollView, no rings or diagram | Differs from Dashboard |
| Data | `recentSleep`, `heroStagesForHypnogram`, stage aggregation | Rich sleep data |
| Sections | Insight, Circadian planning, Reminders, Trends, History, Connect & sync | Comprehensive |
| Proposed "Brain" | **Hypnogram / sleep cycle visualization** — simplified waveform or moon-phase style graphic showing last night's stages (awake/light/deep/REM) | Reuse existing hypnogram data |

### 2.3 MedsScreen

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | ActionCard "Medication Stability" — emoji + state, chips (Active meds, Doses today, Next dose) | Text-heavy |
| Layout | Flat ScrollView, no rings or diagram | Differs from Dashboard |
| Data | `stability`, `todaysPlan`, adherence, due today items | Clear metrics |
| Sections | Insight, Today's plan, Reminders, Due today, Active meds, Add med, Quick actions | Well-organized |
| Proposed "Brain" | **Adherence / pill schedule graphic** — circular progress or pill bottle silhouette with glow intensity by adherence % | Visual representation of consistency |

### 2.4 MeditationScreen

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | Meditation picker / library — no hero card | Screen is focused on selection and session start |
| Layout | ScrollView with script cards, session controls | Different purpose |
| Data | `selectedScript`, `sessions`, meditation types | Session-centric |
| Sections | Library, Default source, Active session, Session history | Launcher-style |
| Proposed "Brain" | **Breath / lotus / mandala visualization** — subtle expanding/contracting circle or lotus motif tied to breath or meditation state | Calm, meditative centerpiece |

### 2.5 MindfulnessScreen

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | Quick interventions (4-7-8, box breath, five senses, etc.) — no unified hero | Intervention cards |
| Layout | ScrollView with intervention cards, meditation auto-start | Intervention-centric |
| Data | `INTERVENTIONS`, breathing phases, mindfulness events | Quick tools |
| Proposed "Brain" | **Breathing wave / calm graphic** — soft wave or pulse matching current breath phase (inhale/hold/exhale) when active, else static calm icon | Connects to 4-7-8 and box breath |

### 2.6 TrainingScreen (Optional)

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Hero | Week view, program day selection, session preview — no hero card | Program-centric |
| Layout | Tabs (today/history), WeekView, session UI | Different flow |
| Data | `activeProgram`, `selectedProgramDay`, session plan | Program and session data |
| Recommendation | **Yes, include** — Training is a lifecycle pillar on the Dashboard. A hero would add cohesion. | |
| Proposed "Brain" | **Progress ring / muscle silhouette** — circular progress for weekly completion or simple body/muscle icon with glow for "session done today" | Connects to training intent |

---

## 3. Dashboard vs Screen Layout Comparison

| Element | Dashboard | Mood | Sleep | Meds | Meditation | Mindfulness | Training |
|---------|-----------|------|-------|------|------------|-------------|----------|
| Rings | ✓ 3 dotted | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Central "Brain" | Brain SVG | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Outer Nodes | ✓ 5 (Mood, Sleep, …) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Connectors | ✓ Node→Brain | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Starfield | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Hero Card | Greeting + primary action | ActionCard (weather) | ActionCard (last night) | ActionCard (stability) | None | None | None |

**Gap**: All other screens use a flat ActionCard or no hero. No shared rings/central-visual/connectors pattern.

---

## 4. Proposed "Brain" per Screen (Central Visualization)

| Screen | Central "Brain" | Data Driver | Rationale |
|--------|-----------------|-------------|-----------|
| **Mood** | **Weather icon** — ☀️ / ☁️ / 🌫️ / 🌩️ (or stylized SVG) | `moodWeather(rating, volatile)` from `deriveHeroState()` | Day or week mood → weather metaphor already in codebase |
| **Sleep** | **Simplified hypnogram** — horizontal bar or waveform of stages | `heroStagesForHypnogram` | Last night's sleep stages in compact form |
| **Meds** | **Adherence ring** — circular progress (0–100%) or pill icon with intensity | `adherencePct7d`, `todaysPlan` | Visualizes medication consistency |
| **Meditation** | **Breath / lotus** — expanding/contracting circle or lotus | Session state, or static calm icon | Meditative, calm centerpiece |
| **Mindfulness** | **Breathing wave** — pulse matching inhale/hold/exhale when active | `BreathingCard478` phase, or static | Connects to 4-7-8 and box breath |
| **Training** | **Progress ring / body icon** — weekly completion % or "session done" glow | `activeProgram`, session completion | Training as a lifecycle pillar |

---

## 5. Phased Implementation Plan

### Phase 0: Abstraction (Shared Shell)
**Goal**: Extract a reusable `DomainHero` (or `ScreenHero`) component that accepts a custom central visualization.

**Tasks**:
1. Create `DomainHero` (or extend `LifecycleHero`) that accepts:
   - `centerComponent: ReactNode` — replaces BrainVisualization
   - `nodes: NodeConfig[]` — screen-specific outer nodes
   - `nodeStatuses: NodeStatuses` — status strings
   - `onNodePress?: (id) => void`
2. Extract rings + connector logic into shared layout
3. Ensure `heroLayout.ts` and coordinate system work for arbitrary center content
4. Keep PremiumStarfield as optional background prop

**Deliverable**: `DomainHero` used by Dashboard (passing BrainVisualization) with no visual change.

---

### Phase 1: Mood Screen
**Goal**: Mood screen uses the same layout with **weather** as the central "brain."

**Tasks**:
1. Create `MoodWeatherVisualization` component:
   - Input: `rating`, `volatile`, `range?: 'day' | 'week'`
   - Renders stylized weather (☀️ / ☁️ / 🌫️ / 🌩️) or custom SVG based on `moodWeather()`
   - Same size/positioning contract as BrainVisualization
2. Define Mood-specific nodes (e.g. Check-in, Trends, History, Insights, Sleep/meds cause hints — or reuse Dashboard-style nodes with different labels)
3. Integrate `DomainHero` into MoodScreen with `MoodWeatherVisualization` as center
4. Move/adapt current hero content (chips, confidence, cause linking) below hero or into nodes
5. Add PremiumStarfield background

**Deliverable**: MoodScreen with rings, weather center, outer nodes, connectors.

---

### Phase 2: Sleep Screen
**Goal**: Sleep screen uses the same layout with **hypnogram** as the central "brain."

**Tasks**:
1. Create `SleepHypnogramVisualization` component:
   - Input: `stages` (same as HeroHypnogram), `duration`
   - Renders simplified horizontal bar or waveform of awake/light/deep/REM
   - Same size/positioning as BrainVisualization
2. Define Sleep-specific nodes (Last night, Trends, Circadian, Integrations, etc.)
3. Integrate `DomainHero` into SleepScreen with `SleepHypnogramVisualization` as center
4. Refactor "Last night" ActionCard — keep key metrics, move detail below hero

**Deliverable**: SleepScreen with rings, hypnogram center, outer nodes, connectors.

---

### Phase 3: Meds Screen
**Goal**: Meds screen uses the same layout with **adherence ring** as the central "brain."

**Tasks**:
1. Create `MedsAdherenceVisualization` component:
   - Input: `adherencePct`, `dosesToday`, `nextDose`
   - Renders circular progress ring or pill icon with glow intensity
   - Same size/positioning as BrainVisualization
2. Define Meds-specific nodes (Due today, Add med, Reminders, History, etc.)
3. Integrate `DomainHero` into MedsScreen with `MedsAdherenceVisualization` as center
4. Refactor "Medication Stability" ActionCard — condense into nodes or below hero

**Deliverable**: MedsScreen with rings, adherence center, outer nodes, connectors.

---

### Phase 4: Meditation Screen
**Goal**: Meditation screen uses the same layout with **breath/lotus** as the central "brain."

**Tasks**:
1. Create `MeditationCenterVisualization` component:
   - Input: `sessionActive?: boolean`, `breathPhase?: 'inhale'|'hold'|'exhale'` (optional)
   - Renders lotus or expanding/contracting circle (subtle animation)
   - Same size/positioning as BrainVisualization
2. Define Meditation-specific nodes (Library, Default source, Active session, History, etc.)
3. Integrate `DomainHero` into MeditationScreen with `MeditationCenterVisualization` as center
4. Preserve meditation picker and session flow below hero

**Deliverable**: MeditationScreen with rings, breath/lotus center, outer nodes, connectors.

---

### Phase 5: Mindfulness Screen
**Goal**: Mindfulness screen uses the same layout with **breathing wave** as the central "brain."

**Tasks**:
1. Create `MindfulnessBreathVisualization` component:
   - Input: `activeIntervention?: 'breath_478'|'box_breath_60'`, `phase`, or static
   - Renders wave/pulse matching breath phase when active, else calm static graphic
   - Same size/positioning as BrainVisualization
2. Define Mindfulness-specific nodes (4-7-8, Box breath, Five senses, Reality check, Urge surf)
3. Integrate `DomainHero` into MindfulnessScreen with `MindfulnessBreathVisualization` as center
4. Keep quick intervention cards below hero

**Deliverable**: MindfulnessScreen with rings, breathing wave center, outer nodes, connectors.

---

### Phase 6: Training Screen (Optional)
**Goal**: Training screen uses the same layout with **progress/body** as the central "brain."

**Tasks**:
1. Create `TrainingProgressVisualization` component:
   - Input: `weeklyCompletionPct`, `sessionDoneToday`
   - Renders progress ring or body/muscle icon with glow when session done
   - Same size/positioning as BrainVisualization
2. Define Training-specific nodes (Today, History, Setup, Analytics, Week view)
3. Integrate `DomainHero` into TrainingScreen with `TrainingProgressVisualization` as center
4. Preserve WeekView and session flow below hero

**Deliverable**: TrainingScreen with rings, progress center, outer nodes, connectors.

---

## 6. Technical Considerations

### 6.1 Node Configuration
- Dashboard: 5 nodes (Mood, Sleep, Training, Meds, Insights) — each maps to a lifecycle pillar.
- Domain screens: Nodes are **screen-specific** (e.g. Mood: Check-in, Trends, History, Cause hints; Sleep: Last night, Trends, Circadian, Integrations).
- Connectors: From outer nodes to the **center** (no anatomical regions). May simplify to radial lines to center, or keep region-style if center has defined "hot spots."

### 6.2 Coordinate System
- BrainVisualization uses path space → viewBox → diagram space via `heroLayout.ts`.
- Custom visualizations (weather, hypnogram, etc.) should use the **same canvas size and transform chain** so connectors align.
- Option: All custom "brains" render in a fixed viewBox (e.g. 167×167) for consistency.

### 6.3 Connector Logic
- Dashboard: Connectors land on brain regions via `getRegionCenter()` + `getBrainRegionHeroCoords()`.
- Domain screens: If center is a single graphic (weather, hypnogram), connectors can land at **center point** or at **equally spaced points on a circle** around the center (like spokes).
- Recommend: Radial connectors to center for simplicity unless a domain visualization has distinct regions.

### 6.4 Performance
- PremiumStarfield: Consider lazy-loading or reducing star count on lower-end devices for domain screens.
- Reuse Reanimated for ring rotation; keep animations lightweight.

---

## 7. Summary: Phases at a Glance

| Phase | Screen | Central "Brain" | Est. Effort |
|-------|--------|-----------------|-------------|
| 0 | Shared | Extract DomainHero shell | 1–2 days |
| 1 | Mood | Weather (☀️/☁️/🌫️/🌩️) | 1–2 days |
| 2 | Sleep | Hypnogram | 1–2 days |
| 3 | Meds | Adherence ring | 1 day |
| 4 | Meditation | Breath/lotus | 1–2 days |
| 5 | Mindfulness | Breathing wave | 1–2 days |
| 6 | Training | Progress/body | 1–2 days |

**Total**: ~8–12 days (one screen at a time, with testing and refinement).

---

## 8. Recommendation: Include Training

**Yes.** Training is a lifecycle node on the Dashboard. Giving it the same hero treatment:
- Reinforces that Training is a first-class pillar
- Creates visual consistency when navigating Dashboard → Training
- Provides a clear "session done today" or weekly progress at a glance

Implement Training in Phase 6 after Meditation and Mindfulness.
