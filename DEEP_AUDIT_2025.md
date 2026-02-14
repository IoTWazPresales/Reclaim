# Reclaim App – Deep Audit (January 2025)

**Scope:** Pre-launch audit vs. best practices, store guidelines, and competitive positioning.  
**Methodology:** Codebase analysis + OEM docs + store policy review + competitor research.

---

## 1. What Still Needs to Be Done

### 1.1 Blocking TypeScript Errors (Build)

| File | Issue | Fix |
|------|-------|-----|
| `GuidedPrepScreen.tsx:67` | `channelId` not on `NotificationContentInput` | Move `channelId` to Android-specific options or update expo-notifications types; verify Expo v0.32 API |
| `sleepConsolidation.ts:41` | Unreachable `?? 0` (left operand never nullish) | Fix: `return score + (SOURCE_PRIORITY[s.source] ?? 0)` – add parens for precedence |
| `sync.ts:931–936` | `SyncDebugInfo` missing props; invalid `pipeline_error` | Add `sleepPipelineWritten`, `sleepPipelineSkipped`, `sleepSupersededDeleted` to type; add `pipeline_error` to `SleepSyncStatus` union |

### 1.2 Store Compliance (Google Play Health Policy)

- [ ] **Health apps declaration form** – Complete in Play Console (Monitor & Improve > Policy > App content).
- [ ] **Privacy policy** – Public, non-geofenced URL required. Beta docs mention creating it; confirm live URL in app and Play Console.
- [ ] **Medical disclaimer** – Required for non-medical-device health apps. Text: *“This app is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.”* Add to:
  - App store listing
  - In-app (e.g. Data & Privacy or About)
  - First-run or meds/insights screens where advice-like content appears
- [ ] **Healthcare professional reminder** – Google requires: *“Apps must remind users to consult a healthcare professional for medical advice, diagnosis, or treatment.”* Add to Meds, Mood, Insights, and any advice-like content.
- [ ] **Permission rationale** – Only request health-related permissions needed for core functionality; document why each is used.

### 1.3 Apple App Store

- [ ] **Usage descriptions** – `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` are present; confirm they match actual usage.
- [ ] **Privacy Nutrition Labels** – Complete in App Store Connect for all data types.
- [ ] **Third-party login** – If using social login (e.g. Google), Guideline 4.8 may require an additional login option (e.g. email).
- [ ] **ATT (App Tracking Transparency)** – Required if tracking users or using advertising identifiers. Reclaim appears to avoid tracking; confirm and document.

### 1.4 Functional Gaps (from prior audit)

- [ ] **ReclaimLogo** – Path-based “R” implemented; verify on Android devices.
- [ ] **Integrations reconcile** – Retries in place; monitor for false “disconnected” after updates.
- [ ] **Notification idempotency** – SET_DONE / NEXT_SET idempotency and intent cleanup implemented; validate end-to-end.

---

## 2. Potential Problems

### 2.1 Architecture & Performance

| Risk | Severity | Notes |
|------|----------|-------|
| **Dashboard size** | Medium | `Dashboard.tsx` is very large (~2,400 lines). Consider splitting into subcomponents or feature modules. |
| **Heavy re-renders** | Medium | Many `useMemo`/`useCallback` deps; ensure no unnecessary cascades. Profile with React DevTools. |
| **Query invalidation scope** | Low | Broad `['training']` invalidation can refetch more than needed; consider more targeted keys where possible. |
| **New Architecture** | Low | Expo 54 + `newArchEnabled: true` – aligned with future direction. Run `npx expo-doctor@latest` periodically. |

### 2.2 Health Data & Privacy

| Risk | Severity | Notes |
|------|----------|-------|
| **Supabase RLS** | High | Ensure Row Level Security restricts all health tables by `user_id`. Audit `training_*`, `sleep_sessions`, `mood_*`, `med_*`. |
| **Local storage** | Medium | AsyncStorage for intents, routine state; SecureStore for tokens. Ensure no PII in AsyncStorage logs. |
| **Offline queue** | Medium | Training/med offline queues – confirm idempotency and conflict handling on sync. |
| **Telemetry** | Low | Docs say no personal content in logs; verify logger/logSanitizer behavior. |

### 2.3 Platform-Specific

| Risk | Severity | Notes |
|------|----------|-------|
| **Health Connect** | Medium | Android 14+ contract fix plugins in use; test on 14+ devices. |
| **Background timers** | Medium | Rest timer and prep use scheduled notifications; validate behavior when app is killed. |
| **Wear OS** | Low | Wearables projection exists; ensure notifications surface correctly on watch. |

