# Phase 1: Dashboard Lifecycle Hero — Implementation Plan

## Summary

Implement a **Lifecycle Hero** at the top of the Dashboard screen: full-bleed, no card borders, mobile-first, with a center orb, two dotted rings, six tappable nodes (Mood, Sleep, Training, Meds, Breath, Insights), subtle animation, and navigation on tap.

---

## Feasibility Assessment

### ✅ **Can I do it? Yes.**

All required pieces exist or can be implemented within the stated constraints:

| Requirement | Status | Notes |
|-------------|--------|-------|
| **react-native-svg** | ✅ Installed (15.12.1) | Rings, connectors, nodes via SVG |
| **expo-linear-gradient** | ❌ Not installed | Use solid dark bg + layered Views for subtle radial effect |
| **Navigation routes** | ✅ Exist | Mood, Sleep, Meds, Mindfulness, Training, Analytics |
| **Dashboard location** | ✅ Found | `app/src/screens/Dashboard.tsx` line 225 |
| **useWindowDimensions** | ✅ RN built-in | Responsive sizing |
| **Animated (RN)** | ✅ Built-in | useNativeDriver for performance |

### 🖼️ **Can I generate images? Yes.**

A mockup image (`lifecycle-hero-mockup.png`) has been generated to visualize the expected outcome.

---

## Node-to-Route Mapping

| Node | Label | Navigation | Data Source (status) |
|------|-------|------------|----------------------|
| 1 | Mood | `navigateToMood()` | moodStreak.count, last check-in |
| 2 | Sleep | `navigateToSleep()` | sleepQ.data (last night duration) |
| 3 | Training | `navigateToTraining()` *(add)* | next session / rest placeholder |
| 4 | Meds | `navigateToMeds()` | medAdherencePct, upcomingDoses |
| 5 | Breath | `navigateToMindfulness()` | neutral placeholder |
| 6 | Insights | `navigateToAnalytics()` *(add)* | dashboard insight status |

---

## Implementation Steps (Ordered)

### 1. Add missing nav helpers

**File:** `app/src/navigation/nav.ts`

Add:

- `navigateToTraining()` → `safeNavigate('App', { screen: 'Training' })`
- `navigateToAnalytics()` → `safeNavigate('App', { screen: 'HomeTabs', params: { screen: 'Analytics' } })`

### 2. Create `LifecycleHero` component

**File:** `app/src/components/dashboard/LifecycleHero.tsx` (new)

**Structure:**

- Props: `nodeStatuses` (optional map of node → status string/dot), `onNodePress` (optional)
- Layout: `useWindowDimensions()` → hero height ~200–240px, orb size = clamp(0.34 * width, 110, 160)
- Background: `View` with dark background (#0f1218 or similar) + optional second `View` with low-opacity radial-ish overlay (no new deps)
- SVG diagram:
  - Center orb: `Svg` + `Circle` with fill gradient (linear or solid with inner highlight)
  - Outer ring: dashed `Circle` (strokeDasharray)
  - Inner ring: smaller dashed `Circle`
  - 6 nodes: positioned at 0°, 60°, 120°, 180°, 240°, 300° around outer ring
  - Connectors: `Line` elements from each node toward center (thin, low opacity)
- Each node: `Pressable` wrapping small `View` (icon + label), calls `onNodePress(nodeId)`
- Animation: `Animated.timing` on rotation of outer ring group, period ~20–24s, `useNativeDriver: true`
- Center orb label: short summary (e.g. "Today" + 1–2 words) — lightweight, can be placeholder

### 3. Wire node statuses from Dashboard

**Approach:** Tiny helper `getLifecycleNodeStatuses(dashboardData)` in `LifecycleHero.tsx` or a small `lifecycleNodeStatus.ts`:

- Input: props from Dashboard (sleepQ.data, moodStreak, medAdherencePct, upcomingDoses, etc.)
- Output: `{ mood: 'steady'|'link'|'—', sleep: 'ok'|'link'|'—', … }`
- If data not available: return `'—'` (neutral placeholder)
- Pass result to `LifecycleHero` as `nodeStatuses`

### 4. Integrate into Dashboard

**File:** `app/src/screens/Dashboard.tsx`

- Import `LifecycleHero`
- Insert `<LifecycleHero />` as the **first child** inside `ScrollView`, above the existing `{/* HERO */}` block
- Adjust `contentContainerStyle` if needed: hero should be full-bleed (no horizontal padding for hero only); existing content keeps `paddingHorizontal: 16`
- Pass `nodeStatuses` from the helper and `onNodePress` using `navigateTo*` from `nav.ts`

### 5. Layout / responsiveness

- Hero: `width: '100%'`, `paddingHorizontal: 0`, height ~200–240px
- ScrollView `contentContainerStyle`: first section (hero) has `paddingHorizontal: 0`; rest keeps `paddingHorizontal: 16`
- Use `paddingTop` on hero to account for safe area if needed (Dashboard may already handle this)

### 6. Dependency check

- **expo-linear-gradient:** Not installed → use solid dark + overlay View (no new dependency)
- **react-native-svg:** ✅ Use for rings, connectors, nodes

### 7. Verification

- Run `npm run typecheck`
- Run `npm run test`
- Manual: hero appears full-bleed, no card borders; tap each node → correct screen; animation is subtle; no horizontal scroll on small phone

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/src/components/dashboard/LifecycleHero.tsx` | **Create** |
| `app/src/navigation/nav.ts` | Add `navigateToTraining`, `navigateToAnalytics` |
| `app/src/screens/Dashboard.tsx` | Insert `<LifecycleHero />` above existing HERO, pass props |

---

## Acceptance Checklist (from spec)

- [ ] Hero appears at top of Dashboard, full-bleed, no card borders
- [ ] Two dotted rings + center orb + 6 nodes look clean and proportional on small phones
- [ ] Animation is subtle (not glowy)
- [ ] Tapping nodes navigates correctly
- [ ] No regressions to existing dashboard content below
- [ ] Typecheck passes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| SVG dashed stroke looks wrong on some Android devices | Fallback: solid stroke with larger dash array; test on device |
| Animation jank | useNativeDriver: true; keep animation on transform only |
| Hero too tall on small screens | Clamp hero height; ensure orb + rings scale down |
| Status data not available | Use `'—'` placeholder; keep wiring structure for later |

---

## Out of Scope (Phase 1)

- Popups/bottom sheets on node tap
- New data engines or heavy new queries
- Big refactors or new architectural layers
- expo-linear-gradient installation (use View-based fallback)

---

## Next Steps

1. **Review** this plan and the mockup image
2. **Approve** to proceed with implementation
3. Implementation will follow the steps above in order
