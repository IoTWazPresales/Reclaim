import { describe, it, expect } from 'vitest';
import { mapUiConstraintIdsToEngineInjuries, normalizeEquipmentIds } from '../setupMappings';

describe('normalizeEquipmentIds', () => {
  it('maps legacy leg_press shorthand to catalog leg_press_machine', () => {
    expect(normalizeEquipmentIds(['barbell', 'leg_press'])).toEqual(['barbell', 'leg_press_machine']);
  });

  it('"Select all" commercial gym set passes through catalog tokens needed for compound defaults', () => {
    const fullGym = [
      'barbell',
      'rack',
      'bench',
      'dumbbells',
      'cable_machine',
      'pull_up_bar',
      'floor',
      'kettlebells',
      'leg_press_machine',
      'hack_squat_machine',
      't_bar_row_machine',
      'chest_press_machine',
      'smith_machine',
      'dip_station',
      'trap_bar',
      'ez_bar',
      'landmine',
      'cardio',
    ];
    expect(normalizeEquipmentIds(fullGym)).toEqual(fullGym);
  });
});

describe('mapUiConstraintIdsToEngineInjuries', () => {
  it('maps UI chips to catalog injury tokens', () => {
    expect(mapUiConstraintIdsToEngineInjuries(['knee_pain', 'back_sensitive'])).toEqual([
      'knee_injury',
      'lower_back_injury',
    ]);
  });

  it('dedupes and expands shoulder', () => {
    const out = mapUiConstraintIdsToEngineInjuries(['shoulder_issues']);
    expect(out).toContain('shoulder_impingement');
    expect(out).toContain('rotator_cuff_injury');
    expect(out.length).toBe(2);
  });
});
