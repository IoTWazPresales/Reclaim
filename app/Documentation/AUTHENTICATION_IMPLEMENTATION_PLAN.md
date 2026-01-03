# Authentication Implementation Plan

## Current Situation Analysis

### Current Authentication
- **Method**: Magic link only (`signInWithOtp`)
- **Session Management**: Supabase with `persistSession: true` and `autoRefreshToken: true`
- **Problem**: Users lose login after a while, preventing notifications from working

### Root Cause Analysis
1. **Token Refresh Issues**: 
   - Supabase tokens expire (access token: 1 hour, refresh token: variable)
   - If app is backgrounded for extended period, refresh might fail
   - Network issues can prevent token refresh

2. **Session Persistence**:
   - Supabase stores sessions in AsyncStorage by default
   - If storage is cleared or corrupted, session is lost
   - No fallback mechanism for expired sessions

3. **Deep Link Dependency**:
   - Magic link requires email click → deep link → app
   - If user doesn't check email, can't log in
   - No offline login capability

## Proposed Solution

### Multi-Provider Authentication
Implement comprehensive authentication with:
1. **Email/Password** (traditional login)
2. **Google OAuth** (one-tap login)
3. **Apple Sign In** (iOS native, secure)
4. **Magic Link** (keep as fallback option)

### Enhanced Session Management
1. **Persistent Refresh Token Storage**:
   - Use SecureStore for refresh tokens
   - Implement background token refresh
   - Add token refresh retry logic

2. **Session Recovery**:
   - Check session on app start
   - Auto-refresh expired sessions
   - Graceful fallback to login screen

3. **Offline Support**:
   - Cache user session data locally
   - Sync when connection restored

## Implementation Details

### Phase 1: Update Supabase Client Configuration

**File**: `app/src/lib/supabase.ts`

**Changes**:
```typescript
export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    // NEW: Enhanced storage
    storage: {
      getItem: async (key: string) => {
        // Use SecureStore for sensitive tokens
        const value = await SecureStore.getItemAsync(key);
        return value;
      },
      setItem: async (key: string, value: string) => {
        await SecureStore.setItemAsync(key, value);
      },
      removeItem: async (key: string) => {
        await SecureStore.deleteItemAsync(key);
      },
    },
    // NEW: Refresh token before expiry
    persistSessionOptions: {
      refreshTokenRotationEnabled: true,
    },
  },
});
```

### Phase 2: Create Authentication Service

**New File**: `app/src/lib/auth.ts`

**Features**:
- Email/password signup and login
- Google OAuth flow
- Apple Sign In flow
- Magic link (existing)
- Session refresh utilities
- Logout functionality

**Methods**:
```typescript
// Email/Password
signUpWithEmail(email, password)
signInWithEmail(email, password)

// OAuth
signInWithGoogle()
signInWithApple()

// Session Management
refreshSession()
checkSession()
signOut()

// Utility
getCurrentUser()
```

### Phase 3: Update AuthProvider

**File**: `app/src/providers/AuthProvider.tsx`

**Enhancements**:
- Add automatic session refresh on app foreground
- Implement session expiry handling
- Add network-aware session management
- Better error recovery

**New Features**:
```typescript
// Auto-refresh on app resume
useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      refreshSessionIfNeeded();
    }
  });
  return () => subscription?.remove();
}, []);

// Periodic token refresh
useEffect(() => {
  const interval = setInterval(() => {
    refreshSessionIfNeeded();
  }, 30 * 60 * 1000); // Every 30 minutes
  
  return () => clearInterval(interval);
}, []);
```

### Phase 4: Create New AuthScreen Component

**File**: `app/src/screens/AuthScreen.tsx` (completely rewrite)

**UI Components**:
1. **Tab Selector**: Login / Sign Up
2. **Email/Password Form**:
   - Email input (validated)
   - Password input (with show/hide)
   - Password strength indicator (for signup)
   - Forgot password link
3. **Social Auth Buttons**:
   - Google Sign In button
   - Apple Sign In button (iOS only)
4. **Magic Link Option**:
   - "Send magic link instead" link
5. **Loading States**:
   - Button disabled during auth
   - Loading spinners
   - Error messages

**User Flow**:
```
┌─────────────────────┐
│   Auth Screen       │
├─────────────────────┤
│ [Login] [Sign Up]   │  ← Tabs
├─────────────────────┤
│ Email Input         │
│ Password Input      │
│ [Login Button]      │
├─────────────────────┤
│ ──── or ────        │
├─────────────────────┤
│ [Google] [Apple]    │  ← Social buttons
├─────────────────────┤
│ Magic link option   │
└─────────────────────┘
```

### Phase 5: Dependencies

**New Packages Needed**:
```json
{
  "expo-secure-store": "~15.0.7", // Already installed ✅
  "expo-google-app-auth": "~12.0.0" OR "@react-native-google-signin/google-signin": "^10.0.0",
  "expo-apple-authentication": "~7.0.0" // For Apple Sign In
}
```

**Supabase Configuration Required**:
1. Enable Email/Password provider in Supabase Dashboard
2. Enable Google OAuth in Supabase Dashboard
3. Enable Apple OAuth in Supabase Dashboard
4. Configure OAuth redirect URLs:
   - Google: `reclaim://auth`
   - Apple: `reclaim://auth`

### Phase 6: Session Refresh Strategy

**Background Refresh**:
```typescript
// Check token expiry and refresh proactively
const refreshSessionIfNeeded = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return;
  
  // Refresh if token expires in < 5 minutes
  const expiresAt = session.expires_at * 1000;
  const timeUntilExpiry = expiresAt - Date.now();
  
  if (timeUntilExpiry < 5 * 60 * 1000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Session refresh failed:', error);
      // Handle refresh failure
    }
  }
};
```

