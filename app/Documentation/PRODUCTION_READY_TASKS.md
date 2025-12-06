# Production Ready Tasks - Implementation Plan

## Version: 0.2.0 (Next Version)

### Completed ✅
1. **Background Health Sync Task Fix** - Fixed TaskManager.defineTask error with proper error handling

### In Progress 🔄
1. **Breathing Exercises Timer Fix**
   - Create BoxBreathingCard component for 4-4-4-4 pattern (similar to 4-7-8)
   - Ensure all breathing exercises have start/pause functionality
   - Fix timer synchronization with animation

2. **Non-Breathing Exercises Fix**
   - Remove automatic timers from GuidedExercise
   - Add "Next when ready" button instead
   - Keep step navigation but remove countdown

3. **Card Styling Audit & Standardization**
   - Audit all Card components across screens
   - Standardize elevation, borderRadius, backgroundColor
   - Apply consistent styling based on Material Design 3 best practices

4. **Navigation Links Check**
   - Verify all deep links work
   - Test navigation from notifications
   - Ensure all routes are accessible

5. **Notification Actions Audit**
   - Ensure all notification actions can be performed via notification
   - Fix notification timing issues
   - Implement backlog handling (missed notifications or suggestions)

6. **Production Code Review**
   - Error handling review
   - Cleanup unused code
   - Performance optimizations
   - Type safety improvements

### Research 📚
1. **Guided Meditation Integration**
   - Research APIs (Spotify, YouTube, meditation apps)
   - Video/podcast integration options
   - Scheduling implementation (on wake, before bedtime)

