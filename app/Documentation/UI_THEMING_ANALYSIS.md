# UI Theming & Design System Analysis

## 1. How UI Theming Works Right Now

### Theme Configuration
**File**: `app/src/theme/index.ts`

The app uses **React Native Paper** (Material Design 3) as the base theming system:

```typescript
// Base theme extends MD3LightTheme
export const appLightTheme = {
  ...baseLight,
  colors: {
    primary: '#2563eb',           // Blue
    secondary: '#2563eb',         // Same blue
    background: '#f8fafc',         // Light gray
    surface: '#ffffff',            // White
    surfaceVariant: '#e2e8f0',     // Light gray variant
    onSurface: '#0f172a',         // Dark text
    onSurfaceVariant: '#475569',   // Medium gray text
    // ... Material Design 3 color tokens
  }
}
```

### Theme Usage Pattern
- **Provider**: `PaperProvider` wraps the app in `App.tsx` with `appLightTheme`
- **Hook**: `useTheme()` from `react-native-paper` is used throughout
- **Custom Hook**: `useAppTheme()` in `theme/index.ts` provides type-safe theme access

### Current Implementation
- ✅ Centralized theme definition
- ✅ Material Design 3 color system
- ✅ Type-safe theme access via `useAppTheme()`
- ❌ No spacing system
- ❌ No typography scale
- ❌ No component variants defined

---

## 2. Components/Screens with Consistent Styling

### Consistent Components (Using Theme)

**React Native Paper Components** (Consistent):
- `Card` - Used with `mode="elevated"` or `mode="outlined"`
- `Button` - Uses theme colors
- `Text` - Uses theme variants (`titleLarge`, `bodyMedium`, etc.)
- `TextInput` - Themed inputs
- `Chip` - Themed chips
- `List` - Themed lists

**Custom Components** (Mostly Consistent):
- `app/src/components/InsightCard.tsx` - Uses theme colors, borderRadius: 20, marginBottom: 16
- `app/src/components/CalendarCard.tsx` - Uses theme colors, borderRadius: 20, marginBottom: 16
- `app/src/components/ui/Card.tsx` - Custom wrapper, borderRadius: 16, padding: 16, marginBottom: 12
- `app/src/components/ui/Button.tsx` - Custom wrapper, borderRadius: 12, uses theme colors

**Screens** (Partially Consistent):
- `app/src/screens/Dashboard.tsx` - Uses theme colors, some inline styles
- `app/src/screens/MedsScreen.tsx` - Uses theme colors, borderRadius: 16 for cards
- `app/src/screens/SleepScreen.tsx` - Uses theme colors, mixed styling
- `app/src/screens/MoodScreen.tsx` - Uses theme colors, some inline styles

---

## 3. Inconsistent/Manually Styled Components

### Major Inconsistencies

**1. CheckInCard.tsx** - **COMPLETELY HARDCODED**
```typescript
// app/src/components/CheckInCard.tsx
// Uses hardcoded colors, no theme at all!
borderColor: '#e5e7eb'
backgroundColor: '#ffffff'
color: '#111827'
borderRadius: 16
padding: 16
marginBottom: 16
```

**2. Border Radius Inconsistencies**
- Cards: 16px (MedsScreen), 20px (InsightCard, CalendarCard), 12px (event items)
- Buttons: 12px (ui/Button), varies elsewhere
- No standard: 8, 12, 16, 20, 24 all used randomly

**3. Spacing Inconsistencies**
- Screen padding: 16px (MoodScreen, AnalyticsScreen), 20px (MedsScreen), varies
- Card margins: 12px (ui/Card), 16px (most screens), varies
- No spacing scale: 4, 6, 8, 12, 16, 20, 24 all used randomly

**4. Manual Inline Styles Everywhere**
- `app/src/screens/MedsScreen.tsx`: 50+ inline style objects
- `app/src/screens/Dashboard.tsx`: 30+ inline style objects
- `app/src/screens/SleepScreen.tsx`: 40+ inline style objects
- `app/src/screens/MoodScreen.tsx`: 20+ inline style objects

**5. Hardcoded Colors in Inline Styles**
```typescript
// Examples found:
backgroundColor: theme.colors.surface  // ✅ Good
backgroundColor: '#ffffff'             // ❌ Bad (CheckInCard)
color: '#111827'                      // ❌ Bad (CheckInCard)
borderColor: '#e5e7eb'                // ❌ Bad (CheckInCard)
```