**App State Handling**:
```typescript
// Refresh when app comes to foreground
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === 'active') {
    refreshSessionIfNeeded();
  }
});
```

## Implementation Order

### Step 1: Setup (Non-Breaking)
1. Update Supabase client configuration
2. Add SecureStore for token persistence
3. Create auth service utilities
4. Add session refresh logic

### Step 2: Email/Password Auth (Low Risk)
1. Add email/password methods to auth service
2. Update AuthScreen UI
3. Test login/signup flow
4. Ensure backward compatibility

### Step 3: Google OAuth (Medium Risk)
1. Install Google Sign In package
2. Configure OAuth in Supabase
3. Add Google button to AuthScreen
4. Test OAuth flow

### Step 4: Apple Sign In (iOS Only)
1. Install Apple Authentication package
2. Configure Apple OAuth in Supabase
3. Add Apple button (iOS only)
4. Test Apple Sign In flow

### Step 5: Enhanced Session Management
1. Add background refresh
2. Add session recovery
3. Add network-aware handling
4. Test session persistence

### Step 6: Testing & Migration
1. Test all auth methods
2. Test session persistence
3. Test token refresh
4. Migrate existing users (if needed)

## Configuration Requirements

### Supabase Dashboard Setup

1. **Email/Password**:
   - Go to Authentication > Providers
   - Enable "Email" provider
   - Configure email templates (optional)

2. **Google OAuth**:
   - Go to Authentication > Providers
   - Enable "Google" provider
   - Add OAuth credentials:
     - Client ID (from Google Cloud Console)
     - Client Secret (from Google Cloud Console)
   - Add redirect URL: `reclaim://auth`

3. **Apple OAuth**:
   - Go to Authentication > Providers
   - Enable "Apple" provider
   - Add Service ID and Key ID
   - Add redirect URL: `reclaim://auth`

### App Configuration

**app.config.ts**:
```typescript
ios: {
  bundleIdentifier: 'com.fissioncorporation.reclaim',
  // Apple Sign In capability
  infoPlist: {
    'CFBundleURLTypes': [
      {
        'CFBundleURLSchemes': ['reclaim'],
      },
    ],
  },
},
android: {
  package: 'com.fissioncorporation.reclaim',
  // Google Sign In configuration
},
```

## Expected Outcomes

### User Experience
- ✅ Users stay logged in indefinitely (with automatic refresh)
- ✅ One-tap login with Google/Apple
- ✅ No email dependency for login
- ✅ Offline-capable authentication state

### Technical Benefits
- ✅ Reliable session persistence
- ✅ Automatic token refresh
- ✅ Multiple authentication options
- ✅ Better error recovery
- ✅ Improved security (SecureStore)

### Notification Reliability
- ✅ Notifications work even if app is closed
- ✅ Background tasks have valid session
- ✅ No interruption due to expired tokens

## Migration Strategy

### For Existing Users
1. **Magic Link Users**: Can continue using magic link, or switch to email/password
2. **No Data Loss**: All existing data remains intact
3. **Graceful Upgrade**: App works with both old and new auth methods

### Rollout Plan
1. **Phase 1**: Deploy with email/password only (safest)
2. **Phase 2**: Add Google OAuth (most requested)
3. **Phase 3**: Add Apple Sign In (iOS enhancement)
4. **Phase 4**: Enhance session management (background)

## Testing Checklist

- [ ] Email/password signup
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] Apple Sign In (iOS)
- [ ] Magic link (backward compatibility)
- [ ] Session persistence after app restart
- [ ] Token refresh on app foreground
- [ ] Token refresh before expiry
- [ ] Logout functionality
- [ ] Password reset flow
- [ ] Error handling (network, invalid credentials)
- [ ] Notifications work with persisted session

## Estimated Time

- **Phase 1 (Setup)**: 2-3 hours
- **Phase 2 (Email/Password)**: 3-4 hours
- **Phase 3 (Google OAuth)**: 2-3 hours
- **Phase 4 (Apple Sign In)**: 2-3 hours
- **Phase 5 (Session Management)**: 2-3 hours
- **Phase 6 (Testing)**: 2-3 hours

**Total**: 13-19 hours

## Risk Assessment

### Low Risk
- ✅ Email/password implementation
- ✅ Session refresh logic
- ✅ SecureStore integration

### Medium Risk
- ⚠️ Google OAuth (OAuth flow complexity)
- ⚠️ Session migration (existing users)

### Mitigation
- Implement gradually (one feature at a time)
- Keep magic link as fallback
- Test thoroughly before each phase
- Monitor session refresh in production

## Questions for You

Before I implement, please confirm:

1. **Do you have Google OAuth credentials set up?** (If not, I'll provide instructions)
2. **Do you have Apple Developer account?** (Required for Apple Sign In)
3. **Do you want to keep magic link as an option?** (Recommended: yes)
4. **Priority order**: Email/Password first, then Google, then Apple? (Or all at once?)
5. **Testing**: Do you have test accounts ready, or should I create test users?

## Next Steps

Once you approve this plan, I will:

1. ✅ Start with Phase 1 (safe, non-breaking changes)
2. ✅ Implement email/password authentication
3. ✅ Add Google OAuth
4. ✅ Add Apple Sign In
5. ✅ Enhance session management
6. ✅ Test thoroughly
7. ✅ Document all changes

**Ready to proceed?** Let me know if you want any modifications to this plan!

