# Play submit — Human outstanding checklist (2026-07-30)

**Branch:** `fix/training-confident-ux`  
**Preview EAS (APK):** https://expo.dev/accounts/eliasonw/projects/reclaim-app/builds/053faaab-b9ae-4355-9696-908e327dd6fb  
**Production AAB:** rebuild after privacy URL restore (canceled prior build `a214bca8…` which baked dead fission host)

---

## Already done by agent

- [x] Device-feedback U1–U5 committed + pushed
- [x] Convergence clip/axes + Analytics “Coming soon” (`2ce7c71`)
- [x] EAS **preview APK** build queued (link above)
- [x] Listing short + full rewritten → `docs/release/play-store/LISTING_DRAFT.md`
- [x] **Pasted into Play Console** Default store listing (en-ZA)
- [x] Feature graphic on listing (repo file verified **1024×500**)
- [x] HC + Data safety paste draft → `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md`
- [x] Exact-alarm paste draft → `docs/release/play_schedule_exact_alarm_declaration_2026-07-27.md`
- [x] Manifest alignment: HC Option A · FGS health · `ACTIVITY_RECOGNITION` · `SCHEDULE_EXACT_ALARM` · **no** `USE_EXACT_ALARM`
- [x] **Privacy URL restored to GitHub** (live **200**): `https://github.com/IoTWazPresales/Reclaim/blob/work/PRIVACY.md`  
  — replaced broken `https://reclaim.fissioncorporation.com/privacy` in `storeCompliance.ts` + listing draft + Console full description

---

## Outstanding

### 1. Install preview APK + smoke (blocker for publish)
| # | Smoke |
|---|-------|
| 1 | Med **Taken** on lock / Wear logs dose |
| 2 | Sleep history survives scroll / leave / return |
| 3 | Human form: squat ≠ arm swing; press reads as press |
| 4 | Convergence: X dates; lines stay inside card |
| 5 | Mindfulness **Start** without unlock → Done works |
| 6 | Meditation **Start** without unlock → session active |
| 7 | Guided rest-end with Alarms OFF and ON |

### 2. Store listing graphics
- Newest framed assets in repo are **2026-07-27** (`docs/release/play-store/phone/*-play.png`, `tablet-7/`, `tablet-10/`) — **no newer pack** after chart/Analytics yet
- [ ] Confirm Console phone shots match Jul 27 pack (re-upload if older)
- [ ] Upload **7-inch + 10-inch tablet** packs — still required / empty
- [ ] Optionally refresh phone shots after smoke if UI changed (blur real names/meds)

### 3. Declarations (paste from docs — match production AAB)
- [ ] Health Connect purposes — OQ-1 table
- [ ] Data safety — steps = inactivity gate; active calories = post-session only
- [ ] `SCHEDULE_EXACT_ALARM` — guided rest timing only
- [ ] FGS / health — open training + mindfulness/meditation session keep-alive
- [ ] **App content → Privacy policy** URL must be the GitHub link above (not fission)

### 4. Production AAB
Canceled build that used dead privacy host. After privacy commit is pushed:
```bash
cd app
npx eas-cli build --platform android --profile production
```
Upload that **AAB** to Internal testing (then Production draft).

### 5. Do not press yet
- **Send for review / Publish** until: smoke ✅ · tablets ✅ · HC/Data safety ✅ · production AAB attached ✅ · privacy URL loads ✅

### 6. Optional audit trail
Export Console forms after saves to `docs/memory/raw/play-console/`.
