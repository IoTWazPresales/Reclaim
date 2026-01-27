# EAS Preview & Google Fit Setup

Use this checklist when building and testing with EAS preview, and when connecting Google Fit.

---

## 1. EAS Preview build (general)

- **Environment:** Use the `preview` profile so env vars (e.g. `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) are loaded from the EAS “preview” environment.
- **Health Connect (Android):** Works on EAS dev/preview builds. Ensure the device is Android 13+ and Health Connect is installed. After connecting in Integrations, tap “Import latest data” or open Dashboard so sync runs; sleep/activity then write to `sleep_sessions` / `activity_daily`.
- **Google Fit:** Requires OAuth and correct Android client config (see below). **Does not work in Expo Go**; use a development or preview build.

---

## 2. Google Fit – what you need to do (Google Cloud Console)

Google Fit uses OAuth. For **EAS preview** the Android app must use a client that matches the **EAS-built** app, not your local debug keystore.

### Step 1: Get the EAS preview keystore fingerprint (SHA-1)

From the project root:

```bash
cd app
eas credentials
```

- Choose **Android** → **preview** (or the profile you use for preview).
- **View** or **Download** the keystore; from it, get the **SHA-1** fingerprint.

Or:

- In [expo.dev](https://expo.dev) → your project → **Credentials** → Android → preview → see the keystore fingerprint (SHA-1).

You need this exact SHA-1 for the Google Cloud Android client.

### Step 2: Create or update the Android OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project (or create one).
2. **APIs & Services** → **Credentials**.
3. **Create credentials** → **OAuth client ID** (or edit the existing Android client used by the app).
4. Application type: **Android**.
5. Fill in:
   - **Package name:** Must match the Android package name of your EAS preview build (e.g. from `app.json` / `app.config.ts` or the native `applicationId`). If you use a custom `android.package` in app config, use that.
   - **SHA-1:** The EAS preview keystore SHA-1 from Step 1.

6. Save.

If you already have an Android client that was created with a different keystore (e.g. local debug), create a **new** Android OAuth client with the EAS preview package name and EAS preview SHA-1, and use that client’s config in your app (e.g. in `google-services.json` or wherever your app reads the OAuth client).

### Step 3: Enable the Fitness API

1. **APIs & Services** → **Library**.
2. Search for **Fitness API**.
3. Open it and click **Enable**.

### Step 4: Build and install

- Build with:  
  `eas build --platform android --profile preview`
- Install the **resulting .apk / .aab** on the device. Do **not** use Expo Go for Google Fit.
- In the app: **Integrations** → connect **Google Fit**. The system browser will open for OAuth.
- If it still fails: use **Integrations** → **Run diagnostics** and check “Available” and “Permissions”. If “Available” is no, the native Google Fit module is not active (e.g. wrong build). If “Permissions” is no, OAuth failed — re-check package name and SHA-1.

---

## 3. Checklist summary

| Item | Your action |
|------|-------------|
| EAS preview env | Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in EAS “preview” environment. |
| EAS preview SHA-1 | Run `eas credentials` (or use expo.dev) and copy the Android preview keystore SHA-1. |
| Google Cloud Android client | Create or edit an **Android** OAuth client with **package name** = EAS preview app id and **SHA-1** = EAS preview keystore SHA-1. |
| Fitness API | Enable **Fitness API** in the same Google Cloud project. |
| Test device | Install the EAS preview build (not Expo Go). Open Integrations → Connect Google Fit; if it fails, use “Run diagnostics” and compare “Available” / “Permissions” to the steps above. |

---

## 4. Health Connect (no extra cloud setup)

- Health Connect does not use Google OAuth. Once the app is built with the Health Connect module and the user has connected Health Connect in Integrations, sync runs when:
  - The user opens **Dashboard** (or triggers sync), or
  - The user has just connected Health Connect (sync runs automatically after connect).
- If “nothing in sleep_sessions” or insights look empty, ensure the user has **connected** Health Connect in Integrations, granted permissions, and then either opened Dashboard or tapped “Import latest data” so `syncHealthData` runs and writes to Supabase.

---

## 5. Insights and sleep data

- Insights read from **sleep_sessions** (and mood/activity/meds). Rows get there only from **sync** (Health Connect, Apple Health, Samsung, or Google Fit).
- So: connect a provider → run sync (Dashboard on open, or “Import latest data”, or after connecting Health Connect) → then insights can use the new sleep data.
- If sync ran successfully, **Insights** are refetched after health sync (Dashboard and Integrations both trigger an insight refresh when sleep/activity was synced).
