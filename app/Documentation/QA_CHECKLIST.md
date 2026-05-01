# Manual QA Checklist - Reclaim App

This checklist covers critical user paths and should be tested before each release.

## 🔐 Authentication & Onboarding

### Sign Up
- [ ] Email sign up works
- [ ] Magic link email is received
- [ ] Clicking magic link opens app and signs in
- [ ] Error handling for invalid emails
- [ ] Error handling for network failures

### Login
- [ ] Existing users can log in
- [ ] Session persists after app restart
- [ ] Session refreshes automatically
- [ ] Error messages are clear

### Onboarding
- [ ] Onboarding flow is clear
- [ ] All screens display correctly
- [ ] Permissions can be granted
- [ ] Skipping permissions works
- [ ] Can complete onboarding successfully

## 😊 Mood Tracking

### Logging Mood
- [ ] Can log mood (1-5 scale)
- [ ] Can add energy level
- [ ] Can add tags
- [ ] Can add notes
- [ ] Mood saves correctly
- [ ] Mood displays in history
- [ ] Can delete mood entries

### Mood History
- [ ] History shows correct dates
- [ ] History is sorted correctly
- [ ] Can view past mood entries
- [ ] Charts/graphs display correctly
- [ ] Trends calculate correctly

## 💊 Medication Management

### Adding Medications
- [ ] Can add medication name
- [ ] Can set dose
- [ ] Can set schedule (times, days)
- [ ] Medication saves correctly
- [ ] Can edit medication
- [ ] Can delete medication

### Medication Logging
- [ ] Can log dose as taken
- [ ] Can mark dose as skipped
- [ ] Can mark dose as missed
- [ ] Log entries save correctly
- [ ] Adherence calculates correctly

### Medication Reminders
- [ ] Reminders schedule correctly
- [ ] Reminders fire on time
- [ ] Reminders respect quiet hours
- [ ] Can dismiss reminders
- [ ] Can snooze reminders
- [ ] Can disable reminders

### Refill Reminders
- [ ] Refill reminders work
- [ ] Can enable/disable refills
- [ ] Refill timing is correct

## 😴 Sleep Tracking

### Sleep Sessions
- [ ] Can add manual sleep session
- [ ] Sleep sessions save correctly
- [ ] Can view sleep history
- [ ] Sleep duration calculates correctly
- [ ] Sleep quality can be set

### Health Integrations
- [ ] Apple HealthKit syncs (iOS)
- [ ] Google Fit syncs (Android)
- [ ] Health Connect syncs (Android)
- [ ] Samsung Health syncs (Android)
- [ ] Sleep data imports correctly
- [ ] Activity data imports correctly
- [ ] Can disconnect integration

### Sleep Preferences
- [ ] Can set target sleep hours
- [ ] Can set typical wake time
- [ ] Preferences save correctly
- [ ] Bedtime suggestions work
- [ ] Morning confirmations work

## 🧘 Mindfulness & Recovery

### Mindfulness Events
- [ ] Can log mindfulness event
- [ ] Events save correctly
- [ ] Can view event history
- [ ] Interventions display correctly

### Recovery Progress
- [ ] Recovery stages display correctly
- [ ] Can complete stages
- [ ] Progress saves correctly
- [ ] Can reset progress
- [ ] Stage descriptions are clear

## 📊 Insights & Analytics

### Scientific Insights
- [ ] Insights appear when enabled
- [ ] Insights are contextually relevant
- [ ] "Why?" explanations are clear
- [ ] Action chips work
- [ ] Can disable insights
- [ ] Insights refresh correctly

### Analytics Screen
- [ ] Charts display correctly
- [ ] Data is accurate
- [ ] Date ranges work
- [ ] Can filter by type
- [ ] Performance is acceptable

## 🔔 Notifications

### Notification Types
- [ ] Mood check-in reminders work
- [ ] Medication reminders work
- [ ] Sleep reminders work
- [ ] Bedtime suggestions work
- [ ] Morning confirmations work

### Notification Settings
- [ ] Quiet hours work
- [ ] Snooze duration works
- [ ] Can enable/disable types
- [ ] Notification permission request works
- [ ] Can cancel all notifications

## ⚙️ Settings

