## UI Theming Contract

This document summarizes the shared layout primitives and visual rules we now apply across Dashboard, Mood, Sleep, Meds, Mindfulness, Meditation, Notifications, and Settings. Use these conventions for any new screen or when refactoring existing ones so the product remains cohesive.

### 1. Layout & Wrappers

1. Wrap primary content in a `ScrollView` with:
   - `style={{ backgroundColor: theme.colors.background }}`
   - `contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}` (bigger bottom padding if a FAB or bottom tabs overlap).
2. For list-based screens (e.g., Dashboard `SectionList`), maintain multi-panel layouts but ensure headers and cards use the shared primitives below.

### 2. Section Headers

1. Use `SectionHeader` from `@/components/ui` for every logical grouping (hero, insights, Today, history, etc.).
2. Always supply an `icon` that reflects the section (e.g., `calendar-today` for schedules, `lightbulb-on-outline` for insights, `history` for logs).
3. When helpful, set `caption` for supporting copy (e.g., “7D • 30D • 365D averages”).

### 3. Card Hierarchy

1. **ActionCard** (hero/primary summaries) — typically first block, with prominent icon + headline.
2. **Card mode="elevated"** — default for key panels.
3. **Card mode="outlined"** — informational or fallback/error states.
4. Always use `borderRadius: 16` (24 for hero chips if needed) and respect `sectionSpacing` (16) between stacked cards.
5. For nested utility sections (forms, tables), place controls inside a single `Card` rather than free-floating views.

### 4. Buttons & Chips

1. Primary actions use `mode="contained"`. Secondary actions use `mode="outlined"`. Tertiary/inline actions use `mode="text"` (or `contained-tonal` for subtle primary actions).
2. When multiple buttons exist in a row, use `View` containers with `columnGap` and avoid ad-hoc `marginRight`. This keeps spacing consistent across screen sizes.
3. Chips should be used for quick toggles/status; prefer `mode="outlined"` for neutral states and `mode="flat"/"filled"` for active ones.

### 5. Spacing Tokens

1. Introduce local `const sectionSpacing = theme.spacing?.lg ?? 16`, `cardRadius = 16`, `cardSurface = theme.colors.surface` for readability.
2. Use `theme.spacing` helpers inside cards (e.g., `theme.spacing.sm` for vertical gaps) to avoid hard-coded values.
3. Maintain 8px increments for internal padding/gaps unless the design calls for larger hero spacing.

### 6. Typography

1. Headings: `variant="titleMedium"` (or `headlineSmall`/`headlineLarge` for hero text). Body copy uses `bodyMedium`; helper text uses `bodySmall`.
2. Avoid custom font sizes unless necessary; rely on Paper’s variants for predictability.

### 7. Insights Block Pattern

1. Each screen with insights should follow: `SectionHeader` → loading card (outlined) → error card (outlined with retry button) → `InsightCard` or an outlined disabled message if insights are off.
2. `InsightCard` receives `testID` for QA (`mood-insight-card`, `meds-insight-card`, `dashboard-insight-card`, etc.).

### 8. Modals & Overlays

1. Use `Portal` + `Card` or `Modal` with `borderRadius: 16`–`24`, `padding: 16–20`, and `backgroundColor: theme.colors.surface`.
2. Backdrops should use `theme.colors.backdrop` or a semi-transparent black (`rgba(0,0,0,0.5)`).
3. Buttons inside modals follow the same contained/outlined hierarchy, aligned right for confirm/cancel.

### 9. Calendar & Embedded Cards

1. Components like `CalendarCard` that already render their own `Card` should **not** be wrapped in another card. Instead, keep them as direct children within the section.
2. If a child component lacks internal framing, wrap it in a card before rendering in the parent (as done for most sections of Dashboard).

### 10. Measuring New Screens

1. Start with a `sectionSpacing` map for the screen.
2. Define SectionHeaders first, then drop in cards beneath each header.
3. Ensure button spacing/gaps, chip styles, and typography mirror existing screens.
4. Use `read_lints` after refactors to catch style or prop regressions.

Following these rules keeps our growing set of screens consistent while still allowing feature-specific layouts (e.g., Dashboard’s multi-column grid, Settings’ utility sections).

