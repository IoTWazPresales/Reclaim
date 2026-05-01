# Hero Animation Concepts with React Native Skia

**Detailed visual concepts for each hero card**

---

## 1. Dashboard: Brain Visualization

### Concept
A stylized brain with 6 labeled regions, each corresponding to a module. Active modules glow and pulse.

### Visual Elements
```
     [Mindfulness]
         ↑
    ┌────────┐
   ╱   🧠     ╲    → [Mood]
  │  ●  ●  ●  │
  │  ● ⦿ ●  │   ⦿ = Currently active (glowing)
  │  ●  ●  ●  │   ● = Module region
   ╲         ╱
    └────────┘
         ↓
      [Sleep]
```

### Brain Regions Mapping
- **Prefrontal Cortex** (top front): Mood, Mindfulness
- **Hippocampus** (middle): Sleep
- **Motor Cortex** (top back): Training
- **Temporal Lobe** (sides): Medication schedule
- **Visual Cortex** (back): Analytics/Insights
- **Brainstem** (bottom): Recovery stages

### Animation States
1. **Idle**: Soft breathing animation (all regions pulse gently)
2. **Module active**: Active region glows brighter, pulsing faster
3. **Tap**: Region scales slightly, navigates to module
4. **Data sync**: Wave animation ripples from active region outward

### Skia Implementation Notes
```typescript
// Brain regions as paths
const brainRegions = {
  mood: "M 100,50 Q 120,30 140,50 ...",
  sleep: "M 80,80 Q 100,70 120,80 ...",
  // etc
};

// Animated glow
const glowRadius = useSharedValue(5);
useEffect(() => {
  glowRadius.value = withRepeat(
    withTiming(15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
    -1,
    true
  );
}, []);

// In Canvas
<Path path={brainRegions.mood} color="#00b4d8">
  <BlurMask blur={glowRadius} style="solid" />
</Path>
```

### Color Palette
- **Inactive regions**: `rgba(226, 232, 240, 0.3)` (subtle gray)
- **Active region**: `#00b4d8` (bright blue)
- **Glow**: Radial gradient from blue to transparent
- **Background**: Dark sci-fi theme (matching current design)

---

## 2. Mood Hero: Weather System

### Concept
Dynamic weather scene that morphs based on current/recent mood state. Sky gradient, clouds, precipitation, and celestial objects change smoothly.

### Weather State Mapping

| Mood State | Weather | Sky Gradient | Elements |
|------------|---------|--------------|----------|
| **Joyful/Happy** | Sunny | Bright blue → Light blue | Sun rays, few clouds |
| **Calm/Content** | Clear | Blue → Soft blue | Gentle clouds, soft glow |
| **Neutral** | Partly cloudy | Gray-blue | Medium cloud cover |
| **Sad/Down** | Rainy | Dark gray → Gray | Heavy clouds, rain |
| **Anxious/Stressed** | Stormy | Dark purple → Gray | Dark clouds, lightning, heavy rain |
| **Angry** | Thunderstorm | Red-tinted → Dark | Lightning, heavy clouds |

### Visual Elements
```
☀️  Sunny (Joyful)           🌧️  Rainy (Sad)
┌─────────────────┐         ┌─────────────────┐
│ ☀️   ☁️          │         │ ☁️ ☁️ ☁️ ☁️     │
│                 │         │  |  |  |  |     │
│                 │         │  |  |  |  |     │
│    ☁️           │         │  |  |  |  |     │
└─────────────────┘         └─────────────────┘
 Bright blue sky             Dark gray sky
```

### Animation States
1. **Transition**: Smooth morph between weather states (2-3 second duration)
2. **Clouds**: Drift slowly across screen (parallax effect)
3. **Rain**: Falling particles with varying speed/opacity
4. **Sun**: Gentle pulsing glow, rays animate
5. **Lightning**: Occasional flash for stormy states

