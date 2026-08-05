/**
 * In-app Health Connect data-use map — keep-and-justify for Play Minimum Scope.
 * Must stay aligned with app/plugins/withHealthConnectPermissions.js and listing/Console drafts.
 */

export type HealthConnectDataUseRow = {
  /** Short type label shown to users */
  type: string;
  /** Feature + user benefit (honest, narrow) */
  purpose: string;
};

/** Rows for Integrations / Data & Privacy “Health Connect data we use”. */
export const HEALTH_CONNECT_DATA_USE_ROWS: HealthConnectDataUseRow[] = [
  {
    type: 'Sleep',
    purpose: 'Import sleep sessions and stages for your Sleep screen and daily signal.',
  },
  {
    type: 'Heart rate',
    purpose:
      'Overnight sleep heart-rate context on Sleep, and an optional elevated-HR mindfulness breathing nudge.',
  },
  {
    type: 'Blood oxygen (SpO₂)',
    purpose: 'Overnight oxygen readings shown with your sleep recovery signals when available.',
  },
  {
    type: 'Respiratory rate',
    purpose: 'Overnight breathing rate shown with your sleep recovery signals when available.',
  },
  {
    type: 'Body / skin temperature',
    purpose: 'Overnight temperature shown with your sleep recovery signals when available.',
  },
  {
    type: 'Steps',
    purpose:
      'Only to confirm you look inactive before an optional elevated-HR breathing nudge — not a step counter or step goals.',
  },
  {
    type: 'Active calories',
    purpose:
      'Read-back of active energy overlapping a training session you finished in Reclaim — not a live calorie coach.',
  },
  {
    type: 'Exercise sessions (write)',
    purpose: 'Write a completed guided training workout to Health Connect as an exercise session.',
  },
];

/** One-line intro above the map. */
export const HEALTH_CONNECT_DATA_USE_INTRO =
  'When you connect Health Connect, Reclaim only uses these types for the features below. We do not request resting heart rate, HRV, or total calories from Health Connect.';
