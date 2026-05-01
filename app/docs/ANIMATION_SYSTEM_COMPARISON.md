# Animation System Comparison: Lottie vs Rive vs React Native Skia
**Date**: January 28, 2026  
**For**: Hero Card Animations (Brain, Weather, Sleep, Meds)  
**Current Stack**: Expo SDK 54, React Native 0.81.5, Reanimated 4.1.1

---

## Executive Summary

**Recommendation**: **React Native Skia** (with Reanimated)

**Why**: Already have Reanimated installed, best performance, most flexibility, no designer dependency, perfect for interactive/dynamic content, premium feel.

---

## Your Specific Requirements

### 1. Dashboard LifecycleHero: Brain Visualization
- Different brain regions for each module (Mood, Sleep, Training, Meds, etc.)
- Arrows/annotations pointing to brain parts
- Interactive (tappable regions?)

### 2. Mood Hero: Weather System
- Dynamic weather that changes with current feeling
- Likely needs: clouds, rain, sun, storms, fog, etc.
- Real-time state changes

### 3. Sleep Hero: TBD
- Possibly: moon phases, sleep stages, circadian rhythm visualization

### 4. Medication Hero: Pharmaceutical Theme
- Pills, molecules, chemical structures, dosage visualizations

---

## Comparison Matrix

| Feature | Lottie | Rive | React Native Skia |
|---------|--------|------|-------------------|
| **Performance** | Good (60fps simple) | Excellent (60fps complex) | **Excellent (GPU-accelerated)** |
| **File Size** | Medium (JSON) | Small (binary) | N/A (code-based) |
| **Interactive** | Limited | Good | **Excellent** |
| **Dynamic Content** | ❌ Pre-rendered | ⚠️ Limited | ✅ **Fully dynamic** |
| **Designer Tools** | After Effects | Rive Editor | Code only |
| **Learning Curve** | Easy | Medium | **Steep** |
| **Expo Compatibility** | ✅ Native | ⚠️ Needs dev build | ✅ **Works great** |
| **Bundle Impact** | +200-500KB | +1-2MB | **+3-4MB** |
| **Premium Feel** | Good | Excellent | **Excellent** |
| **Your Use Case** | ⚠️ Limited | ⚠️ Static | ✅ **Perfect fit** |

---

## Detailed Analysis

### 1. Lottie (lottie-react-native)

**What it is**: After Effects animations exported as JSON, rendered in React Native

#### ✅ Pros
- **Easy to implement**: `npx expo install lottie-react-native` and done
- **Designer-friendly**: Non-technical team can create animations in After Effects
- **Expo native support**: Works in Expo Go
- **Small bundle impact**: ~200-500KB
- **Battle-tested**: Used by thousands of apps
- **Good performance**: 60fps for simple animations

#### ❌ Cons
- **Static animations**: Can't change based on real-time data easily
- **Limited interactivity**: Hard to make tappable regions or dynamic content
- **Android issues**: Known crashes with Lottie Editor-generated files on Android Expo
- **No dynamic weather**: Can't smoothly transition between weather states based on mood
- **Designer dependency**: Need After Effects skills to create/edit
- **Not ideal for your brain/weather requirements**: Pre-rendered = can't show live data

