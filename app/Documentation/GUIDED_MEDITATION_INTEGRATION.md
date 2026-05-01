# Guided Meditation Integration Options

## Overview
Currently, the app has text-based guided meditations with step-by-step instructions stored in `MEDITATION_CATALOG` (`app/src/lib/meditations.ts`). To add audio-guided meditations where someone talks you through exercises (like body scan), consider the following options:

## Option 1: Text-to-Speech (TTS) - Recommended for MVP
**Pros:**
- No external API dependencies
- Works offline with device TTS engines
- Easy to implement with existing meditation scripts
- Supports all meditation types in catalog
- Multilingual support possible

**Implementation:**
- Use React Native TTS libraries like `react-native-tts` or `expo-speech`
- Convert existing `MeditationScriptStep` instructions to spoken audio
- Sync TTS with timer displays and step transitions
- Allow pause/resume and skip forward/backward

**Code Example:**
```typescript
import * as Speech from 'expo-speech';

// In GuidedExercise or new GuidedMeditationAudio component
const speakInstruction = (text: string) => {
  Speech.speak(text, {
    language: 'en',
    pitch: 1.0,
    rate: 0.9, // Slightly slower for meditation
  });
};
```

**Limitations:**
- Robotic voice quality (acceptable for guided instructions)
- No background music/ambiance
- Less immersive than professional audio

## Option 2: Pre-recorded Audio Files
**Pros:**
- Professional, human voice narration
- Can include background music/ambiance
- Better user experience
- Full control over pacing and tone

**Cons:**
- Requires audio recording/editing
- Larger app bundle size
- Need to host or bundle audio files
- Less flexible (can't easily modify scripts)

**Implementation:**
- Record audio for each meditation script step
- Use `expo-av` or `react-native-track-player` for playback
- Store audio files in `app/assets/audio/meditations/`
- Sync audio playback with UI step indicators

**Storage:**
- Bundle audio files in app (larger app size)
- Host on CDN and stream (requires network, adds latency)
- Hybrid: bundle common meditations, stream others

## Option 3: Third-Party Meditation API
**Pros:**
- Professional content library
- Regularly updated meditations
- Background music/ambiance included
- Less maintenance burden

**Cons:**
- Requires API subscription/licensing
- External dependency
- Possible costs
- May not match your meditation scripts exactly

**Providers:**
- **Insight Timer API** (if available)
- **Calm API** (enterprise/licensing required)
- **Headspace API** (B2B partnerships)
- **Meditation music libraries** (AudioJungle, etc.)

## Option 4: Hybrid Approach (Recommended for Future)
Combine TTS for instructions with background meditation music:

1. Use TTS for guided instructions (step-by-step)
2. Play ambient meditation music/white noise in background
3. Allow users to adjust music volume independently
4. Use audio from meditation music libraries or generate with AI tools

## Implementation Recommendations

### Phase 1: TTS Integration (Immediate)
1. Install `expo-speech` or `react-native-tts`
2. Create `GuidedMeditationAudio` component
3. Integrate with existing `MeditationScreen` and meditation catalog
4. Add voice controls (pause/resume, skip step, adjust speed)
5. Respect user preferences (haptics, reduced motion)

### Phase 2: Audio Recording (Future)
1. Record professional audio for popular meditations
2. Bundle high-quality audio files
3. Add background music layer
4. Implement audio streaming for larger files

### Phase 3: API Integration (If Needed)
1. Evaluate third-party meditation APIs
2. Integrate API content alongside existing meditations
3. Allow users to choose between app meditations and API content

## Current Meditation Catalog
The app already has meditation scripts in `MEDITATION_CATALOG`:
- Progressive Muscle Relaxation (10 min)
- Body Scan (8 min)
- Safe Ring Visualization (7 min)
- Box Breathing (4 min)
- 4-7-8 Breathing (3 min)
- Mindful Breathing (5 min)
- Loving-Kindness (6 min)
- Grounding 5-4-3-2-1 (4 min)

Each meditation has structured steps with titles, instructions, and durations (`seconds` field), making them perfect for TTS or audio synchronization.

## Next Steps
1. **Research**: Evaluate TTS libraries and choose best option for React Native
2. **Prototype**: Add TTS to one meditation (e.g., Body Scan) as proof of concept
3. **Test**: Gather user feedback on TTS quality vs. need for recorded audio
4. **Decide**: Based on feedback, proceed with TTS or invest in audio recording/API

## Code Structure
- Current guided exercises: `app/src/screens/MindfulnessScreen.tsx` → `GuidedExercise`
- Meditation scripts: `app/src/lib/meditations.ts` → `MEDITATION_CATALOG`
- Meditation screen: `app/src/screens/MeditationScreen.tsx` (has guided step UI)

Consider creating:
- `app/src/components/GuidedMeditationAudio.tsx` - TTS-powered audio guide
- `app/src/hooks/useMeditationAudio.ts` - Audio playback controls
- `app/src/lib/audioMeditations.ts` - Audio file mappings (if using pre-recorded)