### 2.4 Dependency & Version

| Risk | Severity | Notes |
|------|----------|-------|
| **React 19** | Low | Newer; watch for compatibility issues with third-party libs. |
| **Expo 54** | Low | Current; plan migration path for SDK 55 (New Arch mandatory). |
| **react-native-health vs health-connect** | Low | Multiple health SDKs; ensure no conflicts or duplicate permission flows. |

---

## 3. Potential Risks

### 3.1 Store Rejection

- **Google Play** – Rejection likely if:
  - Health apps declaration not completed
  - Privacy policy missing or not publicly accessible
  - Medical disclaimer absent
  - Misleading or harmful health claims
  - Unnecessary health permissions requested

- **Apple** – Rejection likely if:
  - Health data usage descriptions missing or inaccurate
  - Privacy Nutrition Labels incomplete
  - Required sign-in without alternative (e.g. social-only)
  - Forced permission gates (e.g. notifications) for core features (Guideline 5.1.2)

### 3.2 Regulatory

- **Not a medical device** – Reclaim appears to be a wellness/self-management app. Avoid language that suggests diagnosis, treatment, or cure.
- **Medication data** – Storing med schedules and logs may be sensitive; ensure clear consent and secure handling.
- **Mental health** – Mood tracking and “insights” should be framed as supportive, not diagnostic.

### 3.3 Operational

- **Supabase** – Confirm backups, retention, and disaster recovery.
- **EAS Updates** – OTA updates enabled; ensure version compatibility and rollback plan.
- **Expo Go** – Some native modules (health, etc.) require dev builds; document for contributors.

---

## 4. How to Fix Things

### 4.1 TypeScript Fixes (Priority 1)

1. **GuidedPrepScreen** – Check expo-notifications v0.32 types. `channelId` may belong in Android-specific options. If types are wrong, add a type assertion or update `@types/expo__notifications`.
2. **sleepConsolidation** – Change line 41 to: `return score + (SOURCE_PRIORITY[s.source] ?? 0);`
3. **sync.ts** – Add to `SyncDebugInfo`: `sleepPipelineWritten?: number`, `sleepPipelineSkipped?: number`, `sleepSupersededDeleted?: number`. Add `'pipeline_error'` to `SleepSyncStatus`.

### 4.2 Store Compliance (Priority 1)

1. Create and publish a privacy policy (e.g. on website or Notion).
2. Add in-app link to privacy policy (Settings, Data & Privacy, About).
3. Add medical disclaimer to store listing and in-app.
4. Add “Consult a healthcare professional for medical advice” reminder in Meds, Mood, Insights.
5. Complete Google Health apps declaration form.
6. Complete Apple Privacy Nutrition Labels.

### 4.3 Code Quality (Priority 2)

1. Refactor Dashboard into smaller components (e.g. `DashboardHero`, `DashboardInsight`, `DashboardExercise`, `DashboardSleep`).
2. Add error boundaries around major screens.
3. Add E2E tests for critical flows (auth, sync, training, meds).
4. Run `expo-doctor` and fix compatibility issues.

---

## 5. Will Google and Apple Accept This?

### 5.1 Google Play – Likely Yes, With Fixes

**Strengths:**
- Health integration is core to the app (sleep, mood, meds, exercise).
- Data & Privacy screen with export/delete.
- Med catalog includes “Educational only. Not medical advice” style notes.
- No obvious misleading health claims.

**Required before submission:**
- Health apps declaration form
- Public privacy policy URL
- Medical disclaimer in listing and in-app
- Healthcare professional reminder
- Permission rationale for each health permission

### 5.2 Apple App Store – Likely Yes, With Fixes

**Strengths:**
- HealthKit usage descriptions present.
- Supabase + SecureStore for sensitive data.
- No obvious forced tracking or unnecessary permission gates.

**Required before submission:**
- Privacy Nutrition Labels
- Confirm usage descriptions match behavior
- If social login only: add alternative (e.g. email/password)

### 5.3 If Rejected – Common Causes

- Incomplete privacy disclosures
- Missing or vague medical disclaimer
- Health permissions requested without clear in-app justification
- Crashes or major bugs on review devices
- Broken or placeholder features (e.g. PDF export “coming soon”)

---

## 6. Differential Features vs. Other Apps

### 6.1 Reclaim’s Unique Position