### Skia Implementation Notes
```typescript
// Weather data
const currentMood = useMoodContext(); // "joyful" | "sad" | etc
const weatherState = moodToWeather(currentMood);

// Animated values
const skyColorTop = useSharedValue(weatherState.skyTop);
const cloudCoverage = useSharedValue(weatherState.clouds);
const rainIntensity = useSharedValue(weatherState.rain);

// Transition to new weather
useEffect(() => {
  const newWeather = moodToWeather(currentMood);
  skyColorTop.value = withTiming(newWeather.skyTop, { duration: 2000 });
  cloudCoverage.value = withTiming(newWeather.clouds, { duration: 3000 });
  rainIntensity.value = withTiming(newWeather.rain, { duration: 2000 });
}, [currentMood]);

// In Canvas
<Canvas>
  {/* Sky gradient */}
  <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient
      start={vec(0, 0)}
      end={vec(0, height)}
      colors={[skyColorTop, skyColorBottom]}
    />
  </Rect>

  {/* Clouds (procedurally generated) */}
  {clouds.map((cloud, i) => (
    <Cloud
      key={i}
      x={cloud.x}
      y={cloud.y}
      opacity={cloudCoverage}
      {...cloud.shape}
    />
  ))}

  {/* Rain particles */}
  {rainDrops.map((drop, i) => (
    <Line
      key={i}
      p1={vec(drop.x, drop.y)}
      p2={vec(drop.x, drop.y + 15)}
      color="rgba(255, 255, 255, 0.6)"
      strokeWidth={1}
      opacity={rainIntensity}
    />
  ))}
</Canvas>
```

### Cloud Generation Algorithm
```typescript
// Procedural cloud shapes using perlin noise or simple circles
function generateCloud(seed: number) {
  const circles = [];
  for (let i = 0; i < 5; i++) {
    circles.push({
      x: Math.random() * 80,
      y: Math.random() * 40,
      r: 20 + Math.random() * 20,
    });
  }
  return circles;
}
```

### Interactive Elements
- **Tap cloud**: Shows mood history or tips
- **Swipe**: Manual weather change (for testing/demo)
- **Pull-to-refresh**: Sync mood data

---

## 3. Sleep Hero: Circadian Rhythm Visualization

### Concept
Moon phases combined with a circadian rhythm wave, showing sleep quality and patterns.

### Visual Elements
```
┌─────────────────────────┐
│  🌙                     │  Moon phase (current night)
│     ╱‾‾‾╲              │
│    ╱     ╲             │  Circadian wave
│   ╱       ╲___         │  (peaks = awake, valleys = sleep)
│  ╱            ╲        │
│                        │
│  ●●●●○○○○ Sleep stages │  (●=deep, ○=light)
└─────────────────────────┘
```

### Sleep States
- **Well-rested**: Bright moon, smooth wave, consistent stages
- **Poor sleep**: Dim moon, jagged wave, fragmented stages
- **Nap detected**: Small sun icon during day
- **No data**: Subtle prompt to connect health source

### Animation States
1. **Moon phases**: Rotate through actual moon phase based on date
2. **Wave animation**: Draws from left to right showing last 7 days
3. **Sleep stages**: Bars rise/fall to show deep vs light sleep
4. **Stars**: Twinkle in background (more stars = better sleep quality)

### Skia Implementation
```typescript
<Canvas>
  {/* Night sky */}
  <Rect x={0} y={0} width={width} height={height}>
    <RadialGradient
      c={vec(width / 2, 100)}
      r={width}
      colors={['#1a1a2e', '#0f0f1e']}
    />
  </Rect>

  {/* Stars (more = better sleep) */}
  {stars.map((star, i) => (
    <Circle
      key={i}
      cx={star.x}
      cy={star.y}
      r={star.r}
      color="rgba(255, 255, 255, 0.8)"
      opacity={starTwinkle[i]}
    />
  ))}

  {/* Moon */}
  <Circle cx={moonX} cy={moonY} r={40} color="#f4f4f4">
    {/* Shadow for phase */}
    <Circle cx={moonX + moonPhaseOffset} cy={moonY} r={40} color="#1a1a2e" />
  </Circle>

  {/* Circadian wave */}
  <Path path={circadianPath} color="#00b4d8" strokeWidth={3} style="stroke" />

  {/* Sleep stage bars */}
  {sleepStages.map((stage, i) => (
    <Rect
      key={i}
      x={i * barWidth}
      y={height - stage.depth}
      width={barWidth - 2}
      height={stage.depth}
      color={stage.isDeep ? '#4a90e2' : '#a8d8ea'}
      opacity={0.8}
    />
  ))}
</Canvas>
```

---

## 4. Medication Hero: Pharmaceutical Visualization

### Concept
Floating pills with molecular structures and dosage timeline.

### Visual Elements
```
┌─────────────────────────┐
│   💊     🔬             │  Pills + molecules
│        H-O-H            │
│           │             │
│   💊    H-C-H           │  Molecular structure
│           │             │
│  ━━●━━●━━━━━━━━━      │  Timeline (●=doses)
│  8AM  12PM  6PM        │
└─────────────────────────┘
```

