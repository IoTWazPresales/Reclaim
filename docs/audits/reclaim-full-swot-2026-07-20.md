# Reclaim full SWOT + risk audit — 2026-07-20 (read-only)

**Branch tip:** `a99d09c` / `59b5f77` feature ship on `fix/training-confident-ux`  
**Method:** Device-smoke defect register + Cursor code sweep + Opus 4.8 CONSULT (primary CLI hung with empty stdout after ~10m — second-opinion pass may append). Explore agent findings merged when available.  
**Scope:** Architecture, code, UI — not a line-by-line of every file (impossible in one pass); covers every major product surface and SSOT.

---

## Operator experience after tonight’s fixes (target)

Watch Done updates phone work without opening the app (session-active sticky helps delivery); notification focus follows jump cursor; between-exercise rest matches phone; no second Done confirm on Next-set; Home shows a real multi-metric signal chart under insights fed by backfilled history; spacing no longer double-stacks on key screens.

---

## SWOT

### Strengths
- **Training SSOT discipline:** `applySetCompletion` + `sessionWorkAuthority` + dumb notification triggers (fire-time DB derivation) — rare clarity for RN fitness apps.
- **Close authority:** two-phase `closeTrainingSession` / pending-close gate addresses blank-spinner class of bugs.
- **Notifications architecture:** `setIntent` + `reconcileNotifications` single authority; guided actions idempotent.
- **Meds governance:** exact-name catalogue, QA gate (`med-catalog-qa`), educational copy honesty improved.
- **Insights pipeline:** typed actions, verify-lite, ledger spine for explanations.
- **Play honesty direction:** Integrations copy for Steps / active kcal; OQ-1 draft; promotional run lock.

### Weaknesses
- **Wear is still notification-actions, not Health Services** — delivery remains OS-dependent even with sticky session-active.
- **Dashboard.tsx / TrainingSessionView.tsx size** — orchestration mega-files raise regression cost.
- **Spacing contract** documented but not lint-enforced — residual double-gaps likely on unvisited screens (Onboarding E-02).
- **Signal chart v1** — 3 series, simple SVG; `training.weeklySessionCount` backfill uses per-day session count (naming mismatch vs weekly aggregate).
- **EAS archive ~394MB** — slow builds; `.easignore` debt.
- **Automated device tests absent** — Wear/HC paths rely on headless sims + manual smoke.

### Opportunities
- Codify spacing ESLint / codemod; shrink Dashboard via section components.
- True Wear companion (parked UW) after notification path is proven on device.
- Signal chart depth: more factors, brush/scrub interaction, link “why” explanations.
- Play resubmit with aligned Console forms (P-01–P-05).
- Reduce APK/upload via easignore of docs/audits/evidence.

### Threats
- Play HC declaration mismatch (steps/kcal) if Console not updated.
- Background delivery still fails on some OEM Android skins → user trust hit.
- Insight / ledger dual SSOT confusion if chart and explanations diverge.
- Mega-file edits without dual-path audit → guided regressions.
- Promotional run / monetization timing mistakes.

---

## Best-practice scorecard

| Area | Score | Notes |
|------|-------|-------|
| Training SSOT | **Pass** | Cursor + performed.sets authority; after-persist now cursor-aware |
| Notification scheduling | **Pass** | Intent+reconcile only; session-active via same path |
| Wear delivery guarantee | **Partial** | Sticky helps; not a true FGS; still wake-dependent on some devices |
| Insights + ledger | **Partial** | Backfill + Home chart shipped; weekly factor naming / sparse days |
| Meds education | **Pass** | Mechanism + boundary; catalogue governance |
| UI spacing | **Partial** | Hotspots fixed; no automated guard |
| Offline/sync | **Partial** | Offline queue exists; Wear offline edge cases |
| Play/HC honesty | **Partial** | In-app copy + draft; Human Console paste still open |
| Test strategy | **Partial** | Strong unit/sim; no device automation |
| Modular UI | **Fail/Partial** | Home/Training session views too large |

---

## Top residual risks / future bugs

1. **OEM kills background notification actions** despite sticky — Wear Done still queues until open.
2. **`training.weeklySessionCount` backfill = sessions that day** — chart label “Training” may mislead vs weekly rollup.
3. **Idempotency mark-before-persist** — failed mid-flight Done won’t retry same response key.
4. **Rest cursor vs pending AsyncStorage race** if UI mounts before DB write settles.
5. **Sticky tile not dismissed** if close path skips `clearTrainingIntentsForSession`.
6. **Analytics/Onboarding residual spacing** (E-02).
7. **Exercise stills bucket empty** — Layer 2 falls back to sticks forever until upload.
8. **Signal chart animation** strokeDashoffset fixed 400 may clip long paths.
9. **Insights disabled** → no backfill/write → empty Home chart despite history (if refresh gated).
10. **Jump without pending on target** fallback may still feel wrong if earlier exercises incomplete.
11. **Play Console forms stale** vs APK permissions → rejection.
12. **394MB EAS upload** → timeouts / wrong artifacts if evidence dirs not ignored.
13. **Meds exact-match misses** brand variants users type.
14. **Dashboard re-render cost** with new chart + insights + arc.
15. **Stale session / ghost sessions** >12h clearing intents while user still “in” session.

---

## Play readiness

| Ready now (code) | Needs Human / device |
|------------------|----------------------|
| HC feature paths + Integrations honesty copy | Paste Console OQ-1 from draft |
| Guided close + Wear improvements (pending smoke) | New EAS preview install + Wear Done night smoke |
| Promotional run ON | Confirm listing screenshots don’t overclaim |

---

## Next 3 engineering investments (best path)

1. **Device-prove Wear delivery** on tonight’s EAS — if OEM still flakes, escalate to real Android foreground service module (not sticky-only).
2. **Lint/enforce spacing contract** + finish Onboarding E-02.
3. **Harden signal semantics** (weekly factor true rollup; more metrics; chart ↔ explanation parity) + `.easignore` slim.

---

## Opus 4.8 second opinion (2026-07-20)

CLI full SWOT hung (empty stdout); short second-opinion CONSULT READY on this draft:

- **#1 OEM Wear delivery** is product-defining, not residual — sticky is a band-aid; pre-scope real FGS.
- **Idempotency mark-before-persist** underweighted — silent set loss; raise severity.
- **weeklySessionCount mismatch** real but cosmetic-tier.
- **Ghost sticky + ghost sessions** same teardown authority gap — consolidate `endSession`.
- **Missing:** mega-file velocity threat; no device automation compounding; training-loop error observability.
- **One investment:** device-prove Wear tonight; assume aggressive-doze flakes and scope FGS now. Spacing/signal polish are after.

---

## Tonight’s validation

- Unit + headless sims: guidedWearDelivery, cursor after-persist, rest parity, overlay route, backfill core — green.
- Typecheck: green at ship.
- Device: **not run** (await EAS).
