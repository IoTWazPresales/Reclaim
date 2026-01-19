# Beta Tester Guide - Reclaim App

Welcome to the Reclaim beta test! Thank you for helping us improve the app.

## 📱 Installation

### Android
1. Download the `.apk` file from the beta distribution link
2. On your Android device, go to **Settings → Security → Unknown Sources** (or **Install Unknown Apps**)
3. Enable installation from your file manager/browser
4. Open the downloaded `.apk` file
5. Tap **Install**
6. Once installed, open the Reclaim app

### iOS
1. Install via TestFlight (if available) or through the provided distribution method
2. Open the Reclaim app

## 🚀 Getting Started

### First Launch
1. **Sign Up/Login**: 
   - Use your email to create an account
   - Check your email for a magic link
   - Tap the link to sign in

2. **Onboarding**:
   - Complete the onboarding flow
   - Grant necessary permissions (notifications, health data)
   - Set your initial preferences

### Key Features to Test

#### 1. **Mood Tracking**
- Log your mood multiple times per day
- Use the energy and tags features
- View mood history and trends

#### 2. **Medication Management**
- Add medications with schedules
- Log doses as taken/skipped/missed
- Check medication adherence

#### 3. **Sleep Tracking**
- Connect health integrations (Apple HealthKit, Google Fit)
- View sleep sessions
- Review sleep insights

#### 4. **Scientific Insights**
- Enable/disable insights in Settings
- Review personalized suggestions
- Check the "Why?" explanations

#### 5. **Recovery Progress**
- Track your recovery stages
- View completed stages
- Reset progress if needed

## 🔍 What to Test

### Core Functionality
- [ ] Sign up and login works
- [ ] Mood logging saves correctly
- [ ] Medication schedules work
- [ ] Notifications arrive on time
- [ ] Health data syncs correctly
- [ ] Data export works (JSON/CSV)
- [ ] Settings save properly

### Edge Cases
- [ ] App works offline (shows network indicator)
- [ ] Works with poor connectivity
- [ ] Handles timezone changes
- [ ] Works after app restart
- [ ] Handles notifications when app is closed

### User Experience
- [ ] Onboarding is clear
- [ ] Navigation is intuitive
- [ ] Error messages are helpful
- [ ] Loading states are clear
- [ ] App feels responsive

## 🐛 Known Issues

### Current Limitations
1. **Offline Mode**: Some features require internet connection
2. **Data Sync**: Health data sync may take a few minutes
3. **Notifications**: May not work if device is in extreme battery saver mode

### Workarounds
- If mood logging fails, try again after checking network connection
- If health data doesn't sync, try disconnecting and reconnecting the integration
- If notifications don't arrive, check device notification settings

## 📝 Reporting Issues

### How to Report
1. **In-App Feedback** (Preferred):
   - Go to **Settings → About**
   - Tap **Send Feedback**
   - Fill out the form with:
     - What you were doing
     - What went wrong
     - Screenshots (if possible)
     - Device info

2. **Email**:
   - Send to: [your-feedback-email]
   - Subject: "Beta Feedback - [Brief Description]"
   - Include:
     - Device model and OS version
     - App version (shown in Settings → About)
     - Steps to reproduce
     - Screenshots or screen recordings

### What Information Helps
- **Device**: Model, OS version
- **App Version**: Found in Settings → About
- **Steps**: What you did before the issue
- **Expected**: What should have happened
- **Actual**: What actually happened
- **Screenshots**: Especially helpful for UI issues

## 💡 Feature Requests

Have an idea? We'd love to hear it!
- Use the in-app feedback form
- Include "Feature Request" in the subject
- Describe the use case and why it would help

## 🔒 Privacy & Data

### Your Data
- All data is stored securely
- You can export your data anytime (Settings → Data & Privacy)
- You can delete all data (Settings → Data & Privacy → Delete all personal data)

### Beta Disclaimer
- This is beta software - data may be reset between versions
- Some features may change or be removed
- We appreciate your patience as we improve the app

## 📊 Feedback Priorities

### High Priority
- App crashes or freezes
- Data loss or corruption
- Login/signup issues
- Critical features not working

### Medium Priority
- UI/UX issues
- Performance problems
- Feature suggestions
- Confusing workflows

### Low Priority
- Minor UI tweaks
- Cosmetic issues
- Nice-to-have features

## 🎯 Testing Checklist

Use this checklist during your testing:

### Week 1: Core Features
- [ ] Complete onboarding
- [ ] Log mood for 3+ days
- [ ] Add and track medications
- [ ] Connect health integration
- [ ] Test notifications

### Week 2: Advanced Features
- [ ] Explore insights
- [ ] Export data
- [ ] Adjust settings
- [ ] Test offline mode
- [ ] Try different scenarios

### Week 3: Edge Cases
- [ ] Test with poor connectivity
- [ ] Try unusual schedules
- [ ] Test data export/import
- [ ] Check all settings
- [ ] Report any issues found

## 🙏 Thank You!

Your feedback helps make Reclaim better for everyone. We appreciate your time and input!

## 📞 Support

- **In-App**: Settings → About → Send Feedback
- **Email**: [your-support-email]
- **Response Time**: We aim to respond within 24-48 hours

---

**Version**: 1.0.0-beta  
**Last Updated**: [Current Date]

