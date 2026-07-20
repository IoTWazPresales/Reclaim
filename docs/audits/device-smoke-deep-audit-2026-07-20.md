# Device smoke deep audit — 2026-07-20 (read-only)

**Branch:** `fix/training-confident-ux` @ `7639c35` (pushed)  
**Consultant:** Fable requested → **credits exhausted**; Opus CONSULT READY (same seed).  
**Artifacts:** `.tmp/device_smoke_deep_audit_consult_fable_seed.md`, `_opus_seed.md`, `_opus_response.md`  
**Skill saved:** `.cursor/skills/bug-audit/SKILL.md`  
**Code changes:** none

## Operator experience (after fixes — not implemented)

You tap Done on the watch, the phone reflects the same set and the correct next exercise within a second whether or not the app is open, rest fires between exercises exactly as it does in-app, you never get asked to confirm a Done you already made — and “how my signals converge” is a real trend embedded in Insights, not an empty standalone page.

## Defect register

| ID | Sev | Symptom | Verdict | Root cause | Best-path fix |
|----|-----|---------|---------|------------|---------------|
| **D1** | CRITICAL | Wear Done/Next only lands when phone opened; then catches up alone | CONFIRMED | Notification-action channel + unreliable background delivery; rest UI deferred until `TrainingSessionView` mounts | Delivery guarantee (foreground/headless) that persists via `applySetCompletion` at OS receipt; app reads DB on mount |
| **D2** | HIGH | After jump, notif shows wrong (session-order) exercise | CONFIRMED | `scheduleGuidedTrainingAfterSetPersist` → `buildNotificationWorkChain(items)` **no cursor**; action path *is* cursor-aware | Pass `{ startExerciseIndex }` everywhere; cursor = sole “what’s next” |
| **D3** | HIGH | Rest missing on watch sometimes | CONFIRMED | `computeRestSecondsAfterCompletingSet` omits `hasNextExercise`; phone passes it | Thread options through canonical rest helper (parity) |
| **D4** | MEDIUM | Second Done / confirm overlay | CONFIRMED | `SetFocusOverlay` re-offers Done on deep-link / NEXT_SET | Overlay = status when set already performed; Done only if pending |
| **D5** | MEDIUM | Signal graph empty / useless dedicated page | CONFIRMED | Ledger writes **today only**, no backfill; graph ≠ domain history | Backfill from mood/sleep/training → embed in Insights → retire drawer |
| **D6** | LOW–MED | Padding still wrong | CONFIRMED | Parent `reclaimSectionSpacing` 16 + AppCard default 16 = 32; Analytics over-zeroed | Container owns gap; cards `marginBottom={0}`; codify contract |

## Fixed workflow (guided) — target

1. Watch Done → OS delivers action → durable `applySetCompletion` (even if RN was cold).  
2. After-persist schedule uses **same cursor** as action targeting → Wear tile = jumped exercise.  
3. Rest seconds identical to phone (including between-exercise).  
4. Opening phone shows rest/status — **no second Done**.  
5. Insights surfaces show multi-day signal trend from backfilled ledger; no orphan empty drawer.

## Suggested units (only if Human says fix)

1. U1 — D2+D3 cursor + rest parity  
2. U2 — D4 overlay status-not-confirm  
3. U3 — D1 Wear delivery guarantee  
4. U4 — D5 backfill + embed + retire page  
5. U5 — D6 spacing contract  

## Product locks (Human 2026-07-20 evening)

**D5 Signal chart (locked):**
- NOT embedded inside Insight cards.
- Dedicated combined chart on **Dashboard only**, placed **under** the insights block.
- Visual: multi-metric convergence (line / spark / line+bar hybrid) — trendy, vibey, interactive feel, intentional motion; must fit Reclaim theme.
- **Always backfill** ledger from mood, sleep, training, and any other usable metrics before charting.
- Retire standalone Signal graph drawer page (chart lives on Home).

**D1 foreground “session active” notification:** explained to Human — awaiting explicit approve/reject before U3.