**6. Typography Inconsistencies**
- Font weights: '600', '700', '800' used randomly
- No typography scale defined
- Mix of `Text` variants and manual `fontSize`/`fontWeight`

---

## 4. Design System Primitives

### What Exists

**Colors** ✅
- Defined in `app/src/theme/index.ts`
- Material Design 3 color tokens
- Accessible via `theme.colors.*`

**Component Library** ⚠️ (Partial)
- React Native Paper components (Card, Button, Text, etc.)
- Custom wrappers in `app/src/components/ui/`:
  - `Button.tsx` - Custom button wrapper
  - `Card.tsx` - Custom card wrapper
  - `Text.tsx` - Custom text wrapper
  - `Input.tsx` - Custom input wrapper

### What's Missing

**Spacing System** ❌
- No spacing scale (4, 8, 12, 16, 20, 24, 32, etc.)
- No spacing tokens
- Hardcoded values everywhere

**Typography Scale** ❌
- No defined font sizes
- No line heights
- No font weight scale
- Relies on React Native Paper variants but inconsistently

**Border Radius Scale** ❌
- No standard: 4, 8, 12, 16, 20, 24 all used randomly
- Should be: 4 (small), 8 (medium), 12 (large), 16 (xl), 20 (2xl)

**Layout Components** ❌
- No `AppScreen` wrapper (screens manually set padding)
- No `AppCard` wrapper (cards manually styled)
- No `AppContainer` for consistent layouts

**Shadow/Elevation System** ❌
- No defined elevation levels
- Cards use `elevation={2}` randomly

---

## 5. What Would Break with Unified Design System

### Low Risk (Easy Migration)

**1. React Native Paper Components**
- ✅ Already using theme
- ✅ Would benefit from spacing/typography tokens
- **Impact**: None - already compatible

**2. Custom UI Components** (`app/src/components/ui/`)
- ⚠️ Would need updates to use spacing tokens
- ⚠️ Would need border radius standardization
- **Impact**: Low - small refactor needed

**3. Most Screens** (Dashboard, MoodScreen, SleepScreen)
- ⚠️ Would need to replace inline styles with tokens
- ⚠️ Would need to use `AppScreen` wrapper
- **Impact**: Medium - refactoring needed but straightforward

### High Risk (Breaking Changes)

**1. CheckInCard.tsx** - **MAJOR BREAK**
```typescript
// Currently hardcoded, would need complete rewrite
// Uses: #e5e7eb, #ffffff, #111827, #9ca3af
// Would break: Everything - no theme usage at all
```

**2. Inline Style Objects**
- Hundreds of inline style objects would need refactoring
- **Files affected**:
  - `app/src/screens/MedsScreen.tsx` - 50+ inline styles
  - `app/src/screens/Dashboard.tsx` - 30+ inline styles
  - `app/src/screens/SleepScreen.tsx` - 40+ inline styles
  - `app/src/screens/MoodScreen.tsx` - 20+ inline styles
  - `app/src/components/CalendarCard.tsx` - Mix of StyleSheet and inline
  - `app/src/components/InsightCard.tsx` - Mix of StyleSheet and inline

**3. Hardcoded Values**
- Border radius: Would need to replace all hardcoded values
- Spacing: Would need to replace all hardcoded margins/padding
- Colors: Would need to audit and replace hardcoded colors

**4. StyleSheet.create() Usage**
- Some components use `StyleSheet.create()` (good)
- Would need to migrate to use design tokens
- **Impact**: Medium - refactoring needed

---

## 6. Duplicated Styling Patterns

### Card Styling (Duplicated 20+ times)

**Pattern Found Everywhere**:
```typescript
<Card 
  mode="elevated" 
  style={{ 
    borderRadius: 16,           // Sometimes 20, sometimes 12
    marginBottom: 16,           // Sometimes 12, sometimes 20
    backgroundColor: theme.colors.surface 
  }}
>
```

**Files with this pattern**:
- `app/src/screens/MedsScreen.tsx` - 5+ instances
- `app/src/screens/Dashboard.tsx` - 10+ instances
- `app/src/components/InsightCard.tsx` - 1 instance
- `app/src/components/CalendarCard.tsx` - 1 instance
- `app/src/screens/SleepScreen.tsx` - Multiple instances

**Should be**: `<AppCard>` component

---

### Screen Container Styling (Duplicated 10+ times)

