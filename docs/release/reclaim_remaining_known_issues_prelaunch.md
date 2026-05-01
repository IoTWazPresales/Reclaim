# Reclaim — remaining known issues (prelaunch, post Phases 6–10)

**Date:** 2026-04-22  
**Context:** Code-side Phases 6–9 shipped on `reclaim/engineering-remediation-e1-e6`; Phase 10 updated release verification docs. This list is **not** a full product audit — it captures **explicitly deferred** or **environment-dependent** items.

## Still blocking or risky for store submission

1. **Manual Play Console work** — HC declaration rows, Data Safety form, listing/screenshot parity (unchanged from `reclaim_release_verification_report.md`).
2. **Legacy health docs** — `HEALTH_FIXES_SUMMARY.md` / `HEALTH_INTEGRATION_DIAGNOSIS.md` may still contradict HC-only Android posture until edited or quarantined.
3. **Device-only verification** — Notification cancel/schedule behavior under denied/revoked OS permission; Health Connect merged manifest on a real **preview APK**.

## Non-blocking / quality follow-ups

- ESLint **unused eslint-disable** warnings in a handful of screens (cosmetic cleanup).
- **EAS preview** — 2026-04-22 run: `npx eas build --profile preview --platform android --non-interactive` **started** build `144e2267-106b-490c-9471-afe4b7cf846f` (see Expo dashboard for **finished** vs **failed**). CI should supply `EXPO_TOKEN` for unattended builds.

## Intentionally not changed in Phases 7–10

- Broad dashboard layout / hero orchestration beyond the two state tiles.
- New sleep or mood inference beyond existing correlation helpers.
- Production AAB / Play submission automation.