### Elements
1. **Floating pills**: 2-3 pill shapes with subtle bounce
2. **Molecular structure**: Simple atom/bond visualization
3. **Dosage timeline**: Horizontal line with dots for scheduled doses
4. **Adherence ring**: Circular progress showing adherence %

### Animation States
1. **Pills**: Float up/down with sine wave motion
2. **Molecules**: Rotate slowly
3. **Timeline**: Highlight next dose
4. **Adherence ring**: Fills as doses are taken

### Skia Implementation
```typescript
<Canvas>
  {/* Background gradient */}
  <Rect x={0} y={0} width={width} height={height}>
    <LinearGradient
      colors={['#2c3e50', '#34495e']}
    />
  </Rect>

  {/* Floating pills */}
  {pills.map((pill, i) => (
    <Group
      key={i}
      transform={[
        { translateY: floatAnimation[i] },
        { rotate: pill.rotation }
      ]}
    >
      <RoundedRect
        x={pill.x}
        y={pill.y}
        width={40}
        height={60}
        r={20}
        color="#ff6b6b"
      />
      {/* Pill line */}
      <Line
        p1={vec(pill.x, pill.y + 30)}
        p2={vec(pill.x + 40, pill.y + 30)}
        color="#fff"
        strokeWidth={2}
      />
    </Group>
  ))}

  {/* Molecular structure */}
  <Group opacity={0.6}>
    {atoms.map((atom, i) => (
      <Circle key={i} cx={atom.x} cy={atom.y} r={8} color={atom.color} />
    ))}
    {bonds.map((bond, i) => (
      <Line
        key={i}
        p1={vec(bond.x1, bond.y1)}
        p2={vec(bond.x2, bond.y2)}
        color="#fff"
        strokeWidth={2}
      />
    ))}
  </Group>

  {/* Dosage timeline */}
  <Line
    p1={vec(20, height - 60)}
    p2={vec(width - 20, height - 60)}
    color="#fff"
    strokeWidth={2}
  />
  {doses.map((dose, i) => (
    <Circle
      key={i}
      cx={dose.x}
      cy={height - 60}
      r={6}
      color={dose.taken ? '#4caf50' : '#fff'}
    />
  ))}
</Canvas>
```

---

## 5. Training Hero: Muscle Visualization

### Concept
Stylized muscle groups that highlight based on workout focus.

### Visual Elements
```
┌─────────────────────────┐
│      💪                 │  Muscle group outline
│     ╱│╲                │
│    ╱ │ ╲               │  Highlighted = today's focus
│   ●──●──●              │
│   │  │  │              │
│   ●  ●  ●              │  ● = muscle group
└─────────────────────────┘
```

### Muscle Groups
- Chest
- Back
- Shoulders
- Arms
- Legs
- Core

### Animation States
1. **Rest day**: All muscles low opacity, gentle pulse
2. **Active workout**: Target muscles glow, pulse faster
3. **Post-workout**: Target muscles fade from bright to normal
4. **Progress**: Muscle size scales based on volume progression

---

## Performance Considerations

### Target: 60fps on Samsung Galaxy Watch

**Optimization Strategies**:
1. **Use `useDerivedValue`** for computed animations (runs on UI thread)
2. **Limit particle count**: Max 50-100 rain drops
3. **Batch drawing**: Group similar shapes
4. **Skip frames on low-end devices**: `if (frameTime > 16ms) skip animation tick`
5. **Lazy render**: Only animate visible heroes
6. **Reduce blur effects**: Expensive on GPU

### Accessibility
```typescript
// Respect reduce motion preference
const prefersReducedMotion = useReducedMotion();

const animationDuration = prefersReducedMotion ? 0 : 2000;
```

---

## Implementation Priority

1. **Week 1**: Dashboard Brain (most complex, validate approach)
2. **Week 2**: Mood Weather (most dynamic)
3. **Week 3**: Sleep Circadian (medium complexity)
4. **Week 4**: Medication Pharmaceutical (simpler)
5. **Future**: Training Muscle (lowest priority per user)

---

## Bundle Size Impact

Adding `@shopify/react-native-skia`:
- **Android**: +3.2MB
- **iOS**: +3.8MB
- **Total app size**: Currently ~50MB → ~54MB (+8% increase)

**Acceptable?** Yes, for the visual impact and flexibility gained.

---

## Fallback Strategy

If performance issues on Samsung Watch:
1. **Reduce animation complexity**: Fewer particles, simpler paths
2. **Lower frame rate**: 30fps instead of 60fps
3. **Static versions**: Disable animations on watch, keep on phone
4. **Progressive enhancement**: Full animations on high-end devices only

---

Ready to start with the Dashboard Brain visualization? 🧠
