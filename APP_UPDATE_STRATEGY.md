# App Update Strategy - Ensuring Reliable Updates

This guide explains how to ensure your app updates correctly regardless of signature, version, or installation method.

## 🎯 Update Methods

Your app uses **three complementary update mechanisms**:

### 1. Over-the-Air (OTA) Updates (EAS Updates)
- **What**: JavaScript bundle updates without rebuilding the native app
- **When**: Used for quick bug fixes, UI changes, feature toggles
- **Limitations**: Cannot change native code, dependencies, or app configuration

### 2. Native Updates (App Store/Play Store)
- **What**: Full app updates through official stores
- **When**: Required for native code changes, major version bumps, dependency updates
- **Limitations**: Requires store review and user approval

### 3. Direct Install Updates
- **What**: Installing new APK/IPA directly over existing app
- **When**: Beta testing, internal distribution
- **Limitations**: Android requires same signing key, iOS requires proper provisioning

## 🔧 Configuration

### Runtime Version Strategy

Your `app.config.ts` uses:
```typescript
runtimeVersion: '1.0.0',
```

**Key Points**:
- ✅ **Same runtime version = OTA updates work** (same native code compatibility)
- ⚠️ **Different runtime version = Requires new native build**
- 🔄 **Increment runtime version** when:
  - Adding/removing native dependencies
  - Changing native code
  - Updating Expo SDK major version
  - Changing app configuration (permissions, plugins)

### Version Management

```typescript
version: '1.0.0',           // User-visible version (semver)
android.versionCode: 1,     // Android build number (must always increment)
runtimeVersion: '1.0.0',    // EAS Updates compatibility version
```

**Best Practices**:
1. **Increment `version`** for each release (user-visible)
2. **Always increment `versionCode`** for Android (required by Play Store)
3. **Keep `runtimeVersion` same** for OTA updates, change only when native code changes

## 🔐 Signing Key Strategy

### Android

**Problem**: Different signing keys prevent updates
- Debug builds use debug keystore
- Release builds use release keystore
- Cannot update from debug → release or vice versa

**Solution**:
1. **Development**: Use debug keystore (shared across team)
2. **Production**: Use release keystore (managed by EAS)
3. **Testing**: Use preview builds with same signing key

**Commands**:
```bash
# Check current keystore info
cd app
eas credentials

# Build with specific profile
eas build --profile production --platform android
```

### iOS

**Problem**: Provisioning profiles and App IDs must match
- Development builds use development provisioning
- Production builds use App Store provisioning
- Cannot update between different provisioning types

**Solution**:
1. **Development**: Use development provisioning (Ad Hoc or Development)
2. **Production**: Use App Store provisioning
3. **Testing**: Use TestFlight (same provisioning as production)

**Commands**:
```bash
# Check current credentials
cd app
eas credentials

# Build with specific profile
eas build --profile production --platform ios
```

## 📱 Update Flow

### Automatic Update Check (On App Launch)

The app automatically checks for updates when:
1. App launches (in production builds)
2. App comes to foreground (if configured)
3. User manually triggers check (in Settings)

**Implementation**: `app/src/hooks/useAppUpdates.ts`

### Update Types

#### Type 1: OTA Update (Same Runtime Version)
```
User has: 1.0.0 (runtime: 1.0.0)
Available: 1.0.1 (runtime: 1.0.0)
✅ Can update via OTA
```

#### Type 2: Native Update (Different Runtime Version)
```
User has: 1.0.0 (runtime: 1.0.0)
Available: 1.1.0 (runtime: 1.1.0)
⚠️ Requires new native build from store
```

#### Type 3: Store Update (Any Version)
```
User has: 1.0.0
Available in store: 1.2.0
✅ Can update via store (native or OTA after)
```

## 🚀 Update Process

### Step 1: Decide Update Type

**Use OTA Update if**:
- ✅ Only JavaScript/TypeScript code changed
- ✅ No new native dependencies
- ✅ No app configuration changes
- ✅ Same runtime version

**Use Native Build if**:
- ⚠️ Native code changed
- ⚠️ New native dependencies added
- ⚠️ App configuration changed (permissions, plugins)
- ⚠️ Runtime version changed

### Step 2: Publish Update

#### OTA Update
```bash
cd app

# Publish to production channel
eas update --branch production --message "Bug fixes and improvements"

# Or publish to preview channel
eas update --branch preview --message "Preview build"
```

#### Native Build
```bash
cd app

# Build and submit to stores
eas build --profile production --platform all
eas submit --platform all
```

### Step 3: Verify Update

1. **Check update status**: `eas update:list`
2. **Test on device**: Install build and verify OTA works
3. **Monitor**: Check error logs and update success rates

## 🔄 Runtime Version Management

### Current Setup
```typescript
// app.config.ts
runtimeVersion: '1.0.0',
```