**Pattern Found Everywhere**:
```typescript
<ScrollView
  style={{ backgroundColor: theme.colors.background }}
  contentContainerStyle={{ 
    padding: 20,              // Sometimes 16
    paddingBottom: 140        // Sometimes 120
  }}
>
```

**Files with this pattern**:
- `app/src/screens/MedsScreen.tsx` - padding: 20, paddingBottom: 140
- `app/src/screens/MoodScreen.tsx` - padding: 16, paddingBottom: 120
- `app/src/screens/SleepScreen.tsx` - padding: 16, paddingBottom: 120
- `app/src/screens/AnalyticsScreen.tsx` - padding: 16

**Should be**: `<AppScreen>` wrapper component

---

### Text Color Styling (Duplicated 50+ times)

**Pattern Found Everywhere**:
```typescript
<Text 
  variant="bodyMedium" 
  style={{ color: theme.colors.onSurfaceVariant }}
>
```

**Files with this pattern**: Almost every screen file

**Should be**: Typography component with variants

---

### Button Styling (Duplicated 15+ times)

**Pattern Found Everywhere**:
```typescript
<Button
  mode="contained"
  style={{ borderRadius: 12 }}  // Sometimes missing
  onPress={...}
>
```

**Should be**: Standardized button component

---

### Section Title Styling (Duplicated 10+ times)

**Pattern Found Everywhere**:
```typescript
<Text 
  variant="titleLarge" 
  style={{ 
    color: theme.colors.onSurface, 
    fontWeight: '600',           // Sometimes '700'
    marginBottom: 12              // Sometimes 16
  }}
>
```

**Files with this pattern**:
- `app/src/screens/MedsScreen.tsx`
- `app/src/screens/Dashboard.tsx`
- Multiple other screens

**Should be**: `<SectionTitle>` component

---

### Empty State Styling (Duplicated 5+ times)

**Pattern Found**:
```typescript
<View style={{ 
  paddingVertical: 24, 
  alignItems: 'center' 
}}>
  <Text style={{ 
    color: theme.colors.onSurfaceVariant, 
    textAlign: 'center' 
  }}>
    No data
  </Text>
</View>
```

**Should be**: `<EmptyState>` component

---

## 7. Recommended Migration Path

### Phase 1: Foundation (Low Risk)

**1.1. Extend Theme with Design Tokens**
**File**: `app/src/theme/index.ts`

```typescript
export const appLightTheme = {
  ...baseLight,
  colors: { /* existing */ },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '800', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
    caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  },
}
```

**1.2. Create AppScreen Wrapper**
**File**: `app/src/components/ui/AppScreen.tsx`

```typescript
export function AppScreen({ 
  children, 
  padding = 'lg',
  paddingBottom = 120 
}: AppScreenProps) {
  const theme = useAppTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{
        padding: theme.spacing[padding],
        paddingBottom,
      }}
    >
      {children}
    </ScrollView>
  );
}
```

**1.3. Create AppCard Wrapper**
**File**: `app/src/components/ui/AppCard.tsx`

```typescript
export function AppCard({ 
  children, 
  mode = 'elevated',
  marginBottom = 'lg' 
}: AppCardProps) {
  const theme = useAppTheme();
  return (
    <Card
      mode={mode}
      style={{
        borderRadius: theme.borderRadius.xl,
        marginBottom: theme.spacing[marginBottom],
        backgroundColor: theme.colors.surface,
      }}
    >
      {children}
    </Card>
  );
}
```

**1.4. Create Typography Components**
**File**: `app/src/components/ui/Typography.tsx`

```typescript
export function Heading1({ children, style }: TypographyProps) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.h1, { color: theme.colors.onSurface }, style]}>
      {children}
    </Text>
  );
}
// ... Heading2, Heading3, Body, Caption
```

---

### Phase 2: Migrate High-Impact Components (Medium Risk)

**2.1. Fix CheckInCard.tsx** (Priority: HIGH)
- Replace all hardcoded colors with theme
- Use AppCard wrapper
- Use spacing tokens
- **Estimated effort**: 1-2 hours

**2.2. Migrate Custom UI Components**
- Update `app/src/components/ui/Button.tsx` to use tokens
- Update `app/src/components/ui/Card.tsx` to use tokens
- Update `app/src/components/ui/Text.tsx` to use tokens
- **Estimated effort**: 2-3 hours

**2.3. Create Reusable Components**
- `<SectionTitle>` - For section headings
- `<EmptyState>` - For empty states
- `<AppContainer>` - For consistent containers
- **Estimated effort**: 2-3 hours

