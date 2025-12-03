# Health Permissions & Integration Analysis

## Current Understanding

Based on codebase review and documentation analysis, here's what I understand:

### ✅ What's Already Implemented

1. **Google Fit Provider** (`app/src/lib/health/providers/googleFit.ts`)
   - OAuth scopes are being requested correctly
   - Missing: Android runtime permission request for `ACTIVITY_RECOGNITION` BEFORE OAuth
   - Plugin configured in `app.config.ts` with OAuth client ID

2. **Samsung Health Provider** (`app/src/lib/health/providers/samsungHealth.ts`)
   - Native module shim implemented
   - App detection code exists
   - Missing: Query in AndroidManifest.xml for Samsung Health package
   - Missing: Proper permission request flow per Samsung docs

3. **Health Connect Provider** (`app/src/lib/health/providers/healthConnect.ts`)
   - Permission request logic exists
   - Missing: Query in AndroidManifest.xml for Health Connect package

4. **Android Permissions**
   - `ACTIVITY_RECOGNITION` declared in manifest ✅
   - Samsung Health permissions declared ✅
   - Missing: Runtime permission request for `ACTIVITY_RECOGNITION` before Google Fit OAuth

---

## Issues Identified

### Issue 1: Google Fit - Missing Android Runtime Permission Request

**Problem:**
According to [Google Fit Android Permissions docs](https://developers.google.com/fit/android/authorization#android_permissions), you MUST request Android runtime permissions BEFORE requesting OAuth scopes. The current code requests OAuth scopes but doesn't check/request the `ACTIVITY_RECOGNITION` permission first.

**Current Code Flow:**
1. `requestPermissions()` → Directly calls `module.authorize({ scopes })`
2. No Android permission check/request

**Required Flow (per Google docs):**
1. Check if `ACTIVITY_RECOGNITION` permission is granted
2. If not, request it using `PermissionsAndroid.request()`
3. Only after Android permission is granted, request OAuth scopes

**Fix Required:**
- Add Android runtime permission check/request in `GoogleFitProvider.requestPermissions()`
- Handle Android 10+ vs Android 9 and below (different permission names)
- Request permission BEFORE calling `module.authorize()`

---

### Issue 2: Samsung Health - Missing App Detection Query

**Problem:**
The AndroidManifest.xml is missing a query for the Samsung Health app package. According to [Samsung Health docs](https://developer.samsung.com/codelab/health/sleep-data.html), you need to query the app to detect if it's installed.

**Current State:**
- `AndroidManifest.xml` has query for Google Fit ✅
- Missing query for Samsung Health package: `com.sec.android.app.shealth`
- Missing query for Health Connect package: `com.google.android.apps.healthdata`

**Fix Required:**
- Add `<package android:name="com.sec.android.app.shealth" />` to queries
- Add `<package android:name="com.google.android.apps.healthdata" />` to queries

---

### Issue 3: Samsung Health - Permission Request Flow

**Problem:**
According to Samsung Health documentation, the permission request flow should:
1. Check if app is installed (via query)
2. Request permissions using `askPermissionAsync()` or `connect()`
3. The current code tries to read data first, then connects - this might fail

**Current Code:**
```typescript
// Tries to read first, then connects if it fails
try {
  await SamsungHealthNative!.readDailySteps(oneDayAgo, now);
  return true; // Already has permissions
} catch {
  const connected = await SamsungHealthNative!.connect();
  return connected;
}
```

**Per Samsung Docs:**
- Should use `askPermissionAsync()` for explicit permission requests
- Should check permissions before attempting reads

**Fix Required:**
- Update `requestPermissions()` to use proper Samsung Health permission request flow
- Ensure app detection query is in place first

---

### Issue 4: Missing Health Data Types in Samsung Health

**Current Implementation:**
- ✅ Sleep data (with stages)
- ✅ Heart rate
- ✅ Steps
- ❌ Blood oxygen (SpO2) - NOT implemented
- ❌ Blood pressure - NOT implemented
- ❌ Other health metrics

**Fix Required:**
- Add methods to read blood oxygen data
- Add methods to read blood pressure data
- Expand data types according to Samsung Health SDK capabilities

---

### Issue 5: Card Theming - Limited Differentiation

**Current State:**
- `ActionCard`: Elevated mode, 4dp elevation, primary color accents, chevron icon
- `InformationalCard`: Flat mode, border, no elevation, smaller icon

**Problem:**
The visual differentiation is subtle. Users might not clearly distinguish between actionable cards and informational cards.

**Suggestions:**
1. Increase elevation difference (ActionCard: 6-8dp, InformationalCard: 0dp)
2. Add more prominent primary color accent to ActionCard
3. Consider adding a subtle background tint to ActionCard
4. Make InformationalCard more subtle (lighter border, less padding)
5. Add hover/press state visual feedback to ActionCard

---

## Fix Plan

### Step 1: Fix Google Fit Android Permissions
- Add `PermissionsAndroid` import
- Check/request `ACTIVITY_RECOGNITION` permission before OAuth
- Handle Android version differences (API 29+ vs 28-)

### Step 2: Add Missing Queries to AndroidManifest.xml
- Add Samsung Health package query
- Add Health Connect package query

### Step 3: Fix Samsung Health Permission Flow
- Update permission request to follow Samsung docs
- Ensure proper error handling

### Step 4: Add Missing Health Data Types
- Implement blood oxygen reading
- Implement blood pressure reading
- Add to provider interface

### Step 5: Enhance Card Theming
- Increase visual differentiation between ActionCard and InformationalCard
- Add more prominent styling cues

---

## Expected Outcomes

After fixes:
1. ✅ Google Fit: Android permission requested → OAuth scopes requested → Permissions granted
2. ✅ Samsung Health: App detected → Permissions requested → Data accessible
3. ✅ Health Connect: App detected → Permissions requested → Data accessible
4. ✅ All health data types available (sleep, heart rate, steps, blood oxygen, etc.)
5. ✅ Clear visual distinction between action and information cards

