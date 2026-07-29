# Play Store listing draft — Reclaim (Option A)

**Updated:** 2026-07-29  
**App:** `com.fissioncorporation.reclaim`  
**Git tip for this pack:** `763aa06` (`fix/training-confident-ux`)  
**Rule:** Match shipping Health Connect surface — sleep + overnight vitals + heart rate; **Steps** only for optional elevated-HR inactivity gate; **Active calories** only for post-session workout-window read-back. No RHR / HRV / total calories / Google Fit / clinical claims.

---

## App name
Reclaim

## Short description (≤80 chars) — **paste this**

See patterns across mood, sleep, training & meds — act today.

*(76 chars)*

**Alts (if Console rejects tone):**
- Daily clarity for mood, sleep, guided training & meds. *(63)*
- Mood, sleep, training & med insights — not medical advice. *(59)*

## Full description — **paste this**

Most wellness apps drown you in charts. Reclaim does the opposite: it pulls mood, sleep, training, and medications into one honest picture — then points to a next step you can actually take today.

**Built for the day you are in**
• A home signal that surfaces what matters now — not a dashboard of everything  
• Mood check-ins that get more useful the more you use them  
• Sleep context from Health Connect when you allow it (including overnight vitals the app can show)  
• Guided training with phone + watch walk-through, set by set, including lock-screen Done  
• Medication logging with educational insights — not a drug encyclopedia or clinical advice  
• Optional mindfulness resets when your day needs a pause  

**Health Connect on Android (clear and narrow)**
When you connect Health Connect, Reclaim may read:
• Sleep and selected overnight vitals shown in the app  
• Heart rate for optional mindfulness context  
• Steps — only to avoid noisy elevated-heart-rate nudges while you are clearly active  
• Active calories — only as a post-workout window read-back after a training session you started in Reclaim  

Reclaim can also write an exercise session to Health Connect when you finish guided training.

Reclaim is **not** a step counter, calorie goal tracker, or clinical heart monitor. It does not request resting heart rate, HRV, or total calories from Health Connect.

**Important**
Reclaim is a wellness and education app. It is not a medical device and does not diagnose, treat, or replace care from a qualified professional. Medication content is educational only. If you are in crisis, contact local emergency services or a trusted crisis line.

Privacy: https://reclaim.fissioncorporation.com/privacy

---

## Why this copy (for reviewers / yourself)

| Claim in listing | Backed by product? |
|------------------|--------------------|
| Home signal / patterns | Yes — insights + signal convergence |
| Sleep + overnight vitals via HC | Yes — Option A |
| Guided training + lock/watch Done | Yes — FGS + durable actions |
| Meds educational | Yes — catalogue + insights; no clinical advice |
| Steps = inactivity gate only | Yes — HR nudge path |
| Active calories = post-session read-back | Yes |
| No RHR/HRV/total calories | Yes — not in plugin |

---

## Graphics pack (this folder)

| Asset | Path | Status |
|-------|------|--------|
| Phone screenshots | `phone/*-play.png` | 1080×1920 framed — **2026-07-27 QA** (pre-`763aa06`; re-capture after preview smoke if UI changed) |
| Feature graphic | `feature-graphic-1024x500.png` | **Verified 1024×500** — ready to upload |
| Tablet 7 / 10 | `tablet-7/`, `tablet-10/` | Present (4 each) |
| Frame script | `frame-play-shots.cjs` | Re-run after new raws |

### Suggested upload order (phone)
1. `01-home-play.png` — daily signal  
2. `02-mood-play.png` — mood + insight  
3. `03-sleep-play.png` — sleep / circadian  
4. `04-training-play.png` — Today plan  
5. `05-guided-preview-play.png` — Guided preview  
6. `06-mindfulness-play.png` — resets  
7. `07-meds-play.png` — meds education  

**Note:** Home may show a real account/med name — blur before upload if you do not want that public. Prefer screenshots from a demo account.

---

## Console checklist (agent-prepped)

- [x] Short + full description rewritten for pull + Option A honesty (this file)  
- [x] Feature graphic dimensions verified 1024×500  
- [ ] Human: paste short + full into Store listing (replace prior draft if still the flatter 2026-07-27 text)  
- [ ] Human: upload phone + tablet graphics  
- [ ] Human: paste HC + Data safety from `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md`  
- [ ] Human: paste exact-alarm justification from `docs/release/play_schedule_exact_alarm_declaration_2026-07-27.md`  
- [ ] Human: attach **production AAB** (not the preview APK) before Publishing overview  
- [ ] Do **not** send Publishing overview for review until production AAB + declarations match  
