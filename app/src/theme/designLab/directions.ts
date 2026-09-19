/**
 * __DEV__ Design Lab token sets. Three distinct product directions, not recolours.
 * Not wired into production theme. Stage A proposal only.
 */

export type DesignLabId = 'forge' | 'hearth' | 'signal';

export type DesignLabTokens = {
  id: DesignLabId;
  name: string;
  serves: string;
  why: string;
  iaHome: string;
  colour: {
    page: string;
    surface: string;
    surfaceRaised: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    onAccent: string;
    danger: string;
    domain: { mood: string; sleep: string; training: string; meds: string; insights: string };
  };
  type: {
    displaySize: number;
    displayWeight: '500' | '600' | '700' | '800';
    titleSize: number;
    bodySize: number;
    metaSize: number;
    letterSpacing: number;
    lineHeightMult: number;
  };
  space: { screen: number; section: number; cardPad: number };
  radius: { card: number; button: number; chip: number };
  elevation: number;
  motionMs: number;
};

export const DESIGN_LAB_DIRECTIONS: Record<DesignLabId, DesignLabTokens> = {
  forge: {
    id: 'forge',
    name: 'Forge',
    serves: 'People who need the next set more than another chart — rebuilding strength after injury, layoff, or burnout, with a coach-in-the-pocket session.',
    why: 'Makes guided training the product. Dense, high-contrast, sharp geometry. Home is “start today’s work”, not a dashboard collage.',
    iaHome: 'Home = today’s session + Start guided. Insights and meds are tools behind the session.',
    colour: {
      page: '#0B0C0E',
      surface: '#16181C',
      surfaceRaised: '#1E2126',
      border: '#2A2E35',
      text: '#F4F1EA',
      textMuted: '#9AA0A6',
      accent: '#FF6A3D',
      onAccent: '#140800',
      danger: '#FF4D4D',
      domain: {
        mood: '#FFB020',
        sleep: '#5B8CFF',
        training: '#FF6A3D',
        meds: '#C4A574',
        insights: '#E8E4DC',
      },
    },
    type: {
      displaySize: 32,
      displayWeight: '800',
      titleSize: 18,
      bodySize: 15,
      metaSize: 12,
      letterSpacing: 0.4,
      lineHeightMult: 1.25,
    },
    space: { screen: 12, section: 12, cardPad: 14 },
    radius: { card: 4, button: 4, chip: 4 },
    elevation: 8,
    motionMs: 120,
  },
  hearth: {
    id: 'hearth',
    name: 'Hearth',
    serves: 'People rebuilding a life, not a PR — injury, illness, addiction, burnout — who need one honest “why this, today” and room to rest.',
    why: 'Editorial recovery journal. Warm surfaces, large type, low elevation. Cross-domain readiness is a story, not a scoreboard.',
    iaHome: 'Home = today’s rebuilding narrative. Training is a chapter. Insights answer why. Meds stay educational.',
    colour: {
      page: '#14110E',
      surface: '#1E1A16',
      surfaceRaised: '#2A241E',
      border: '#3A322A',
      text: '#F3EDE4',
      textMuted: '#B5A894',
      accent: '#C4A574',
      onAccent: '#1A140E',
      danger: '#D9786A',
      domain: {
        mood: '#D4A0A0',
        sleep: '#7BA3A8',
        training: '#C4A574',
        meds: '#8FBEB0',
        insights: '#D4C4A8',
      },
    },
    type: {
      displaySize: 28,
      displayWeight: '600',
      titleSize: 20,
      bodySize: 17,
      metaSize: 13,
      letterSpacing: 0,
      lineHeightMult: 1.45,
    },
    space: { screen: 20, section: 20, cardPad: 18 },
    radius: { card: 20, button: 999, chip: 999 },
    elevation: 2,
    motionMs: 280,
  },
  signal: {
    id: 'signal',
    name: 'Signal',
    serves: 'People who already track and want an instrument panel — clinicians-adjacent self-trackers, n-of-1 experimenters, data-literate rebuilders.',
    why: 'Clinical-adjacent density. Hairline geometry, cyan instruments, tabular type. Home is a signal board; training is a protocol.',
    iaHome: 'Home = ranked signals. Training is a protocol card. Insights is the primary tab. Meds are series, not stories.',
    colour: {
      page: '#07090C',
      surface: '#0E1419',
      surfaceRaised: '#121A21',
      border: '#1E2A33',
      text: '#D7E6EE',
      textMuted: '#7A90A0',
      accent: '#3DDCFF',
      onAccent: '#041016',
      danger: '#FF5C7A',
      domain: {
        mood: '#FFB4C8',
        sleep: '#7AB8FF',
        training: '#3DDCFF',
        meds: '#9DFFCE',
        insights: '#E6F4FF',
      },
    },
    type: {
      displaySize: 22,
      displayWeight: '500',
      titleSize: 15,
      bodySize: 13,
      metaSize: 11,
      letterSpacing: 0.8,
      lineHeightMult: 1.3,
    },
    space: { screen: 8, section: 8, cardPad: 10 },
    radius: { card: 2, button: 2, chip: 2 },
    elevation: 0,
    motionMs: 0,
  },
};

export const DESIGN_LAB_RECOMMENDATION: DesignLabId = 'hearth';

export const DESIGN_LAB_RECOMMENDATION_REASON =
  'Hearth is the only direction that makes Reclaim’s differentiator (rebuilding, mechanistic why, cross-domain readiness) the home experience. Forge would win serious lifters but collides with Fitbod/Hevy. Signal would win trackers but collides with Bearable and Welltory. Hearth keeps guided training and educational meds, but as chapters in a recovery journal rather than a gym logger or a symptom spreadsheet.';
