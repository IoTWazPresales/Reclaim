# Reclaim — Device QA & Play Listing Workflow

**Purpose:** Repeatable full-app verification on a **physical Android device**, with screenshot capture for **Google Play**, defect triage, and fix-or-backlog rules.

**Companion docs:**
- `docs/audits/final-walkthrough.md` — phase-level device checklist (notifications, progression, HC, etc.)
- `docs/audits/FINAL_FINAL_PASS_RESULTS.md` — what shipped on `feat/final-final-pass`
- `app/.maestro/smoke.yaml` — minimal launch + screenshot flow

---

## 1. What this workflow covers

| Lane | What it proves | Who runs it |
|------|----------------|-------------|
| **L0 — Automated** | Types, unit/integration tests, training audit | Agent / CI (`npm run typecheck`, `vitest`, `audit:training-dual-paths`) |
| **L1 — Maestro** | Cold launch, tab navigation smoke, scripted screenshots | Agent (if Maestro + adb installed) |
| **L2 — Manual device** | Health Connect, notifications (lock screen), haptics, real sync, first-visit coaches | Agent + you (unlock / OAuth when needed) |
| **L3 — Play assets** | Curated screenshots + optional feature graphic frames | Agent captures → you approve for Console |

**Out of scope for a single pass (backlog unless you explicitly schedule):**
- iOS device parity
- Wear OS / home widgets (deferred in walkthrough)
- Production Play Console form edits
- Load / soak testing at scale

---

## 2. Environment prerequisites (Windows + local phone)

### Required on the dev machine

| Tool | Purpose | Check |
|------|---------|--------|
| **Android platform-tools (`adb`)** | Device connection, `screencap`, install APK | `adb devices` shows your phone **authorized** |
| **Maestro** (optional L1) | Scripted taps + `takeScreenshot` | `maestro --version` |
| **Node + app deps** | Build / Metro | `cd app && npm ci` |
| **Expo dev client or release APK** | App under test | Same **runtimeVersion** / channel as branch under test |

> **Current gap (2026-07-04):** `adb` was **not** on PATH in the agent shell. Add Android SDK `platform-tools` to PATH or invoke via full path before device runs.

### Required on the phone

- USB debugging **or** wireless debugging paired
- Reclaim dev client / preview build installed (`com.fissioncorporation.reclaim`)
- **OTA check** (from `final-walkthrough.md`): runtimeVersion **1.0.3**, correct EAS channel, force-close twice after `eas update` if testing OTA

### Auth policy (no “secret bypass”)

| Approach | When to use |
|----------|-------------|
| **Already signed in** on device | Fastest — preferred for regression |
| **Dedicated QA Supabase user** | Email/password or magic link; credentials in **your** password manager — agent asks you to complete OAuth on device when prompted |
| **Fresh install path** | Full onboarding + first-visit coaches; needs clean app data or new install |

The agent will **not** disable auth, commit `.env` secrets, or ship backdoor login code. If login blocks automation, you tap through once; Maestro resumes after session exists.

---

## 3. Artifact layout (every run)

```
docs/audits/device-runs/YYYY-MM-DD_<branch>/
  RUN.md                 # session log (build, channel, device, tester)
  automated/             # L0 command output snippets
  maestro/               # L1 PNGs from takeScreenshot
  manual/                # L2 per-screen PNGs (adb or device buttons)
  play-store/            # L3 curated 1080×1920 (or device native) exports
  defects.md             # triage table (see §6)
```

Naming: `NN_<screen>_<state>.png` e.g. `03_mood_checkin_filled.png`.

---

## 4. Session protocol (agent)

### Phase A — Preflight (15 min)

1. Record branch, commit SHA, `runtimeVersion`, EAS channel.
2. Run **L0**: `npx tsc --noEmit`, `npx vitest run --reporter=dot`, `npm run audit:training-dual-paths`.
3. Confirm `adb devices` + app package installed.
4. Confirm login state (or schedule fresh-install run).
5. Create `device-runs/.../RUN.md`.

### Phase B — Smoke (30 min)

1. Cold launch → no redbox / crash.
2. Bottom tabs: Home, Mood, Sleep, Training, Meds, More (or current nav map).
3. One **read** action per major surface (no destructive deletes).

### Phase C — Feature matrix (2–4 h)

Work **in order** below. For each row: navigate → exercise primary action → capture screenshot → note pass/fail.

