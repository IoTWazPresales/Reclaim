# Guided Meditation Integration Options

## Version 0.2.0 - Research Summary

This document outlines various approaches to implement guided meditation features with vocal/audio content that users can schedule (e.g., on wake or before bedtime).

---

## 1. Audio/Video API Integration Options

### A. Spotify Podcasts API
**Pros:**
- Large library of meditation podcasts
- High-quality audio content
- Reliable streaming infrastructure
- Popular meditation podcasts: "Meditation Minis", "Sleep Cove", "Headspace Guide to Meditation"

**Cons:**
- Requires Spotify Premium subscription for users
- API access requires Spotify Developer account and app approval
- Limited control over content curation
- Requires Spotify app to be installed or SDK integration

**Implementation:**
- Use Spotify Web API or Spotify iOS/Android SDK
- Link to Spotify playlists/albums/episodes
- Or use Spotify Embed SDK for in-app playback
- Deep link to `spotify://` or `spotify:album:`

**Best for:** Users who already have Spotify Premium

---

### B. YouTube API
**Pros:**
- Massive library of free guided meditation videos
- No subscription required
- Good search/discovery capabilities
- YouTube Premium removes ads (optional)

**Cons:**
- Video-focused (audio can be extracted but not ideal)
- Ads in free tier (unless Premium)
- Requires YouTube app or browser integration
- API quota limits

**Implementation:**
- Use YouTube Data API v3 to search/retrieve meditation videos
- Play via YouTube Player SDK or WebView
- Or use YouTube IFrame Player API
- Deep link to `youtube://` or `https://youtube.com/watch?v=`

**Best for:** Free tier with video support

---

### C. Meditation-Specific APIs

#### Calm API / Headspace API
**Pros:**
- Curated, professional meditation content
- Designed specifically for meditation apps
- High-quality audio

**Cons:**
- May require partnership/licensing agreements
- Potentially expensive
- Limited availability (may not have public APIs)

#### Insight Timer API
**Pros:**
- Large free library
- Community-focused
- Good variety of guided meditations

**Cons:**
- May not have public API
- Would need to check availability

---

### D. Audio Streaming Services

#### SoundCloud API
**Pros:**
- Many meditation creators upload to SoundCloud
- Free content available
- Audio-focused

**Cons:**
- Less curated than Spotify
- Variable quality
- Requires SoundCloud account

#### Apple Podcasts API
**Pros:**
- Native iOS integration
- Large podcast library
- Good discovery

**Cons:**
- iOS-focused
- Limited API access
- Requires Apple Developer account

---

## 2. Self-Hosted Audio Content

### A. Store Audio Files Locally/Remotely
**Pros:**
- Full control over content
- No external dependencies
- Works offline (if downloaded)
- Customizable experience

**Cons:**
- Requires content creation or licensing
- Storage costs
- Content updates require app updates or sync

**Implementation:**
- Host audio files on CDN (AWS S3, Cloudflare, etc.)
- Use Expo AV for audio playback
- Implement download/caching for offline use
- Schedule via local notifications

**Best for:** Curated, controlled experience

---

### B. Text-to-Speech (TTS) Guided Meditations
**Pros:**
- Fully customizable scripts
- Can generate meditations dynamically
- No licensing issues

**Cons:**
- Less natural than human voice
- Requires script generation logic
- May feel robotic

**Implementation:**
- Use device TTS (React Native TTS)
- Generate meditation scripts programmatically
- Or use cloud TTS (Google Cloud TTS, AWS Polly, Azure TTS)
- More natural voices available

---

## 3. Hybrid Approach (Recommended)

### Recommended Implementation Strategy:

1. **Primary: Self-Hosted Curated Content**
   - Store high-quality guided meditation audio files
   - Host on CDN for streaming
   - Implement offline download capability
   - Curation ensures quality and relevance

2. **Secondary: Spotify Integration (Optional)**
   - Allow users to link their Spotify account
   - Access meditation playlists/episodes
   - Use Spotify SDK for in-app playback
   - Fallback for users with Spotify Premium

