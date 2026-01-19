# Update Quick Reference

## ✅ Ensuring Updates Always Work

### Critical Rules

1. **Same Signing Key** = Can update
   - Android: Same keystore signature
   - iOS: Same provisioning profile
   - ✅ EAS manages this automatically for production builds

2. **Same Runtime Version** = OTA updates work
   - ✅ JavaScript changes only → Keep `runtimeVersion` same
   - ✅ Publish with `eas update --branch production`

3. **Different Runtime Version** = Requires native build
   - ⚠️ Native code changed → Change `runtimeVersion`
   - ⚠️ Build and submit to stores

## 🚀 Quick Commands

### Publish OTA Update (JavaScript only)
```bash
cd app
eas update --branch production --message "Bug fixes"
```

### Build New Native Version (Native changes)
```bash
cd app
eas build --profile production --platform all
eas submit --platform all
```

### Check Update Status
```bash
cd app
eas update:list --branch production
```

### Check Credentials (Signing Keys)
```bash
cd app
eas credentials
```

## 📋 Decision Tree

**Question: What changed?**

- **Only JavaScript/TypeScript** → OTA Update
- **Added native dependency** → Native Build
- **Changed app config** → Native Build
- **Upgraded Expo SDK** → Native Build

**Question: Same runtime version?**

- **Yes** → OTA Update (`eas update`)
- **No** → Native Build (`eas build`)

## 🔑 Configuration

### app.config.ts
```typescript
version: '1.0.0',           // Always increment for releases
runtimeVersion: '1.0.0',    // Only change when native code changes
android: {
  versionCode: 1,           // Always increment (required by Play Store)
}
```

### When to Change runtimeVersion

✅ **Change** when:
- Adding/removing native modules
- Upgrading Expo SDK major version
- Changing native code
- Changing app configuration (permissions, plugins)

❌ **Don't change** when:
- Only JavaScript/TypeScript changes
- UI/styling updates
- Bug fixes in app logic

## 🎯 Update Methods

1. **OTA Updates** (EAS Updates)
   - Fast (no store review)
   - JavaScript only
   - Same runtime version

2. **Store Updates** (Play Store/App Store)
   - Full app update
   - Any changes
   - Store review required

3. **Direct Install** (Beta)
   - For testing
   - Same signing required
   - Works like store update

## ✅ Checklist

Before publishing update:
- [ ] Decide: OTA or Native build?
- [ ] Check runtime version compatibility
- [ ] Verify signing keys match (if updating existing install)
- [ ] Test on previous version
- [ ] Verify version numbers incremented

---

**Remember**: Same signature + same runtime = seamless updates! 🚀