---

### Phase 3: Migrate Screens (Medium-High Risk)

**3.1. Start with Simple Screens**
- `app/src/screens/AnalyticsScreen.tsx` - Simpler, good starting point
- Replace inline styles with tokens
- Use AppScreen wrapper
- Use AppCard wrapper
- **Estimated effort**: 2-3 hours per screen

**3.2. Migrate Complex Screens**
- `app/src/screens/MedsScreen.tsx` - 50+ inline styles
- `app/src/screens/Dashboard.tsx` - 30+ inline styles
- `app/src/screens/SleepScreen.tsx` - 40+ inline styles
- `app/src/screens/MoodScreen.tsx` - 20+ inline styles
- **Estimated effort**: 4-6 hours per screen

**3.3. Migrate Components**
- `app/src/components/InsightCard.tsx` - Use AppCard
- `app/src/components/CalendarCard.tsx` - Use AppCard
- `app/src/components/CheckInCard.tsx` - Complete rewrite
- **Estimated effort**: 1-2 hours per component

---

### Phase 4: Cleanup & Standardization (Low Risk)

**4.1. Remove Duplicate Patterns**
- Replace all card styling with AppCard
- Replace all screen containers with AppScreen
- Replace all text colors with Typography components

**4.2. Audit & Fix**
- Find all hardcoded colors (grep for `#`)
- Find all hardcoded spacing values
- Find all hardcoded border radius values
- Replace with tokens

**4.3. Documentation**
- Document design tokens
- Create component usage guide
- Add Storybook (optional but recommended)

---

## Migration Priority Summary

### Critical (Do First)
1. ✅ Extend theme with spacing/borderRadius tokens
2. ✅ Create AppScreen wrapper
3. ✅ Create AppCard wrapper
4. ✅ Fix CheckInCard.tsx (hardcoded colors)

### High Priority
5. ✅ Create Typography components
6. ✅ Migrate custom UI components
7. ✅ Migrate AnalyticsScreen (simplest)

### Medium Priority
8. ✅ Migrate MoodScreen
9. ✅ Migrate MedsScreen
10. ✅ Migrate Dashboard
11. ✅ Migrate SleepScreen

### Low Priority
12. ✅ Migrate remaining components
13. ✅ Audit and fix hardcoded values
14. ✅ Documentation

---

## Estimated Total Effort

- **Phase 1 (Foundation)**: 6-8 hours
- **Phase 2 (High-Impact)**: 6-8 hours
- **Phase 3 (Screens)**: 20-30 hours
- **Phase 4 (Cleanup)**: 8-12 hours

**Total**: 40-58 hours

---

## Risk Assessment

**Low Risk**:
- Extending theme (backward compatible)
- Creating new wrapper components (doesn't break existing)

**Medium Risk**:
- Migrating screens (requires testing)
- Replacing inline styles (could miss edge cases)

**High Risk**:
- CheckInCard.tsx rewrite (complete change)
- Removing duplicate patterns (could break if not careful)

---

## Recommendations

1. **Start with Phase 1** - Foundation is safe and enables everything else
2. **Fix CheckInCard.tsx immediately** - It's completely broken from theming perspective
3. **Migrate one screen at a time** - Test thoroughly after each migration
4. **Use TypeScript** - Type-safe design tokens prevent errors
5. **Create migration checklist** - Track progress per file
6. **Test on both platforms** - iOS and Android may render differently

---

## Files That Need Migration

### Critical (Hardcoded Colors)
- `app/src/components/CheckInCard.tsx` ⚠️ **CRITICAL**

### High Priority (Many Inline Styles)
- `app/src/screens/MedsScreen.tsx` - 50+ inline styles
- `app/src/screens/Dashboard.tsx` - 30+ inline styles
- `app/src/screens/SleepScreen.tsx` - 40+ inline styles
- `app/src/screens/MoodScreen.tsx` - 20+ inline styles

### Medium Priority (Some Inline Styles)
- `app/src/components/InsightCard.tsx`
- `app/src/components/CalendarCard.tsx`
- `app/src/screens/AnalyticsScreen.tsx`

### Low Priority (Mostly Good)
- `app/src/components/ui/Button.tsx` - Needs token updates
- `app/src/components/ui/Card.tsx` - Needs token updates
- `app/src/components/ui/Text.tsx` - Needs token updates

---

**END OF ANALYSIS**

