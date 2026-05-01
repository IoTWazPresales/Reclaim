export type MeditationType =
  | "progressive_muscle_relaxation"   // tense & release (your first)
  | "body_scan"                       // scanner over body (your second)
  | "safe_ring_visualization"         // ring/safe space (your third)
  | "box_breathing"
  | "four_7_8_breathing"
  | "mindful_breathing"
  | "loving_kindness"
  | "grounding_54321";

export type MeditationScriptStep = { title: string; instruction: string; seconds?: number };

export type MeditationScript = {
  id: MeditationType;
  name: string;
  estMinutes: number;
  steps: MeditationScriptStep[];
};

export const MEDITATION_CATALOG: MeditationScript[] = [
  {
    id: "progressive_muscle_relaxation",
    name: "Progressive Muscle Relaxation",
    estMinutes: 10,
    steps: [
      { title: "Intro", instruction: "Comfortable position; we’ll tense then release each muscle group." },
      { title: "Breath", instruction: "Inhale nose, exhale mouth, slow and even for 4 cycles.", seconds: 30 },
      { title: "Feet", instruction: "Tense toes/feet 5s, then fully release; feel contrast.", seconds: 20 },
      { title: "Calves", instruction: "Tense calves 5s, then release.", seconds: 20 },
      { title: "Thighs/Glutes", instruction: "Tense, hold, release; allow heaviness.", seconds: 25 },
      { title: "Hands/Forearms", instruction: "Clench, hold, release.", seconds: 20 },
      { title: "Upper Arms/Shoulders", instruction: "Lift shoulders to ears, hold, drop.", seconds: 20 },
      { title: "Face/Jaw", instruction: "Gently tense face/jaw, then release; soften eyes and tongue.", seconds: 20 },
      { title: "Chest/Belly", instruction: "Deep breath, brief hold, exhale and soften.", seconds: 25 },
      { title: "Wrap-up", instruction: "Whole-body scan; breathe out leftover tension.", seconds: 30 },
    ],
  },
  {
    id: "body_scan",
    name: "Body Scan",
    estMinutes: 8,
    steps: [
      { title: "Setup", instruction: "Sit/lie comfortably. Attend to breath for a few cycles." },
      { title: "Crown → Eyes", instruction: "Imagine a gentle scanner from crown to eyes. Just notice sensations.", seconds: 60 },
      { title: "Jaw → Neck", instruction: "Jaw, tongue, throat, neck. Breathe into tension; soften on exhale.", seconds: 60 },
      { title: "Shoulders → Fingers", instruction: "Shoulders, arms, wrists, fingers.", seconds: 75 },
      { title: "Chest → Belly", instruction: "Rise/fall of breath. Let belly be soft.", seconds: 60 },
      { title: "Hips → Knees", instruction: "Hips, thighs, knees. Label: pressure/warmth/pulsing.", seconds: 60 },
      { title: "Calves → Toes", instruction: "Calves, ankles, feet, toes. Widen to whole body.", seconds: 60 },
      { title: "Close", instruction: "Rest in whole-body awareness for a few breaths.", seconds: 30 },
    ],
  },
  {
    id: "safe_ring_visualization",
    name: "Safe Ring Visualization",
    estMinutes: 7,
    steps: [
      { title: "Breathing", instruction: "Slow breathing; on exhale imagine releasing stress/‘negative energy’." },
      { title: "Form the Ring", instruction: "Visualize a glowing ring before you: your safe-space portal.", seconds: 30 },
      { title: "Step Through", instruction: "Enter the ring into your personalized safe place (sights/sounds/smells).", seconds: 90 },
      { title: "Anchor", instruction: "Choose one detail (color/texture/symbol) as an anchor to recall anytime.", seconds: 60 },
      { title: "Return", instruction: "Step back through the ring. Know you can re-enter via your anchor.", seconds: 45 },
    ],
  },
  { id: "box_breathing", name: "Box Breathing (4-4-4-4)", estMinutes: 4, steps: [
    { title: "Pattern", instruction: "Inhale 4, hold 4, exhale 4, hold 4. Repeat 4–6 cycles.", seconds: 240 },
  ]},
  { id: "four_7_8_breathing", name: "4–7–8 Breathing", estMinutes: 3, steps: [
    { title: "Pattern", instruction: "Inhale 4, hold 7, exhale 8. Repeat gently for 4 cycles.", seconds: 180 },
  ]},
  { id: "mindful_breathing", name: "Mindful Breathing", estMinutes: 5, steps: [
    { title: "Attention", instruction: "Attend to natural breath; when mind wanders, label ‘thinking’ and return.", seconds: 300 },
  ]},
  { id: "loving_kindness", name: "Loving-Kindness", estMinutes: 6, steps: [
    { title: "Phrases", instruction: "Silently repeat: May I be safe/healthy/at ease. Extend to others.", seconds: 360 },
  ]},
  { id: "grounding_54321", name: "Grounding 5-4-3-2-1", estMinutes: 4, steps: [
    { title: "Senses", instruction: "Name 5 see, 4 feel, 3 hear, 2 smell, 1 taste.", seconds: 240 },
  ]},
];

export function getMeditationById(id: MeditationType) {
  return MEDITATION_CATALOG.find(m => m.id === id);
}
