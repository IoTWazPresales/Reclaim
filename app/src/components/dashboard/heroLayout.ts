/**
 * Hero Layout Specification
 * ========================
 * Single source of truth for LifecycleHero diagram coordinates.
 * All layout values derived from this file.
 *
 * COORDINATE SPACES:
 * ------------------
 * 1. PATH SPACE: Raw SVG path coordinates (from brainPath.ts)
 *    - Path Y range ~133 to ~266 (Inkscape default Y-down)
 *
 * 2. VIEWBOX SPACE: After layer transform translate(LAYER_TX, LAYER_TY)
 *    - viewBox: 0 0 VIEW_WIDTH VIEW_HEIGHT
 *    - Layer transform shifts path UP so top of brain ≈ -1.5, bottom ≈ 132.5
 *    - Content extends ABOVE viewBox origin (y < 0) → causes top clipping
 *
 * 3. BRAIN CANVAS SPACE: size × size, origin top-left
 *    - We scale path to fit width, then must offset Y to account for
 *      content extending above viewBox
 *
 * 4. DIAGRAM SPACE: Diagram container, origin top-left
 *    - cx, cy = center of diagram
 *    - All elements (rings, brain, nodes, connectors) use (cx, cy)
 */

// --- Source: assets/brain.svg ---
export const VIEW_WIDTH = 167.65688;
export const VIEW_HEIGHT = 132.82082;
export const LAYER_TX = -9.5642504;
export const LAYER_TY = -133.30026;

/**
 * Brain content vertical extent in viewBox space (after layer transform).
 * Path Y: ~133 to ~266 → after LAYER_TY (-133.30): ~-0.3 to ~132.7
 * Top of brain is ABOVE viewBox origin (y < 0). This offset compensates.
 *
 * To verify/derive: Open assets/brain.svg in Inkscape, apply layer transform
 * to the path, inspect the bounding box minY. Or add a debug crosshair in
 * BrainVisualization and tweak until centered.
 */
export const BRAIN_VIEWBOX_TOP = -1.5;  // content starts above 0
export const BRAIN_VIEWBOX_BOTTOM = 132.5;
export const BRAIN_VIEWBOX_HEIGHT = BRAIN_VIEWBOX_BOTTOM - BRAIN_VIEWBOX_TOP;

/**
 * Compute offsetY to center brain content in canvas.
 * Content spans BRAIN_VIEWBOX_TOP to BRAIN_VIEWBOX_BOTTOM (e.g., -1.5 to 132.5).
 * We center this actual content height, then shift down so the top (negative y)
 * is visible instead of clipped.
 */
export function getBrainCanvasOffsetY(size: number): number {
  const scale = size / VIEW_WIDTH;
  const contentHeight = BRAIN_VIEWBOX_HEIGHT * scale;
  // Center the content, then shift down to account for content starting above y=0
  return (size - contentHeight) / 2 - BRAIN_VIEWBOX_TOP * scale;
}
