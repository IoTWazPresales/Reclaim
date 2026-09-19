import { describe, expect, it } from 'vitest';
import {
  PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES,
  PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES,
  PERSONAL_DATA_USER_ID_DELETE_TABLES,
} from '@/lib/personalDataTables';

describe('account-delete cloud table coverage (N-0014)', () => {
  it('deletes mood_checkins and training sessions; items cascade from sessions', () => {
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('mood_checkins');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_sessions');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_program_instances');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).toContain('training_profiles');
    expect(PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES).toContain('training_session_items');
    expect(PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES).toContain('training_set_logs');
  });

  it('records training_events as client-undeletable under repo RLS', () => {
    expect(PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES).toContain('training_events');
    expect(PERSONAL_DATA_USER_ID_DELETE_TABLES).not.toContain('training_events');
  });

  it('deletes sessions before program instances and profiles', () => {
    const tables = [...PERSONAL_DATA_USER_ID_DELETE_TABLES];
    expect(tables.indexOf('training_sessions')).toBeLessThan(tables.indexOf('training_program_instances'));
    expect(tables.indexOf('training_program_days')).toBeLessThan(tables.indexOf('training_program_instances'));
    expect(tables.indexOf('training_program_instances')).toBeLessThan(tables.indexOf('training_profiles'));
  });
});
