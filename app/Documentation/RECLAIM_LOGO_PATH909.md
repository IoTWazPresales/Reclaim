# Reclaim logo and path909.svg

## Current state

**ReclaimLogo** is back to the **hand-coded** version: a Bezier “R” (outer + counter hole), 3 elliptical rings, and 3 orbs that rotate on the rings. This matches `splash.png` and looks correct.

The **path909.svg**-based version was reverted because it produced:

- One very large shape and a second, much smaller shape (path909 is one path with many subpaths at different scales)
- Logo too big and strokes too thick
- Logo not centred

So the trace in path909 is not a single, clean “R”: it’s a complex multi-part path that doesn’t map cleanly to our canvas and sizing.

---

## What you can do next

### Option A — Keep the hand-coded logo (recommended for now)

Use the current ReclaimLogo as-is. It already matches splash and the orbs animate. No path909 needed.

---

### Option B — Get a clean “R” path and use that

If you want the logo to come from vector art instead of hand-coded Beziers:

1. **Redraw the R (and only the R)** in a vector tool so you get a **single, clean path**:
   - In **Illustrator**: draw the R, then Object → Path → Simplify if needed; copy the path `d` from the SVG.
   - In **Inkscape**: trace or draw the R, then Path → Simplify; save as “Plain SVG” and take the path `d`.
   - Or ask ChatGPT / another tool to **output a minimal SVG that is only one path for the letter R** (e.g. “SVG path for a bold capital R, single path, viewBox about 0 0 50 52”), then use that path string.

2. **Use that path in the app**:
   - Put the single-path `d` in something like `app/src/lib/reclaimLogoPaths.ts` (e.g. a new export `R_PATH_D` with a simple viewBox such as `0 0 50 52`).
   - In ReclaimLogo, build the path with `Skia.Path.MakeFromSVGString(R_PATH_D)`, then scale and centre it to match the current R size (e.g. the same bounding box as the hand-coded R). Keep rings and orbs as they are.

That way you get one shape, correct size and centring, and thin strokes if you use stroke width in canvas space.

---

### Option C — Fix path909 (harder)

path909 looks like a full-page trace (lots of detail, multiple “figures”). To make it work you’d need to:

- Split the path into subpaths (by `M`/`m` moves), then choose only the subpath that corresponds to the main R (e.g. by area or position).
- Use that subpath’s bounding box to scale and centre (not the full viewBox).
- Tune stroke width (and maybe ignore or hide other subpaths).

That’s more work and fragile; Option B is simpler if you want an SVG-driven R.

---

## Summary

- **Current:** Hand-coded R + rings + orbs. Use this unless you specifically want an SVG-based R.
- **Easiest path to an SVG R:** Get a **new, single-path SVG for the R only** (redraw or generated), then plug that path into the app and scale/centre it; leave path909 out of the logo.
