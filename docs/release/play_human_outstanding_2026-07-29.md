# Play submit — Human outstanding checklist (2026-07-29)

**Branch tip:** `763aa06` on `fix/training-confident-ux`  
**Preview EAS:** Android **APK** profile `preview` (device smoke).  
**Play upload binary:** later **production AAB** profile `production` — different artifact.

---

## Already done by agent

- [x] Device-feedback U1–U5 committed + pushed (`763aa06`)
- [x] EAS preview APK build kicked off (see Expo dashboard / build URL from CLI)
- [x] Listing short + full copy rewritten (pull + Option A aligned) → `docs/release/play-store/LISTING_DRAFT.md`
- [x] Feature graphic confirmed **1024×500** → `docs/release/play-store/feature-graphic-1024x500.png`
- [x] HC permission table draft ready → `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md`
- [x] Exact-alarm declaration draft ready → `docs/release/play_schedule_exact_alarm_declaration_2026-07-27.md`
- [x] Code/manifest alignment spot-check:
  - HC: sleep, HR, SpO2, RR, body temp, steps, active calories, write exercise
  - FGS: `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH` + `ACTIVITY_RECOGNITION`
  - Exact: `SCHEDULE_EXACT_ALARM` present; **no** `USE_EXACT_ALARM`
  - Privacy URL: `https://reclaim.fissioncorporation.com/privacy`

---

## Blocked without Human

### 1. Google Play Console login
Agent browsers hit **Google sign-in** — no active Console session in automation.  
**You:** open Console in your normal browser (or complete sign-in in the agent browser when prompted).

### 2. Install preview APK + smoke (before publish)
When the EAS build finishes, install the **preview APK** and verify:

| # | Smoke | Pass? |
|---|-------|-------|
| 1 | Med reminder **Taken** on lock / Wear logs dose | |
| 2 | Sleep history still visible after scroll / return | |
| 3 | Human form: squat ≠ arm swing; press reads as press | |
| 4 | Signal convergence: X dates; lines stay inside card | |
| 5 | Mindfulness nudge **Start** without unlock → session + Done | |
| 6 | Meditation reminder **Start** without unlock → session active | |
| 7 | Guided rest-end with Alarms OFF (FGS path) and ON | |

### 3. Store listing paste (you click Save)
From `LISTING_DRAFT.md`:
- Short description  
- Full description  
- Feature graphic upload  
- Phone screenshots (`phone/*-play.png`) — blur PII if needed  
- Tablet 7" + 10" packs  

### 4. Declarations paste (match production AAB)
- Health Connect purposes — OQ-1 draft table  
- Data safety — steps = inactivity gate; active calories = post-session only  
- `SCHEDULE_EXACT_ALARM` — workout rest timing only  
- Foreground service / health — guided + mindfulness/meditation session keep-alive  

### 5. Production AAB (Play track upload)
Preview APK is **not** what you submit for production review. When smoke passes:
```bash
cd app
npx eas-cli build --platform android --profile production --non-interactive
```
Then upload that **AAB** to Internal testing / Production draft. Only then consider Publishing overview.

### 6. Do not press
- **Send for review / Publish** until: smoke ✅ · listing ✅ · HC/Data safety ✅ · production AAB attached ✅ · privacy URL loads ✅

---

## Optional polish (not blockers for Internal testing)

- Re-capture phone screenshots on the new preview APK (current framed set is 2026-07-27)
- Prefer BINAXIS art for feature graphic if you want brand punch (must stay 1024×500; no unverifiable claims on the art)
- Export Console forms after save to `docs/memory/raw/play-console/` for the audit trail
