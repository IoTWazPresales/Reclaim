# Dashboard structure change — follow-ups (March 2026)

After restructuring Home into **two rows of state tiles** (prediction + sleep, mood + training), then **insight → primary action → today plan**, the items below are intentional deferrals or future work.

## Done in this pass

- **Mood**: full `InformationalCard` removed; **tile** opens a **modal** with the same quick 1–5 check-in, “View mood details,” and crisis link.
- **Training**: `DashboardExercise` card removed; **tile** copies session state (in progress / done / planned / rest / setup) and **tap → Training** (same as before via `navigateToTraining`).
- **Sleep**: `DashboardSleep` card removed; **last night / sync** stays on the **sleep tile** + **sleep snapshot modal** + **Sleep** screen for full detail, hypnogram, efficiency, and setup.
- **Order**: tiles → `DashboardInsight` → `DashboardPrimaryAction` → `DashboardToday` → mindfulness hint (if any) → recovery → progress → streaks.

## Follow-up systems / polish (not done here)

1. **Sleep empty / provider context** — `connectedSleepProvidersQ` was only used by the removed `DashboardSleep` card. If the **sleep tile** or modal should distinguish “no provider” vs “provider, no data,” reintroduce that signal (lightweight query or derive from existing sync/integrations state) without duplicating a second full sleep card.
2. **Tile aesthetics** — `HomeDashboardTile.tsx` uses per-accent **matte surfaces**, **full-bleed bottom wash** (no rounded inner “chart box”), **hairline edge** read, chevron in **label row** with accent tint. `DashboardGreeting` is a slimmer matte strip so tiles stay focal. Optional: Skia accents, haptics on tile press.
3. **`DashboardSleep` / `DashboardExercise` components** — Still in the repo **unused** on Home; delete or reuse on another surface when stable.
4. **Feedback / telemetry** — Previous `feedbackScope` keys `dashboard-mood`, `dashboard-exercise`, `dashboard-sleep` no longer mount on Home; mood modal has no `InformationalCard` feedback scope yet. Add scoped feedback if product wants parity.
5. **Recovery module** — Candidate for a **third tile row** or compact tile later; still a full card for now.
6. **Primary action vs tiles** — When training is the top priority, `DashboardPrimaryAction` and the training tile may both highlight training; consider deduplicating copy in a later pass.