#### Risk Assessment
- **Low implementation risk** (easy to add/remove)
- **Medium functionality risk** (won't meet dynamic requirements)
- **Medium compatibility risk** (Android issues reported)

#### For Your Use Cases
- ❌ **Brain visualization**: Can't dynamically highlight regions based on which module is active
- ❌ **Weather system**: Can't smoothly morph between weather states
- ⚠️ **Medication**: Could work for static pill animations
- **Verdict**: Not recommended for your needs

---

### 2. Rive (rive-react-native)

**What it is**: Modern animation tool with runtime (state machines, interactivity)

#### ✅ Pros
- **State machines**: Can define weather states and transitions
- **Interactive**: Built-in support for tap, hover, drag
- **Small file size**: Binary format is compact
- **Good performance**: GPU-accelerated
- **Designer-friendly**: Rive Editor is intuitive
- **Better than Lottie**: More control over runtime behavior

#### ❌ Cons
- **Requires Expo dev build**: Doesn't work in Expo Go (custom native code)
- **New runtime in preview**: The Nitro-based `@rive-app/react-native` is still unstable
- **Larger bundle**: +1-2MB impact
- **Limited dynamic content**: Still pre-designed states, can't generate content on the fly
- **Learning curve**: Need to learn Rive Editor
- **State machine complexity**: Complex state machines get hard to maintain

#### Risk Assessment
- **Medium implementation risk** (Expo dev build required, new runtime unstable)
- **Medium functionality risk** (limited dynamic generation)
- **Low compatibility risk** (new runtime focuses on stability)

#### For Your Use Cases
- ⚠️ **Brain visualization**: Could define states for each active module, but clunky
- ⚠️ **Weather system**: Could work with predefined weather states, but limited blending
- ⚠️ **Medication**: Good for animated pills with state machines
- **Verdict**: Better than Lottie, but still constrained by pre-designed states

---

### 3. React Native Skia (Recommended)

**What it is**: GPU-accelerated 2D graphics engine with imperative drawing API

#### ✅ Pros
- **Fully dynamic**: Generate graphics in real-time based on live data
- **Excellent performance**: GPU-accelerated, 60fps+ with complex animations
- **You already have Reanimated**: Integrates seamlessly with Reanimated 4.1.1
- **No designer dependency**: All code-based, full control
- **Perfect for interactive content**: Can draw anything, respond to any gesture
- **Premium feel**: Custom graphics look unique and polished
- **Ideal for your brain**: Can dynamically highlight brain regions based on active modules
- **Ideal for weather**: Can smoothly morph clouds, rain, sun based on mood in real-time
- **Flexible**: Can create shaders, gradients, paths, filters, masks
- **Future-proof**: Maintained by Shopify, used in production apps

#### ❌ Cons
- **Steep learning curve**: Need to learn Skia drawing APIs
- **Code-based**: No visual editor (but you're technical, so this is fine)
- **Larger bundle**: +3-4MB (but worth it for the flexibility)
- **More development time**: Takes longer to build than importing a Lottie file
- **No design handoff**: Can't have a designer create animations separately

#### Risk Assessment
- **Low implementation risk** (stable library, good docs)
- **Low functionality risk** (can do anything)
- **Low compatibility risk** (Expo compatible, works with existing Reanimated)
- **Medium time risk** (takes longer to build initially)

#### For Your Use Cases
- ✅ **Brain visualization**: Perfect! Draw brain SVG, highlight regions dynamically, add pulsing effects
- ✅ **Weather system**: Excellent! Generate clouds/rain/sun procedurally, morph based on mood value
- ✅ **Medication**: Great! Draw pills, molecules, animated chemical structures
- ✅ **Sleep**: Perfect! Animated moon phases, circadian rhythm waves, sleep stage graphs
- **Verdict**: Best fit for all your requirements

---

## Technical Deep Dive: Skia for Your Use Cases

### Brain Visualization (Dashboard)

**Approach**:
```typescript
// Pseudo-code concept
<Canvas>
  {/* Brain SVG path */}
  <Path path={brainOutline} color="#1a1a2e" />
  
  {/* Highlight active regions */}
  <Group opacity={moodActive ? 1 : 0.3}>
    <Path path={prefrontalCortex} color="#00b4d8" />
    <Circle cx={...} cy={...} r={5} color="#00b4d8">
      <Glow blur={10} /> {/* Pulsing glow */}
    </Circle>
  </Group>
  
  {/* Annotations with arrows */}
  <Line p1={...} p2={...} strokeWidth={2} />
  <Text x={...} y={...} text="Mood" />
</Canvas>
```

**Features**:
- Brain regions change opacity/color based on which module user is viewing
- Animated pulsing glow on active regions (using Reanimated shared values)
- Smooth transitions between states
- Tappable regions that navigate to respective modules

---

### Weather System (Mood Hero)

**Approach**:
```typescript
// Map mood to weather
const weatherStates = {
  joyful: { type: 'sunny', cloudCover: 0, rainIntensity: 0 },
  calm: { type: 'clear', cloudCover: 0.2, rainIntensity: 0 },
  sad: { type: 'rainy', cloudCover: 0.8, rainIntensity: 0.6 },
  anxious: { type: 'stormy', cloudCover: 1, rainIntensity: 0.9 },
};

// Animated transition
const cloudCover = useSharedValue(0);
const rainIntensity = useSharedValue(0);

// In render
<Canvas>
  {/* Sky gradient changes with mood */}
  <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient colors={skyGradient} />
  </Rect>
  
  {/* Procedural clouds */}
  {clouds.map(cloud => (
    <Cloud 
      opacity={cloudCover} 
      position={animatedPosition} 
    />
  ))}
  
  {/* Rain particles */}
  {rainDrops.map(drop => (
    <Line 
      opacity={rainIntensity} 
      y={animatedY} 
    />
  ))}
</Canvas>
```

**Features**:
- Smooth morphing between weather states as mood changes
- Procedurally generated clouds that drift
- Animated rain particles
- Dynamic sky gradient based on mood value
- All driven by real-time mood data

---

### Medication Hero

**Approach**:
```typescript
<Canvas>
  {/* Floating pills */}
  <Group transform={[{ translateY: animatedY }]}>
    <RoundedRect x={...} y={...} width={40} height={60} r={20} color="#ff6b6b" />
    <Circle cx={...} cy={...} r={10} color="#fff" opacity={0.3} />
  </Group>
  
  {/* Molecular structure */}
  <Group>
    {atoms.map(atom => (
      <Circle cx={atom.x} cy={atom.y} r={8} color={atom.color} />
    ))}
    {bonds.map(bond => (
      <Line p1={bond.start} p2={bond.end} strokeWidth={2} />
    ))}
  </Group>
</Canvas>
```

**Features**:
- Floating pills with subtle bounce animation
- Molecular structure visualization
- Dosage timeline visualization
- All responsive to actual medication data

---

## Premium Feel Comparison

| Aspect | Lottie | Rive | Skia |
|--------|--------|------|------|
| **Uniqueness** | ⭐⭐ (generic) | ⭐⭐⭐ (better) | ⭐⭐⭐⭐⭐ (unique) |
| **Smoothness** | ⭐⭐⭐ (good) | ⭐⭐⭐⭐ (excellent) | ⭐⭐⭐⭐⭐ (buttery) |
| **Responsiveness** | ⭐⭐ (static) | ⭐⭐⭐ (states) | ⭐⭐⭐⭐⭐ (live data) |
| **Polish** | ⭐⭐⭐ (depends on designer) | ⭐⭐⭐⭐ (good tools) | ⭐⭐⭐⭐⭐ (custom) |

**Verdict**: Skia creates the most premium, unique feel because animations are custom-built for your exact data and use case.

---

## Compatibility with Your Stack

### Current Dependencies
- ✅ `react-native-reanimated`: ~4.1.1 (perfect for Skia)
- ✅ `react-native-svg`: 15.12.1 (already have SVG support)
- ✅ `react-native-gesture-handler`: ~2.28.0 (for interactions)
- ✅ Expo SDK 54 (supports all three options)

### To Add Skia
```bash
npx expo install @shopify/react-native-skia
```

**Bundle impact**: +3-4MB (mostly native Skia engine)
**Build time impact**: Minimal (already using dev builds for health integrations)
**Runtime impact**: None (GPU-accelerated, often faster than JS animations)

---

## Risk Assessment Summary

### Lottie
- ⚠️ **Functionality risk**: Won't meet your dynamic requirements
- ⚠️ **Android risk**: Known crashes on Android Expo
- ✅ **Easy to remove if needed**

### Rive
- ⚠️ **Stability risk**: New runtime in preview, API may change
- ⚠️ **Build complexity**: Requires Expo dev build
- ⚠️ **Functionality risk**: Limited dynamic content generation

### React Native Skia (Recommended)
- ✅ **Stable**: Battle-tested, maintained by Shopify
- ✅ **Compatible**: Works perfectly with your existing stack
- ⚠️ **Development time**: Takes longer to build initially
- ✅ **Future-proof**: Most flexible for future requirements

---

## Development Time Estimate

### Lottie
- **Setup**: 1 hour
- **Per hero**: 4-8 hours (designer time + integration)
- **Dynamic behavior**: +8-16 hours (workarounds)
- **Total**: ~20-30 hours

### Rive
- **Setup**: 2-4 hours (dev build)
- **Learning Rive**: 4-8 hours
- **Per hero**: 6-12 hours (design + state machines)
- **Total**: ~30-50 hours

### React Native Skia
- **Setup**: 1 hour
- **Learning Skia**: 8-16 hours (one-time investment)
- **Per hero**: 8-16 hours (custom implementation)
- **Total**: ~40-70 hours

**But**: Skia gives you the most control and best results. The initial time investment pays off with a unique, premium feel.

---

## Recommended Implementation Path

### Phase 1: Proof of Concept (Week 1)
1. Install `@shopify/react-native-skia`
2. Build simple brain visualization with 2-3 regions
3. Add basic pulsing animation with Reanimated
4. Validate performance on Samsung Galaxy Watch

### Phase 2: Weather System (Week 2)
1. Build cloud generation algorithm
2. Add rain particles
3. Implement mood-to-weather mapping
4. Add smooth transitions between states

### Phase 3: Polish & Remaining Heroes (Week 3-4)
1. Complete brain visualization with all modules
2. Build medication hero
3. Design sleep hero
4. Performance optimization

---

## Final Recommendation

**Use React Native Skia** because:

1. ✅ **Fits your requirements perfectly**: Dynamic brain regions, real-time weather, interactive content
2. ✅ **Best performance**: GPU-accelerated, 60fps+
3. ✅ **Most premium feel**: Custom, unique animations
4. ✅ **Future-proof**: Can adapt to any new requirements
5. ✅ **Already have Reanimated**: Integrates seamlessly
6. ✅ **Full control**: No designer dependency, no file format limitations

**Trade-offs you accept**:
- ⚠️ Steeper learning curve (but you're technical)
- ⚠️ More development time upfront (but better results)
- ⚠️ Larger bundle size (+3-4MB, but worth it)

---

## Alternative: Hybrid Approach

If you want to move faster initially:

**Option A**: Start with Lottie for simple heroes (training, meds), use Skia for complex ones (brain, weather)

**Option B**: Use Skia for everything, start simple and iterate

**Recommendation**: Option B (consistent architecture, better long-term)

---

## Resources

### Skia Learning Resources
- Official docs: https://shopify.github.io/react-native-skia/
- William Candillon's YouTube: Excellent Skia tutorials
- Shopify engineering blog: Real-world Skia examples

### Reanimated + Skia Integration
- Shared values work directly: No wrapper needed
- Worklet-based animations: Run on UI thread
- Gesture integration: Use `react-native-gesture-handler`

---

## Next Steps

1. **Review this analysis** with your team
2. **Decide on approach** (recommend Skia)
3. **Start with proof of concept** (brain visualization)
4. **Iterate based on results**

**Do NOT implement all at once**. Build one hero, validate approach, then scale.

---

## Questions to Consider

1. **Do you have design mockups** for the brain/weather visualizations?
2. **How complex** should the brain regions be? (Simple shapes or detailed anatomy?)
3. **Weather states**: How many moods map to how many weather types?
4. **Performance targets**: 60fps on Samsung Galaxy Watch?
5. **Accessibility**: Should animations respect reduce-motion preferences?

---

## Summary Table

| Criteria | Lottie | Rive | Skia |
|----------|--------|------|------|
| **Best for dynamic content** | ❌ | ⚠️ | ✅ |
| **Best for interactive** | ❌ | ⚠️ | ✅ |
| **Best for your brain viz** | ❌ | ⚠️ | ✅ |
| **Best for weather system** | ❌ | ⚠️ | ✅ |
| **Easiest to implement** | ✅ | ⚠️ | ❌ |
| **Most premium feel** | ⚠️ | ⚠️ | ✅ |
| **Best performance** | ⚠️ | ✅ | ✅ |
| **Best long-term** | ❌ | ⚠️ | ✅ |

**Winner**: React Native Skia

Ready to proceed with Skia implementation when you are!
