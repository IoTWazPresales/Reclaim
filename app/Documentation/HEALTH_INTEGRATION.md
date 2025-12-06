# Health Integrations

The Sleep screen now includes a **Connect & Sync** card that lists every supported provider with status indicators and logos. Users tap a provider to request permissions and Reclaim automatically syncs on the next app launch.

Supported connectors today:

- ✅ **Google Fit** (Android) – fully wired
- ✅ **Apple HealthKit** (iOS) – fully wired
- ✅ **Health Connect** (Android 13+) – scaffolded connector (records returned where available)
- 🟨 **Samsung Health** – placeholder (requires Samsung partnership SDK)
- 🟨 **Garmin Connect** – placeholder (requires Garmin Health API approval)
- 🟨 **Huawei Health** – placeholder (requires Huawei HMS Health Kit credentials)

> Placeholders display guidance when tapped and log an integration error so we can surface helpful feedback in the UI.

---

## Key Files

| Purpose | Location |
| --- | --- |
| Integration registry & connect logic | `app/src/lib/health/integrations.ts` |
| Persistent connection store | `app/src/lib/health/integrationStore.ts` |
| Unified health service | `app/src/lib/health/unifiedService.ts` |
| Health Connect provider (scaffold) | `app/src/lib/health/providers/healthConnect.ts` |
| Sleep screen UI list | `app/src/components/HealthIntegrationList.tsx` |
| Sleep screen hook | `app/src/hooks/useHealthIntegrationsList.ts` |

---

## Authentication & Tokens

Each platform follows the vendor’s recommended storage strategy. Reclaim keeps short-lived auth tokens locally (SecureStore / AsyncStorage). Long-lived refresh tokens should remain on-device unless the vendor requires server exchange. When production credentials are available we can revisit server-side persistence.

| Provider | Token Storage | Notes |
| --- | --- | --- |
| Google Fit | Managed by `react-native-google-fit` (SecureStore-backed) | Session persists between launches; disconnect clears token. |
| Apple HealthKit | Apple does not expose tokens; authorization is handled entirely by iOS. |
| Health Connect | Permissions only (no token); future read/write scopes managed through Google Play Services. |
| Samsung Health | Requires Samsung Health Partner SDK (native) – tokens managed by Samsung Account. |
| Garmin Connect | OAuth 1.0a / 2.0 – store tokens on backend once Garmin approves the app. |
| Huawei Health | HMS authentication – requires HMS Core SDK and app signature registration. |

---

## Account Setup Checklist

### Google Fit
1. [Create a Google Cloud project](https://console.cloud.google.com/)
2. Enable **Fitness API**
3. Generate OAuth Client ID (Android type) with your package name & SHA-1
4. Add reversed client ID to `android/app/src/main/AndroidManifest.xml` if needed
5. Fill in OAuth consent screen before production release

### Health Connect
1. Target Android 13+ and include `react-native-health-connect`
2. Add `<queries>` entry for `com.google.android.apps.healthdata` to check availability
3. Ensure users install the Health Connect (Beta) app from Google Play
4. Permissions are granted per record type (Sleep, Steps, Heart Rate)

### Apple HealthKit
1. Enroll in the Apple Developer Program
2. Enable HealthKit capability in Xcode (targets & entitlements)
3. Configure privacy strings in `Info.plist`
4. Health data remains on-device; no API keys required

### Samsung Health (placeholder)
1. Apply for Samsung Health Partner Program
2. Once approved, integrate Samsung Health SDK (requires native module outside Expo managed workflow)
3. Map Samsung data to our unified provider once SDK is in place

### Garmin Connect (placeholder)
1. Apply for [Garmin Health API](https://developer.garmin.com/health-api/)
2. Receive client key / secret (OAuth 1.0a or REST)
3. Implement backend-to-backend token exchange, then surface via our connectors

### Huawei Health (placeholder)
1. Create HMS developer account
2. Enable Health Kit in AppGallery Connect
3. Download `agconnect-services.json` and integrate HMS Core SDK
4. Bridge HMS data to React Native once credentials are approved

---

## Auto Sync Behaviour

- On app launch we evaluate stored connections, pick the preferred provider, and call `syncAll()`
- Sleep queries invalidate automatically when a new provider connects
- Users no longer need to tap “Sync now” – the button remains available for manual refresh

---

## Testing Notes

| Scenario | Steps |
| --- | --- |
| Google Fit on emulator | Install Google Fit, sign in, grant permissions from Connect card |
| Health Connect | Install Health Connect (Beta), enable permissions for target record types |
| Apple Health | Run dev build on iOS, enable permissions in Health > Sources |
| Disconnect flow | Long-press provider (future enhancement) or disconnect via vendor app, then tap connect list again |

For providers marked as placeholder, expect an informational alert. Once credentials are ready, swap the placeholder connect function with real SDK calls and update `HealthConnectProvider` or add new provider classes as needed.

---

## Next Steps

- Implement real Samsung Health provider once SDK access is granted
- Finish Garmin / Huawei connectors after API credentials are issued
- Expand Health Connect provider to return activity and heart-rate variability data in addition to sleep
- Add UI affordance to disconnect providers and surface connection errors inline


