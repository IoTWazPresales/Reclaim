# Dashboard structure change — follow-ups (March 2026)

After restructuring Home into **two rows of state tiles** (prediction + sleep, mood + training), then **insight → primary action → today plan**, the items below track deferrals and later polish.

## Done in this pass

- **Mood**: full `InformationalCard` removed; **tile** opens a **modal** with the same quick 1–5 check-in, “View mood details,” and crisis link.
- **Training**: **tile** copies session state; tap → Training. Primary action **meta** references the Training tile when workout is featured (deduped copy).
- **Sleep**: **last night / sync** on the **sleep tile** + **sleep snapshot modal** + **Sleep** screen. **Empty state** now distinguishes **no sleep-capable integration connected** vs **connected but no night in Reclaim yet** (via `getAllIntegrationStatuses`).
- **Order**: tiles → `DashboardInsight` → `DashboardPrimaryAction` → `DashboardToday` → mindfulness hint (if any) → recovery → progress → streaks.
- **Telemetry**: mood check-in from the home tile modal includes `uiSurface: 'home_tile_modal'` on `mood_logged` events.
- **`DashboardSleep` / `DashboardExercise`**: removed from Home earlier; **no remaining components** by those names in `app/src` (verified).

## Follow-up systems / polish (optional)

1. **Tile aesthetics** — `HomeDashboardTile.tsx`: optional Skia accents, haptics on tile press.
2. **Recovery module** — Candidate for a **third tile row** or compact tile later; still a full card for now.
3. **Insight feedback DB scope** — If product wants parity with old card-level scopes, add a migration + pass scope from mood modal (telemetry covers basic funnel today).

---

*Last updated April 2026 — aligned with Phase 6 dashboard slice.*
