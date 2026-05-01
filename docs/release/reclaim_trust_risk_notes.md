# Reclaim — trust & disclosure risk notes (Play-focused)

**Method:** Repo evidence only; **Inference** labeled where not proven line-by-line.

---

## User trust risks

| Risk | Evidence | Severity | Mitigation (audit-level) |
|------|----------|----------|---------------------------|
| **Health data expectations** | Rich sleep vitals + insights + notifications | Medium | Disclaimers in `storeCompliance.ts` + `HealthDisclaimerModal`; ensure **listing** does not imply diagnosis |
| **Cross-platform parity** | Android HC has no resting-HR series; iOS does | Medium | Avoid “recovery score” language that implies RHR on Android unless copy is scoped |
| **Partial HC grants** | Connect verifies sleep metrics only for “connected” state | Low–Medium | User might think all vitals sync when only sleep granted **Inference** |

---

## Privacy / copy risks

| Risk | Evidence | Severity | Notes |
|------|----------|----------|-------|
| **Privacy policy URL** | `PRIVACY_POLICY_URL` in `storeCompliance.ts`; **OQ-4** | **High** if URL wrong | Must be live, non-geofenced per comments |
| **Remote logging** | `telemetry.ts` inserts `app_logs` with `user_id` | **Medium** | Must match Data safety “account / user id” collection |
| **Log sanitization** | `logSanitizer.ts` redacts key patterns (email, token, etc.) | **Medium** | **Inference:** not every `logTelemetry` call audited here — risk of noisy properties |
| **Third-party naming** | Phase audits mention “Supabase” in copy | Low–Medium | Neutral vendor wording preferred in **user-facing** privacy text |

---

## Medical-adjacent wording risks

| Risk | Evidence | Severity | Notes |
|------|----------|----------|-------|
| **Non-device disclaimer** | `MEDICAL_DISCLAIMER`, `HEALTHCARE_REMINDER` | Low if consistent | **Open:** legal sign-off **OQ-7** |
| **Evidence / citations screens** | `EvidenceNotesScreen` referenced in policy audit | Medium | Peer-reviewed framing must stay non-clinical |
| **Insight rules** | `InsightEngine.ts` + `insights.json` | Medium | Wording should avoid treatment claims **Inference** spot-check for store |

---

## Background behavior risks

| Risk | Evidence | Severity | Notes |
|------|----------|----------|-------|
| **Background health sync** | `backgroundSync.ts`, `TaskManager` | Medium | Play may expect battery/data disclosure in listing if aggressive |
| **Notification scheduling** | Multiple schedulers + training tasks | Low–Medium | Align with POST_NOTIFICATIONS declaration |

---

## Telemetry / storage disclosure risks

| Risk | Evidence | Severity | Notes |
|------|----------|----------|-------|
| **PII in `properties`** | `sanitizeLogPayload` | Medium | Keys matching `/email/i` redact **values** pattern-based — verify edge cases |
| **Sentry** | `app.config.ts` Sentry plugin | Medium | Separate from `app_logs`; needs Data safety row **Inference** |
| **Supabase session** | `telemetry.ts` uses `supabase.auth.getUser()` | Low | `user_id` nullable — still a linkage if present |

---

## Sensitive health reads — trust angle (not duplicate of HC matrix)

- Showing **SpO2 / RR / temperature** on Sleep increases **user** trust but also raises **reviewer** scrutiny — justify as **sleep context**, not standalone clinical vitals.
- **HR notifications** without clear opt-out in **this audit pass** — controls live under **Mindfulness** (`useHealthTriggers`) **Inference**; ensure onboarding or settings visibility is acceptable for policy.

---

*Pair with `reclaim_permission_justification_matrix.md` and `reclaim_play_blocker_matrix.md`.*