| Feature | Reclaim | Typical Competitors |
|---------|---------|---------------------|
| **Brain/neuroscience framing** | LifecycleHero, brain regions, “Motor cortex • Dopamine” | Generic wellness or meditation focus |
| **Multi-pillar integration** | Sleep + Mood + Meds + Exercise in one place | Single-pillar (sleep-only, mood-only) or narrow integration |
| **Scientific insights** | Evidence-based insights, rotation, context-aware | Generic tips or no insights |
| **Recovery staging** | Foundation/building/steady stages | Linear progress or none |
| **Calendar awareness** | Schedule overlay, routine suggestions, busy blocks | Little or no calendar integration |
| **Training/exercise** | Program-based, watch notifications, rest timer | Often separate apps or basic logging |
| **Offline-first** | Training offline queue, med dose queue | Usually online-only |
| **Health data aggregation** | HealthKit, Health Connect, Google Fit | Often single platform |

### 6.2 Gaps vs. Competitors

- **Guided content** – No built-in meditation/mindfulness audio (Mindfulness screen links out).
- **Clinical integration** – No therapist or clinician matching.
- **Wearables** – Projection layer exists; polish for watch UX.
- **Localization** – Single language assumed.
- **Accessibility** – Reduce-motion and basic a11y; needs audit (VoiceOver, TalkBack, contrast).

---

## 7. How to Leap Ahead of Competition

### 7.1 Short-Term (Next 3–6 Months)

1. **Correlation insights** – “Sleep &lt; 6h → mood down 20%” style insights from combined data.
2. **Actionable nudges** – “You usually feel better after a walk; schedule one?” based on patterns.
3. **Wearable polish** – Reliable watch notifications, glanceable “next action” on Wear OS.
4. **PDF export** – Replace stub with real PDF report for clinicians.
5. **Accessibility pass** – Labels, contrast, screen reader support.

### 7.2 Medium-Term (6–12 Months)

1. **Research backing** – Publish or cite studies on sleep–mood–medication correlations.
2. **Clinician view** – Optional read-only dashboard for care providers (with consent).
3. **Predictive suggestions** – “Based on your patterns, you may want to prepare for a low-energy day.”
4. **Integrations** – Oura, Whoop, Garmin for richer sleep/activity data.
5. **Localization** – Spanish, etc., for broader adoption.

### 7.3 Long-Term (12+ Months)

1. **Personalized programs** – Adaptive plans based on goals and progress.
2. **Community/support** – Optional peer or group features (with strict privacy).
3. **Device-agnostic** – Web dashboard, possibly desktop companion.
4. **Evidence generation** – Contribute to research via opt-in, anonymized datasets.

---

## 8. Additional Improvements for Adoption

### 8.1 Onboarding & Activation

- **Faster time-to-value** – Show a “Quick win” (e.g. first mood log, first sync) within first session.
- **Progressive permission** – Request health access when first needed, not all at once.
- **Demo/tour mode** – Let users explore with sample data before connecting real sources.
- **Personalization** – Early questions to tailor dashboard and suggestions.

### 8.2 Engagement

- **Streaks & milestones** – Extend beyond mood (e.g. consistency streaks).
- **Gentle reminders** – Non-intrusive prompts for check-ins.
- **Weekly digest** – “Your week in review” summary.
- **Goals** – User-defined goals (sleep, mood, exercise) with progress.

### 8.3 Trust & Safety

- **Crisis resources** – Prominent link to crisis helplines (e.g. 988) for mental health contexts.
- **Data transparency** – “What we store” and “What we don’t” in plain language.
- **Export improvements** – Easier CSV/PDF for sharing with clinicians.
- **Audit log** – Optional log of data access and exports.

### 8.4 Technical

- **Crash reporting** – Sentry or similar for production monitoring.
- **Analytics (privacy-preserving)** – Feature usage without PII for product decisions.
- **Performance monitoring** – Frame drops, slow screens, network errors.
- **A/B testing** – For onboarding and key flows.

---

## 9. Summary Checklist

### Must Fix (Launch Blockers)

- [ ] Resolve 6 TypeScript errors
- [ ] Add medical disclaimer (store + in-app)
- [ ] Add healthcare professional reminder
- [ ] Publish privacy policy and add link in-app
- [ ] Complete Google Health apps declaration
- [ ] Complete Apple Privacy Nutrition Labels

### Should Fix (Quality)

- [ ] Refactor Dashboard into smaller components
- [ ] Add error boundaries
- [ ] Accessibility audit
- [ ] End-to-end tests for critical paths

### Nice to Have (Post-Launch)

- [ ] Correlation insights
- [ ] PDF export (replace stub)
- [ ] Crisis resources link
- [ ] Crash reporting
- [ ] Localization

---

*Audit completed January 2025. Re-validate against current store policies and SDK versions before submission.*