### General Settings
- [ ] All settings save correctly
- [ ] Toggles work correctly
- [ ] Changes persist after restart
- [ ] Settings sync across devices (if applicable)

### Data & Privacy
- [ ] Can export data (JSON)
- [ ] Can export data (CSV)
- [ ] Export files are valid
- [ ] Can delete all data
- [ ] Data deletion works correctly
- [ ] Privacy policy link works
- [ ] Terms of service link works

### About Screen
- [ ] App version displays correctly
- [ ] Platform info is correct
- [ ] Send feedback works
- [ ] Links open correctly

## 🌐 Network & Offline

### Network Status
- [ ] Network indicator shows when offline
- [ ] App handles offline gracefully
- [ ] Data queues when offline
- [ ] Data syncs when back online

### Error Handling
- [ ] Network errors show clear messages
- [ ] Can retry failed operations
- [ ] App doesn't crash on errors
- [ ] Error boundaries catch crashes

## 🔄 Data Sync

### Health Data Sync
- [ ] Background sync works (if enabled)
- [ ] Manual sync works
- [ ] Sync doesn't duplicate data
- [ ] Sync handles errors gracefully

### Cross-Device Sync
- [ ] Data syncs across devices
- [ ] Conflicts resolve correctly
- [ ] Last write wins (or appropriate strategy)

## 📱 Platform Specific

### iOS
- [ ] Apple HealthKit permissions work
- [ ] App works on different iOS versions
- [ ] UI is correct on different screen sizes
- [ ] Works on iPhone and iPad (if supported)

### Android
- [ ] Google Fit permissions work
- [ ] Health Connect permissions work
- [ ] App works on different Android versions
- [ ] UI is correct on different screen sizes
- [ ] Notifications work correctly

## 🎨 UI/UX

### Navigation
- [ ] Navigation is intuitive
- [ ] Back button works correctly
- [ ] Deep links work
- [ ] Navigation state persists

### Responsiveness
- [ ] App responds quickly
- [ ] Loading states are clear
- [ ] Animations are smooth
- [ ] No lag or stuttering

### Accessibility
- [ ] Text is readable
- [ ] Touch targets are adequate
- [ ] Works with screen readers (basic)
- [ ] Respects reduced motion

### Dark Mode
- [ ] Dark mode works (if implemented)
- [ ] Colors are readable
- [ ] Icons are visible
- [ ] Theme switching works

## 🐛 Edge Cases

### Timezone Changes
- [ ] Handles timezone changes
- [ ] Dates/times display correctly
- [ ] Schedules adjust correctly

### Date Boundaries
- [ ] Works at midnight
- [ ] Handles day transitions
- [ ] Week boundaries work
- [ ] Month boundaries work

### Data Limits
- [ ] Handles large amounts of data
- [ ] Lists paginate correctly
- [ ] Charts handle many data points
- [ ] App doesn't slow down

### Concurrent Operations
- [ ] Multiple rapid taps handled
- [ ] Can cancel in-progress operations
- [ ] Race conditions handled

## 🔒 Security

### Authentication
- [ ] Session tokens are secure
- [ ] Tokens refresh correctly
- [ ] Logout clears data
- [ ] No data leakage

### Data Privacy
- [ ] RLS policies work
- [ ] Users can only see their data
- [ ] Export includes all data
- [ ] Deletion removes all data

## 📊 Performance

### Startup
- [ ] App launches quickly
- [ ] Initial load is reasonable
- [ ] No blocking operations

### Memory
- [ ] No memory leaks
- [ ] App handles low memory
- [ ] Background state managed

### Battery
- [ ] Background operations efficient
- [ ] Location services (if used) efficient
- [ ] Notifications don't drain battery

## ✅ Pre-Release Checklist

Before releasing, ensure:
- [ ] All critical paths tested
- [ ] No blocking bugs
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Privacy policy and terms linked
- [ ] App version updated
- [ ] Build numbers incremented
- [ ] Release notes prepared
- [ ] Known issues documented

## 📝 Testing Notes

### Test Devices
- List devices used for testing
- Note any device-specific issues

### Test Accounts
- List test accounts used
- Note any account-specific issues

### Known Issues
- List any known issues found
- Note severity and workarounds

---

**Last Updated**: [Current Date]  
**Tested By**: [Tester Name]  
**Version**: [App Version]