| ID | Surface | Primary action | Screenshot target | Walkthrough ref |
|----|---------|----------------|-------------------|-----------------|
| H01 | Home | Open daily signal / state tiles | `play-store/01_home_daily_signal.png` | Final pass P1–P3 |
| H02 | Home | Streaks card visible (non-zero or zero state) | `02_home_streaks.png` | P2 |
| M01 | Mood | Log check-in 7/10 + tag | `03_mood_checkin.png` | P10 history |
| M02 | Mood | History sparkline tap → row flash | `04_mood_history.png` | P10 |
| S01 | Sleep | Hero + confidence pill | `05_sleep_hero.png` | P4 |
| S02 | Sleep | Last night / trends scroll | `06_sleep_trends.png` | P4 |
| T01 | Training | Session preview modal (no clip) | `07_training_preview.png` | P8 |
| T02 | Training | Exercise `?` guidance modal | `08_training_guidance.png` | P8 |
| T03 | Training | Guided lock-screen set (optional) | `manual/training_lockscreen.png` | walkthrough §2 |
| MD1 | Meds | Expand mid-list med → scroll in place | `09_meds_detail.png` | P9 |
| MF1 | Mindfulness | BreathOrb tap → short exercise | `10_mindfulness_orb.png` | P7 |
| MD2 | Meditation | Auto hero + practice picker | `11_meditation.png` | P6 |
| A01 | Analytics | How you compare (≥7d data) | `12_analytics_compare.png` | P5 |
| O01 | Onboarding | Capabilities interactive slides | `manual/onboarding_*.png` | P11 |
| C01 | Coaches | First visit dismiss + persist | `manual/coach_*.png` | P11 |

**Data:** For Analytics / population bands / mood history groups, use an account with **≥7 days** of mood + sleep or seed via normal logging (no DB hacks without approval).

### Phase D — Play Store pack (30 min)

Google Play phone screenshots: **2–8** images, portrait **9:16** recommended (e.g. 1080×1920). Pick the best from Phase C; crop status bar consistently; **no personal health identifiers** in listing shots (use QA account or blur).

Optional: feature graphic 1024×500 (manual design export — not automated).

### Phase E — Closeout

1. Update `defects.md` with severities.
2. Fix **P0/P1** in-branch (see §6) or file backlog items.
3. Re-run affected L0 tests + spot-check on device.
4. Update `RUN.md` with pass/fail summary.

---

## 5. Tool commands (reference)

```powershell
# L0
cd app
npm run typecheck
npx vitest run --reporter=dot
npm run audit:training-dual-paths

# L1 — Maestro (from repo root)
maestro test app/.maestro/smoke.yaml

# L2 — adb screenshot (device connected)
adb exec-out screencap -p > docs/audits/device-runs/YYYY-MM-DD/manual/screen.png

# Install dev build (example)
cd app
npx expo run:android
```

**Maestro expansion (recommended):** add flows under `app/.maestro/` per tab (`mood-checkin.yaml`, `training-preview.yaml`) using `takeScreenshot` after each `tapOn` / `assertVisible`.

---

## 6. Defect triage — fix here vs backlog

| Severity | Definition | Agent action |
|----------|------------|--------------|
| **P0** | Crash, data loss, auth loop, wrong medical/crisis copy | Fix in current branch; L0 + device retest |
| **P1** | Broken primary flow, layout clip, scroll bug, missing coach | Fix if root cause is **localized** (one screen, clear repro) |
| **P2** | Visual polish, copy tweak, edge case | Fix if ≤30 min; else backlog |
| **P3** | Nice-to-have | Backlog only |

### Escalate to backlog (+ stronger model) when:

- Repro spans **3+ layers** (notification + DB + lock screen + HC)
- **Native** Android permission / Health Connect declaration mismatch
- **Flaky** timing (notifications, background fetch) needing multi-hour device soak
- Fix would touch **frozen invariants** (med catalogue, sync keys, phase-gated med rebuild) without explicit approval
- Two fix attempts failed with **new** regressions in L0

**Backlog entry template** (`defects.md`):

```markdown
### DEF-YYYYMMDD-NN
- **Severity:** P1
- **Surface:** Training / lock screen
- **Repro:** …
- **Expected / Actual:** …
- **Screenshot:** manual/….
- **Fix owner:** Composer | Opus/Fable (reason: native notification race)
- **Blocked by:** …
```

---

## 7. Agent limitations (honest)

| Can do | Cannot do reliably |
|--------|---------------------|
| L0 tests, Maestro if toolchain present | Drive your phone without adb/Maestro |
| `adb screencap` when device connected | Google Play Console upload |
| Fix P0/P1 with vitest guardrails | Prove HC/notification timing without device |
| Curate Play screenshots from captures | Replace professional marketing design |

**Browser automation** (`cursor-ide-browser`) does **not** substitute for the native app — web build lacks HC, notifications, and most native modules.

---

## 8. Exit criteria (“full pass done”)

- [ ] L0 green on branch under test
- [ ] Feature matrix ≥ **90%** rows pass (document waivers)
- [ ] **8** Play-ready screenshots in `play-store/` (or documented substitute set)
- [ ] `final-walkthrough.md` device items **1–9** attempted; failures in `defects.md`
- [ ] No open **P0**; **P1** either fixed or backlog with owner
- [ ] `RUN.md` committed or attached to PR (screenshots optional in git — prefer CI artifact or Drive if large)

---

## 9. Next step

When you say **“run the device QA”**, the agent will:

1. Verify toolchain (`adb`, device, app build).
2. Create `docs/audits/device-runs/<today>_feat-final-final-pass/`.
3. Execute §4 Phases A→E.
4. Fix P0/P1 in-branch or populate backlog per §6.

**You may need to:** unlock the phone, complete login once, grant HC/notification permissions when prompted.
