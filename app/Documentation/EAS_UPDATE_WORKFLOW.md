# EAS Update Workflow - Ensuring Reliable Updates

This guide explains the complete workflow for ensuring app updates work correctly across all scenarios.

## 🎯 Update Strategy Overview

### Three Update Methods

1. **OTA Updates** (EAS Updates)
   - JavaScript bundle updates
   - No app store review
   - Works if `runtimeVersion` matches
   - Requires same signing key/provisioning

2. **Native Builds** (App Store/Play Store)
   - Full app updates
   - Requires store review
   - Works across any version
   - Handles native code changes

3. **Direct Install** (Beta Testing)
   - Installing APK/IPA directly
   - Same signing key required (Android)
   - Same provisioning required (iOS)

## 🔑 Key Principles

### 1. Signing Key Consistency

**Android**:
- ✅ All builds for same package **MUST** use same keystore
- ✅ EAS manages production keystore automatically
- ✅ Debug builds use different keystore (can't update from debug → release)

**iOS**:
- ✅ All builds for same App ID **MUST** use same provisioning
- ✅ EAS manages credentials automatically
- ✅ Development and production use different provisioning (can't update between them)

### 2. Runtime Version Compatibility

**Same Runtime Version**:
- ✅ OTA updates work seamlessly
- ✅ Users can update without reinstalling
- ✅ No native code changes needed

**Different Runtime Version**:
- ⚠️ Requires new native build
- ⚠️ Users must update via store or new install
- ⚠️ Native code may have changed

### 3. Version Numbering

**Always Increment**:
- `version` - User-visible version (semver: 1.0.0 → 1.0.1)
- `android.versionCode` - Android build number (must always increase)
- `ios.buildNumber` - iOS build number (must always increase)

**Only Change When Needed**:
- `runtimeVersion` - Only when native code changes

## 📋 Update Scenarios

### Scenario 1: JavaScript-only Change

**Changes**: Bug fix, UI update, feature toggle

**Steps**:
1. Make JavaScript changes
2. **Keep `runtimeVersion` the same** (1.0.0)
3. Publish OTA update:
   ```bash
   cd app
   eas update --branch production --message "Bug fixes"
   ```
4. ✅ Users get update automatically on next app launch

### Scenario 2: Native Dependency Added

**Changes**: Added new native module (e.g., `expo-camera`)

**Steps**:
1. Add dependency to `package.json`
2. **Increment `runtimeVersion`** (1.0.0 → 1.1.0)
3. Build new native version:
   ```bash
   cd app
   eas build --profile production --platform all
   ```
4. Submit to stores:
   ```bash
   eas submit --platform all
   ```
5. ⚠️ Users must update via store (can't use OTA)

### Scenario 3: App Configuration Changed

**Changes**: New permission, plugin change, app config

**Steps**:
1. Update `app.config.ts`
2. **Increment `runtimeVersion`** (1.0.0 → 1.1.0)
3. Build and submit as above

### Scenario 4: Major Version Update

**Changes**: Expo SDK upgrade (e.g., SDK 54 → 55)

**Steps**:
1. Upgrade Expo SDK
2. **Change `runtimeVersion`** (1.0.0 → 2.0.0) - major version bump
3. Build and submit as above
4. ⚠️ All users must update via store

## 🔧 Configuration Files

### app.config.ts

```typescript
{
  version: '1.0.0',           // User-visible version
  runtimeVersion: '1.0.0',    // OTA compatibility version
  android: {
    versionCode: 1,           // Android build number (always increment)
  },
  ios: {
    buildNumber: '1',         // iOS build number (always increment)
  },
}
```

### eas.json

```json
{
  "build": {
    "production": {
      "channel": "production",  // Update channel name
    },
    "preview": {
      "channel": "preview",     // Preview channel
    }
  }
}
```

## 🚀 Publishing Updates

### OTA Update (Same Runtime Version)

```bash
cd app

# Publish to production channel
eas update --branch production --message "Bug fixes"

# Publish to preview channel (for testing)
eas update --branch preview --message "Preview build"
```

### Native Build (Different Runtime Version)

```bash
cd app

# Build for both platforms
eas build --profile production --platform all

# Or build for specific platform
eas build --profile production --platform android
eas build --profile production --platform ios

# Submit to stores (after building)
eas submit --platform all
```

## ✅ Update Checklist

### Before Publishing

- [ ] **Check runtime version**: Same = OTA, Different = Native build
- [ ] **Check signing keys**: Must match existing installs
- [ ] **Test update flow**: Verify updates work on previous version
- [ ] **Verify version numbers**: Increment as needed

### For OTA Updates

- [ ] `runtimeVersion` matches existing builds
- [ ] No native code changes
- [ ] Test update on device with previous version
- [ ] Publish to correct channel (production/preview)
- [ ] Verify update available in EAS dashboard

### For Native Builds

- [ ] `runtimeVersion` incremented (if needed)
- [ ] `version` incremented
- [ ] `versionCode`/`buildNumber` incremented
- [ ] Test installation on clean device
- [ ] Test update from previous version
- [ ] Submit to stores

## 🛡️ Ensuring Updates Always Work

### 1. Use EAS Managed Credentials

**Android**:
```bash
# EAS automatically manages production keystore
# All production builds use same key
eas credentials
```

**iOS**:
```bash
# EAS automatically manages provisioning
# All production builds use same provisioning
eas credentials
```

### 2. Consistent Channel Strategy

**Use channels** for different update streams:
- `production` - Live updates for production builds
- `preview` - Preview updates for testing
- `staging` - Staging updates (if needed)

**Match channels to build profiles**:
- `eas build --profile production` → `eas update --branch production`
- `eas build --profile preview` → `eas update --branch preview`

### 3. Version Management

**Best Practice**: Use semantic versioning
```typescript
runtimeVersion: '1.0.0',  // Major.Minor.Patch

// Change when:
// - Major: Breaking native changes (SDK upgrade)
// - Minor: New features (new native modules)
// - Patch: Keep same (only JS changes)
```

### 4. Update Detection

**Automatic** (on app launch):
- Checks for updates on every launch
- Downloads and applies silently
- Notifies user when update ready

**Manual** (in Settings):
- User can manually check for updates
- Shows update status
- Allows immediate restart to apply

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

# Publish update to correct channel
eas update --branch production
```

### Update Fails to Install

**Possible causes**:
- Different signing key (Android)
- Different provisioning (iOS)
- Insufficient storage
- Network interruption

**Solutions**:
1. Check signing credentials match
2. Verify runtime version compatibility
3. Free up device storage
4. Retry on stable network
5. Manual update via store if critical

### App Can't Update

**Scenario**: User has old version, new version requires different runtime

**Solution**:
1. Build new native version with incremented `runtimeVersion`
2. Submit to stores
3. Users update via store (automatic or manual)
4. Future updates can be OTA (if `runtimeVersion` stays same)

## 📊 Update Flow Diagram

```
User has: 1.0.0 (runtime: 1.0.0)
         ↓
   New OTA update available: 1.0.1 (runtime: 1.0.0)
         ↓
   ✅ Automatic update on next launch
         ↓
   User now has: 1.0.1 (runtime: 1.0.0)
```

```
User has: 1.0.0 (runtime: 1.0.0)
         ↓
   New native build: 1.1.0 (runtime: 1.1.0)
         ↓
   ⚠️ Requires store update
         ↓
   User updates via Play Store/App Store
         ↓
   User now has: 1.1.0 (runtime: 1.1.0)
         ↓
   Future OTA updates work (if runtime stays 1.1.0)
```

## 🎯 Summary

**Key Rules**:
1. ✅ **Same signature + same runtime** = Seamless OTA updates
2. ⚠️ **Different signature** = Requires new install
3. 🔄 **Different runtime** = Requires native build
4. 📱 **Store updates** = Always work (handles any change)

**Best Practice**:
- Keep `runtimeVersion` same for quick fixes (OTA)
- Change `runtimeVersion` only when necessary (native changes)
- Use EAS managed credentials (consistent signing)
- Test updates on previous versions before releasing

---

**Result**: Users always get updates correctly, regardless of how the app was installed or what version they have! 🚀

