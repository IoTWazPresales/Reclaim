# Testing Instructions - New Authentication System

## Pre-Build Checklist

### 1. Verify Supabase Configuration
- [ ] Email provider enabled in Supabase Dashboard
- [ ] Google OAuth provider enabled in Supabase Dashboard
- [ ] Redirect URIs configured:
  - `reclaim://auth`
  - `https://bgtosdgrvjwlpqxqjvdf.supabase.co/auth/v1/callback`

### 2. Verify Environment Variables
Your `eas.json` should NOT have hardcoded keys (we removed them).
Make sure you have:
- [ ] Environment variables set via EAS secrets OR
- [ ] `.env` file with:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://bgtosdgrvjwlpqxqjvdf.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

## Building the App

### Option 1: Development Build (Recommended for Testing)

```bash
cd app
npx expo start
```

Then:
- Press `a` for Android
- Press `i` for iOS (requires Mac)

### Option 2: EAS Build (Production-like)

```bash
cd app
eas build --profile preview --platform android
# or
eas build --profile preview --platform ios
```

### Option 3: Local Build

```bash
cd app
npm run android
# or
npm run ios
```

## Testing Checklist

### 1. Email/Password Authentication

#### Sign Up
- [ ] Open app
- [ ] Tap "Sign Up" tab
- [ ] Enter email address
- [ ] Enter password (min 6 characters)
- [ ] Confirm password
- [ ] Tap "Sign Up" button
- [ ] **Expected**: Alert says "Account created" and you're logged in
- [ ] **Verify**: Can access app features (Dashboard, etc.)

#### Login
- [ ] Logout (if signed in)
- [ ] Tap "Login" tab
- [ ] Enter email from signup
- [ ] Enter password
- [ ] Tap "Login" button
- [ ] **Expected**: Successfully logged in
- [ ] **Verify**: Session persists

#### Password Validation
- [ ] Try password less than 6 characters → Should show error
- [ ] Try mismatched passwords (signup) → Should show error
- [ ] Try invalid email → Should show error

### 2. Google OAuth

#### Google Sign In
- [ ] Logout (if signed in)
- [ ] Tap "Continue with Google" button
- [ ] **Expected**: Browser opens with Google sign in
- [ ] Select Google account
- [ ] Grant permissions
- [ ] **Expected**: Redirects back to app
- [ ] **Verify**: You're logged in
- [ ] **Verify**: Can access app features

### 3. Session Persistence

#### App Restart
- [ ] Sign in (email/password or Google)
- [ ] Force close app completely
- [ ] Reopen app
- [ ] **Expected**: Still logged in (no login screen)
- [ ] **Verify**: Session data intact

#### Background/Foreground
- [ ] Sign in
- [ ] Put app in background
- [ ] Wait 1-2 minutes
- [ ] Bring app to foreground
- [ ] **Expected**: Still logged in
- [ ] **Verify**: No login prompt

#### Extended Session
- [ ] Sign in
- [ ] Close app
- [ ] Wait 30+ minutes
- [ ] Reopen app
- [ ] **Expected**: Session refreshed automatically
- [ ] **Verify**: Still logged in

### 4. Password Reset

#### Forgot Password Flow
- [ ] On login screen, tap "Forgot password?"
- [ ] Enter email address
- [ ] Tap "Send reset link"
- [ ] **Expected**: Alert says "Reset email sent"
- [ ] **Verify**: Check email for reset link
- [ ] Click reset link in email
- [ ] **Expected**: Can set new password

### 5. Magic Link (Backward Compatibility)

#### Magic Link Sign In
- [ ] Logout
- [ ] Tap "Sign in with magic link"
- [ ] Enter email
- [ ] **Expected**: Alert says "Magic link sent"
- [ ] **Verify**: Check email for magic link
- [ ] Click magic link in email
- [ ] **Expected**: Redirected to app and logged in

### 6. Notifications with Persistent Session

#### Test Notifications
- [ ] Sign in
- [ ] Set up medication reminders (or mood reminders)
- [ ] Force close app
- [ ] Wait for notification time
- [ ] **Expected**: Notification arrives
- [ ] **Verify**: Can interact with notification
- [ ] **Verify**: App opens correctly from notification

### 7. Error Handling

#### Invalid Credentials
- [ ] Try login with wrong password → Should show error
- [ ] Try login with non-existent email → Should show error
- [ ] Try signup with existing email → Should show error

#### Network Issues
- [ ] Turn off WiFi/data
- [ ] Try login → Should show network error
- [ ] Turn on WiFi/data
- [ ] Try login again → Should work

## Common Issues & Solutions

### Issue: "Cannot open authentication page"
**Solution**: Check redirect URI configuration in Supabase

### Issue: "Session not persisting"
**Solution**: 
- Verify SecureStore permissions
- Check Supabase session refresh settings
- Review logs for refresh errors

### Issue: "Google OAuth not working"
**Solution**:
- Verify Google OAuth is enabled in Supabase
- Check Client ID and Secret are correct
- Verify redirect URIs match exactly

### Issue: "App crashes on startup"
**Solution**:
- Check environment variables are set
- Verify Supabase URL and key are correct
- Review error logs

## Debug Commands

### Check Session Status
In Dashboard screen, tap "Check session" button to see current session state

### View Logs
All logs use the `[Reclaim]` prefix. In development, check:
- Expo Go logs
- Metro bundler console
- Device logs (Android Studio / Xcode)

## Next Steps After Testing

1. **If everything works**: Merge to main branch and deploy
2. **If issues found**: 
   - Document the issue
   - Check logs
   - We can debug together

## Success Criteria

✅ All authentication methods work
✅ Sessions persist indefinitely
✅ Notifications work with persistent sessions
✅ No crashes or errors
✅ User experience is smooth

Good luck testing! Let me know if you encounter any issues.


