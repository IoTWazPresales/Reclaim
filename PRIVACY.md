## Reclaim Privacy Policy

**Last updated:** 2025-02-18  

Reclaim (“the App”) is developed and operated by **Fission Corporation Pty Ltd** (“we”, “us”, “our”), based in South Africa. This policy explains what data we collect, how we use it, and what choices you have.

Reclaim is a **wellness and recovery companion** that helps you track sleep, training, mood, medications, and mindfulness so you can better understand your patterns and make small, sustainable changes over time. It is **not** a medical device and is not a substitute for professional medical advice, diagnosis, or treatment.

---

### 1. Data we collect

#### 1.1 Account & basic information

When you create or use an account, we may collect:

- Email address (if required for login or account recovery).
- Authentication identifiers (for example, a Supabase user ID).
- Basic app configuration and settings (such as notification preferences, guided training prep seconds, and feature toggles).

We use this to authenticate you, keep your data associated with your account, and personalize your experience.

#### 1.2 Health & activity data

If you choose to connect a health provider and grant permission, we may access:

- **Sleep data**: sleep sessions, start and end times, duration, sleep stages (deep, light, REM, awake), and derived metrics such as sleep efficiency and session type (main/nap/other).
- **Activity data**: steps, active energy, total calories burned, exercise sessions and related metadata.
- **Vitals around sleep** (when available): heart rate, resting heart rate, heart-rate variability, respiratory rate, oxygen saturation (SpO₂), body/skin temperature, and related summaries.
- **Provider metadata**: which provider the data came from (for example, Health Connect or Apple HealthKit), and in some cases device information.

On Android, this data is primarily obtained through **Google Health Connect**. On iOS, health data may be obtained via **Apple HealthKit**.  
You decide whether to connect these providers and what categories of data to share by granting or revoking permissions in your device’s settings.

#### 1.3 In-app logs & journaling

If you use these features, we may store:

- Mood check-ins (ratings and optional free-text notes).
- Medication logs (which medication, scheduled time, taken time, adherence).
- Mindfulness and meditation events (session type, duration, context).
- Training sessions (planned workouts, logged sets/reps/weights, timestamps, and post-session prompts).

This information is used to show history, trends, and insights inside the app.

#### 1.4 Technical and usage data

We may collect limited technical data to keep the app reliable, such as:

- Device information (platform, OS version, app version).
- Basic logs and error reports (for example, when a sync fails or the app crashes).
- Non-identifying analytics events (for example, “health sync succeeded”, “guided session started”, “notification action SET_DONE”).

We **do not** use advertising SDKs and we **do not** share your data with ad networks.

---

### 2. How we use your data

We use your data to:

- **Provide and improve core features**
  - Show sleep history, vitals, and trends.
  - Plan and track training sessions and guided workouts.
  - Log moods, medications, and mindfulness sessions.
  - Send reminders and notifications you have opted into.

- **Personalize your experience**
  - Generate insights and summaries across sleep, training, meds, mood, and recovery.
  - Adjust prompts and suggestions based on your data and usage.

- **Maintain and improve the App**
  - Monitor reliability and performance.
  - Debug issues (for example, failed syncs or crashes).
  - Understand high-level feature usage (which parts of the app are used, not the detailed contents of your private entries).

We do **not** sell your personal data.

---

### 3. Data sources and third parties

#### 3.1 Health data providers

- **Google Health Connect (Android)**  
  We read health data you explicitly grant via Health Connect, such as sleep, activity, and related vitals. We do not write data back to Health Connect. You can revoke access at any time in Health Connect settings on your device.

- **Apple HealthKit (iOS)**  
  Where supported, we only access HealthKit data you explicitly grant through Apple’s permission dialogs. You can revoke access at any time in the Health app on your device.

#### 3.2 Backend and storage

Reclaim uses third-party services to operate:

- **Supabase** – to store account and app data (for example, sleep sessions, moods, meds, training logs) in a managed PostgreSQL database.
- **Expo / EAS** – to build and deliver app updates.
- **Error reporting / logging services** (such as Sentry or similar, if enabled in builds) – to capture crashes and errors with minimal identifying information.

These providers process data on our behalf under their own privacy and security commitments. We aim to share only what is necessary to operate the App.

---

### 4. Where your data is stored

- Your data is stored in databases hosted by Supabase in its selected cloud region (see Supabase documentation for regional and compliance details).
- Some data is cached locally on your device (for example, recent sessions, settings) so that the App works smoothly and can function offline.

We try to store only what we need to provide the service and insights you see in the App.

---

### 5. Data retention and deletion

- We retain your data **for as long as your account is active**, so that we can show you history, trends, and insights over time.
- You can:
  - Disconnect health providers so that no new data is imported.
  - Contact us to request **account deletion**, which will remove or anonymize personal data from our systems, subject to any legal obligations to retain certain records.

To request deletion or export of your data, contact us at **warren.eliason@gmail.com** from the email address associated with your account.

---

### 6. Your choices and controls

You control how much you share and how the App behaves:

- **Health data permissions**  
  - Grant or revoke access to Health Connect or Apple HealthKit at any time in your device settings.

- **Notifications**
  - Enable or disable app notifications in system settings.
  - Adjust notification behavior (for example, chimes, prep times, reminder types) in Reclaim’s in-app settings.

- **App usage**
  - You may stop using the App at any time.
  - You may request deletion of your account and associated data by contacting us.

Revoking health permissions will stop new data imports; existing data will remain until you request deletion or your account is removed.

---

### 7. Security

We take reasonable steps to protect your data, including:

- Using encryption in transit (HTTPS) and at rest (through our hosting providers).
- Restricting access to production data to authorized personnel and systems.
- Implementing authentication and authorization checks on API calls.

However, no system is perfectly secure. If we become aware of a data incident that affects your personal data, we will notify you as required by applicable law.

---

### 8. Children

Reclaim is **not intended for children under 13 years old** (or the minimum age required in your jurisdiction). We do not knowingly collect personal data from children.

If you believe a child has provided us with personal data, please contact us at **warren.eliason@gmail.com** and we will work to remove that information.

---

### 9. Changes to this policy

We may update this Privacy Policy from time to time. When we do:

- We will update the “Last updated” date at the top of this page.
- For material changes, we will provide additional notice (for example, in release notes or via in-app messaging).

Your continued use of Reclaim after changes take effect means you accept the updated policy.

---

### 10. Contact

If you have questions or concerns about this Privacy Policy or how your data is handled, please contact us:

- Email: **warren.eliason@gmail.com**
- Publisher: **Fission Corporation Pty Ltd**
- Repository / project home: <https://github.com/IoTWazPresales/Reclaim>

