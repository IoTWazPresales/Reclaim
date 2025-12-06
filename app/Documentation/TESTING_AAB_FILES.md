# Testing .aab (Android App Bundle) Files

## The Problem

**.aab files cannot be directly installed on devices** like `.apk` files. Android App Bundles are Google Play's optimized format, but they need to be either:
1. Converted to APK using bundletool
2. Uploaded to Google Play Internal Testing track
3. Or build APK instead for testing

## Quick Solution: Use Preview Profile (Recommended for Testing)

Your `eas.json` already has a `preview` profile that builds **APK files** for easy testing:

```bash
cd app
eas build --profile preview --platform android
```

This generates an `.apk` file you can directly install on devices via:
- Direct download/install
- USB debugging: `adb install app-release.apk`
- Sharing via email/cloud storage

## Option 1: Convert AAB to APK (For Testing Existing .aab)

If you already have an `.aab` file, use Google's `bundletool` to extract APKs:

### Step 1: Install Bundletool

Download from: https://github.com/google/bundletool/releases

Or install via Homebrew (macOS):
```bash
brew install bundletool
```

### Step 2: Generate APK Set

```bash
# Download bundletool.jar first if needed
java -jar bundletool.jar build-apks \
  --bundle=your-app.aab \
  --output=app.apks \
  --mode=universal \
  --ks=path/to/keystore.jks \
  --ks-pass=pass:your-keystore-password \
  --ks-key-alias=your-key-alias \
  --key-pass=pass:your-key-password
```

For **universal APK** (single APK that works on all devices):
```bash
java -jar bundletool.jar build-apks \
  --bundle=your-app.aab \
  --output=app.apks \
  --mode=universal
```

### Step 3: Extract Universal APK

The `.apks` file is a ZIP. Extract it:
```bash
unzip app.apks -d output/
```

Or use bundletool:
```bash
java -jar bundletool.jar extract-apks \
  --apks=app.apks \
  --output-dir=output/ \
  --device-spec=device-spec.json
```

### Step 4: Install APK

```bash
adb install output/universal.apk
```

Or drag and drop to your device if connected.

## Option 2: Google Play Internal Testing Track (Best for Beta)

This is the **recommended way** to distribute .aab files to beta testers:

### Step 1: Build Production AAB

```bash
cd app
eas build --profile production --platform android
```

### Step 2: Upload to Google Play Console

1. Go to https://play.google.com/console
2. Select your app
3. Go to **Testing** → **Internal testing**
4. Click **Create new release**
5. Upload your `.aab` file
6. Add release notes
7. Click **Review release** → **Start rollout to Internal testing**

### Step 3: Add Testers

1. Go to **Testers** tab
2. Create email list or Google Group
3. Share the testing link with beta testers

**Testers will receive an email** and can install via Google Play Store (they see "Testing" badge).

## Option 3: Update EAS Config for Testing Build

Modify `eas.json` to build APK for production testing:

```json
{
  "build": {
    "production": {
      "channel": "production",
      "android": {
        "buildType": "apk"  // Add this for APK builds
      },
      "env": {}
    }
  }
}
```

Then build:
```bash
eas build --profile production --platform android
```

**Note:** Change back to `app-bundle` (or remove the line) before submitting to Play Store.

## Option 4: Use EAS Build Artifacts

EAS Build provides download links for both .aab and .apk:

```bash
# View build details
eas build:view

# List builds
eas build:list

# Download build
eas build:download --platform android
```

Some EAS Build profiles automatically generate both formats.

## Recommended Testing Workflow

### For Quick Local Testing:
```bash
# Build APK (fast, direct install)
eas build --profile preview --platform android

# Download and install
adb install app-release.apk
```

### For Beta Distribution:
```bash
# Build AAB (Play Store format)
eas build --profile production --platform android

# Upload to Google Play Internal Testing
# Share testing link with beta testers
```

### For Internal Team Testing:
```bash
# Build APK, share via cloud storage
eas build --profile preview --platform android

# Share download link or email APK file
```

## Installing APK on Android Device

### Method 1: USB Debugging
```bash
# Enable USB debugging on device (Settings → Developer options)
adb devices  # Verify device connected
adb install app-release.apk
```

### Method 2: Direct Transfer
1. Transfer `.apk` to device (email, cloud storage, USB)
2. On device: **Settings → Security → Enable "Install from unknown sources"**
3. Open file manager, tap `.apk` file
4. Tap **Install**

### Method 3: QR Code
```bash
# Generate QR code with download link
# Users scan and download APK
```

## Quick Reference Commands

```bash
# Build APK for testing
eas build --profile preview --platform android

# Build AAB for Play Store
eas build --profile production --platform android

# List builds
eas build:list

# Download build
eas build:download --id <build-id>

# Check build status
eas build:view --id <build-id>
```

## Troubleshooting

### "App not installed" Error
- **Cause:** App already installed with different signature
- **Fix:** Uninstall existing app first: `adb uninstall com.yourcompany.reclaim`

### "Package appears to be corrupt" Error
- **Cause:** Download incomplete or file corrupted
- **Fix:** Re-download the build from EAS

### "Unable to install" on Device
- **Cause:** Device doesn't allow unknown sources
- **Fix:** Enable in Settings → Security → Unknown sources

### Bundletool Errors
- **Cause:** Missing keystore or wrong password
- **Fix:** Use the same keystore used to sign the AAB

## Best Practices

1. **For Development:** Always use `preview` profile (APK)
2. **For Beta Testing:** Use Google Play Internal Testing (AAB)
3. **For Release:** Build AAB with `production` profile
4. **Keep APK builds separate** - don't submit APK to Play Store (they prefer AAB)

## Next Steps

1. ✅ Use `preview` profile for quick testing (APK)
2. ✅ Set up Google Play Internal Testing for beta distribution
3. ✅ Test the app thoroughly before release
4. ✅ Build final AAB with `production` profile for Play Store submission