3. **Tertiary: YouTube Integration (Free Tier)**
   - Link to popular meditation YouTube channels
   - Use for discovery and free content
   - Play via YouTube Player or WebView
   - Good for users without premium subscriptions

---

## 4. Scheduling Implementation

### Current Capabilities:
- Fixed time scheduling (e.g., 7 AM daily)
- After-wake scheduling (offset from sleep end time)
- Before-bedtime scheduling (offset from bedtime)

### Enhancement Suggestions:

1. **Smart Scheduling Based on User Behavior**
   - Learn optimal meditation times
   - Adjust based on sleep patterns
   - Consider user preferences

2. **Multiple Daily Sessions**
   - Morning meditation
   - Afternoon break
   - Evening wind-down
   - Bedtime meditation

3. **Content Type Selection**
   - Energy-focused for mornings
   - Focus/concentration for work hours
   - Relaxation for evenings
   - Sleep-focused for bedtime

---

## 5. Technical Implementation Details

### Audio Playback:
- **Expo AV** (`expo-av`) - Cross-platform audio/video player
- Supports streaming and local files
- Background audio playback
- Media controls integration

### Storage:
- **AWS S3** or **Cloudflare R2** for audio files
- Implement CDN caching
- Download and cache for offline use
- Progressive download for streaming

### Scheduling:
- Use existing notification system
- Deep link to meditation player
- Track playback progress
- Log completion for streaks

### UI Components:
- Audio player with play/pause/seek
- Meditation catalog with categories
- Duration indicators
- Progress tracking
- Favorite/bookmark system

---

## 6. Content Sources & Licensing

### Free/CC-Licensed Content:
- **FreeSound.org** - CC-licensed meditation tracks
- **Internet Archive** - Public domain meditation content
- **YouTube Creative Commons** - Free meditation videos

### Paid/Licensed Content:
- Partner with meditation creators
- License content from meditation platforms
- Commission custom meditations
- Subscription model for premium content

---

## 7. Recommended Next Steps

1. **Phase 1: Basic Audio Playback**
   - Integrate Expo AV
   - Host a few sample meditation audio files
   - Implement basic player UI
   - Add scheduling integration

2. **Phase 2: Content Library**
   - Build meditation catalog
   - Categorize by type (sleep, focus, anxiety, etc.)
   - Add search/filter
   - Implement favorites

3. **Phase 3: Enhanced Features**
   - Offline downloads
   - Progress tracking
   - Recommendations
   - Social features (optional)

4. **Phase 4: External Integrations** (Optional)
   - Spotify integration
   - YouTube integration
   - Podcast subscriptions

---

## 8. Example Integration Code Structure

```typescript
// app/src/lib/meditationPlayer.ts
import { Audio } from 'expo-av';

export type MeditationAudio = {
  id: string;
  title: string;
  duration: number;
  url: string; // CDN URL or local path
  category: 'sleep' | 'focus' | 'anxiety' | 'energy';
  source: 'self-hosted' | 'spotify' | 'youtube';
};

export async function playMeditation(meditation: MeditationAudio) {
  const { sound } = await Audio.Sound.createAsync(
    { uri: meditation.url },
    { shouldPlay: true }
  );
  return sound;
}

// app/src/screens/MeditationPlayerScreen.tsx
// Full-screen meditation player with controls
// Progress tracking, completion logging
// Integration with streaks system
```

---

## Summary

**Best Approach:** Start with self-hosted curated content using Expo AV for playback, then optionally add Spotify/YouTube integrations for users who want additional options. This provides:
- ✅ Full control over user experience
- ✅ Works offline
- ✅ No external dependencies
- ✅ Customizable and brandable
- ✅ Scalable content library

**Priority Features:**
1. Audio player with Expo AV
2. Meditation catalog with categories
3. Scheduling integration (already implemented)
4. Progress tracking and completion logging
5. Offline download capability