### When to Change Runtime Version

**Change when**:
- Upgrading Expo SDK major version (e.g., 54 → 55)
- Adding/removing native modules
- Changing native code in `android/` or `ios/` directories
- Changing app configuration that affects native code

**Don't change when**:
- Only JavaScript/TypeScript changes
- Styling or UI updates
- Adding/removing JavaScript-only dependencies
- Bug fixes in app logic

### Versioning Strategy

**Option 1: Semantic Versioning (Recommended)**
```typescript
runtimeVersion: '1.0.0',  // Major.Minor.Patch
```
- Change major when breaking native changes
- Change minor when adding features (still compatible)
- Change patch rarely (only for critical fixes)

**Option 2: SDK-based**
```typescript
runtimeVersion: '54.0.0',  // Matches Expo SDK version
```
- Simple to track
- Automatically increments with SDK updates

**Option 3: Build-based**
```typescript
runtimeVersion: '1',  // Just increment number
```
- Simplest
- No semantic meaning

## 🛡️ Ensuring Updates Work

### 1. Consistent Signing Keys

**Android**:
```bash
# Ensure all builds use same keystore
# Store keystore securely (EAS manages this)
eas credentials
```

**iOS**:
```bash
# Ensure all builds use same App ID and provisioning
eas credentials
```

### 2. Proper Version Increments

**Always increment**:
- `android.versionCode` (required by Play Store)
- `ios.buildNumber` (required by App Store)
- `version` (for user visibility)

**Increment when needed**:
- `runtimeVersion` (only when native code changes)

### 3. Update Compatibility

**Check compatibility before publishing**:
```bash
# Check current runtime version
cd app
eas update:list --branch production

# Verify compatible builds exist
eas build:list --platform android
```

### 4. Testing Update Flow

**Test scenarios**:
1. ✅ Update from previous version (same signature)
2. ✅ Update from previous version (different signature) - should fail gracefully
3. ✅ Update from development to production - should require new install
4. ✅ OTA update after native build - should work
5. ✅ Store update after OTA - should work

## 📝 Update Checklist

### Before Publishing Update

- [ ] Decide: OTA or Native build?
- [ ] Check runtime version compatibility
- [ ] Verify signing keys match (if updating existing install)
- [ ] Test on device with previous version installed
- [ ] Verify update downloads successfully
- [ ] Test update applies correctly
- [ ] Verify app works after update

### For OTA Updates

- [ ] Runtime version matches existing builds
- [ ] No native code changes
- [ ] No configuration changes
- [ ] Test update on previous version
- [ ] Publish to correct channel
- [ ] Verify update available on EAS dashboard

### For Native Builds

- [ ] Increment version and build number
- [ ] Update runtime version (if needed)
- [ ] Build with correct profile
- [ ] Test installation on clean device
- [ ] Test update from previous version
- [ ] Submit to stores (if production)

## 🔍 Troubleshooting

### Update Not Available

**Possible causes**:
- Wrong channel (production vs preview)
- Different runtime version
- Update not published yet
- Network issues

**Solutions**:
```bash
# Check available updates
eas update:list --branch production

# Check current app runtime version
# (Shown in app: Settings → About)
```

### Update Fails to Install

**Possible causes**:
- Different signing key (Android)
- Different provisioning (iOS)
- Insufficient storage
- Network interruption

**Solutions**:
1. Check signing key/provisioning matches
2. Free up device storage
3. Retry on stable network
4. Manual update via store

### App Crashes After Update

**Possible causes**:
- Breaking changes in update
- Incompatible data format
- Missing migration code

**Solutions**:
1. Check error logs
2. Add data migration code
3. Test updates on fresh install
4. Rollback update if critical

## 🎯 Best Practices

1. **Always test updates** before releasing
2. **Use channels** (production/preview) for different update streams
3. **Monitor update adoption** via EAS dashboard
4. **Have rollback plan** for critical updates
5. **Communicate breaking changes** to users
6. **Keep signing keys secure** (use EAS managed credentials)
7. **Document runtime version changes** in changelog

## 📚 Related Files

- `app/app.config.ts` - App configuration and versioning
- `app/eas.json` - EAS build configuration
- `app/src/hooks/useAppUpdates.ts` - Update checking hook
- `app/App.tsx` - App root (integrates update check)

## 🚀 Quick Commands

```bash
# Check for updates (manual)
cd app
eas update:list

# Publish OTA update
eas update --branch production --message "Update message"

# Build new native version
eas build --profile production --platform android

# Check credentials
eas credentials

# View build history
eas build:list
```

---

**Remember**: 
- ✅ **Same signature + same runtime version** = Seamless updates
- ⚠️ **Different signature** = Requires new install
- 🔄 **Different runtime version** = Requires native build

