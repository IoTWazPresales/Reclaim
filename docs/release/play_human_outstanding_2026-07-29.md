# Play submit — Human outstanding checklist (2026-07-29)

**Code tip:** `763aa06` · **Docs tip:** `e669632` on `fix/training-confident-ux`  
**Preview EAS (APK):** https://expo.dev/accounts/eliasonw/projects/reclaim-app/builds/053faaab-b9ae-4355-9696-908e327dd6fb  
**Play production upload:** later **AAB** via `eas build --profile production` — different artifact than preview APK.

---

## Already done by agent

- [x] Device-feedback U1–U5 committed + pushed
- [x] EAS **preview APK** build queued (link above)
- [x] Listing short + full rewritten for pull + Option A honesty → `docs/release/play-store/LISTING_DRAFT.md`
- [x] **Pasted into Play Console** Default store listing (en-ZA) and **Save as draft** — Console shows **Draft changes**
- [x] Feature graphic on listing (repo file verified **1024×500**)
- [x] Phone screenshots already on listing (8) — may still be pre-`763aa06` UI
- [x] HC + Data safety paste draft → `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md`
- [x] Exact-alarm paste draft → `docs/release/play_schedule_exact_alarm_declaration_2026-07-27.md`
- [x] Manifest alignment: HC Option A set · FGS health · `ACTIVITY_RECOGNITION` · `SCHEDULE_EXACT_ALARM` · **no** `USE_EXACT_ALARM`
- [x] Privacy URL in listing: `https://reclaim.fissioncorporation.com/privacy`

---

## Outstanding on your side

### 1. Install preview APK + smoke (blocker for publish)
When build finishes, install and check:

| # | Smoke |
|---|-------|
| 1 | Med **Taken** on lock / Wear logs dose |
| 2 | Sleep history survives scroll / leave / return |
| 3 | Human form: squat ≠ arm swing; press reads as press |
| 4 | Convergence: X dates; lines stay inside card |
| 5 | Mindfulness **Start** without unlock → Done works |
| 6 | Meditation **Start** without unlock → session active |
| 7 | Guided rest-end with Alarms OFF and ON |

### 2. Store listing graphics (Console draft text is done)
- [ ] Upload **7-inch + 10-inch tablet** packs (`docs/release/play-store/tablet-7/`, `tablet-10/`) — Console still empty / required
- [ ] Optionally replace phone shots after smoke if UI changed (blur real names/meds)
- [ ] Optionally swap feature graphic for BINAXIS art (must stay 1024×500; no unverifiable claims on art)

### 3. Declarations (paste from docs — match production AAB)
- [ ] Health Connect purposes — OQ-1 table
- [ ] Data safety — steps = inactivity gate; active calories = post-session only
- [ ] `SCHEDULE_EXACT_ALARM` — guided rest timing only
- [ ] FGS / health — open training + mindfulness/meditation session keep-alive

### 4. Production AAB for Play tracks
Preview APK is **smoke only**. After smoke passes:
```bash
cd app
npx eas-cli build --platform android --profile production --non-interactive
```
Upload that **AAB** to Internal testing (then Production draft).

### 5. Do not press yet
- **Send for review / Publish** until: smoke ✅ · tablets ✅ · HC/Data safety ✅ · production AAB attached ✅ · privacy URL loads in a browser ✅

### 6. Optional audit trail
Export Console forms after saves to `docs/memory/raw/play-console/`.
